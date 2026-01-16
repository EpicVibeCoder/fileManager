const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const sendResponse = require('../utils/response');
const passport = require('passport');
const { sendOtpEmail } = require('../services/emailService');

const signup = async (req, res) => {
      try {
            const { email, password, confirmPassword, agreementAccepted } = req.body;

            if (!agreementAccepted) {
                  return sendResponse(res, 400, false, 'You must accept the agreement to sign up', null, { field: 'agreementAccepted' });
            }
            if (password !== confirmPassword) {
                  return sendResponse(res, 400, false, 'Passwords do not match', null, { field: 'confirmPassword' });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                  return sendResponse(res, 409, false, 'User with this email already exists', null, { field: 'email' });
            }

            const user = new User({ email, password, agreementAccepted });
            await user.save();

            const accessToken = generateToken({ id: user._id, email: user.email });
            const refreshToken = generateRefreshToken();

            // Save refresh token
            await new RefreshToken({
                  user: user._id,
                  token: refreshToken.token,
                  expires: refreshToken.expires,
                  createdByIp: req.ip,
            }).save();

            return sendResponse(res, 201, true, 'User registered successfully', {
                  user: user.toJSON(),
                  accessToken,
                  refreshToken: refreshToken.token,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error during signup', null, { details: error.message });
      }
};

const login = async (req, res) => {
      try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });
            if (!user || !user.password) {
                  return sendResponse(res, 401, false, 'Invalid email or password', null);
            }

            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                  return sendResponse(res, 401, false, 'Invalid email or password', null);
            }

            const accessToken = generateToken({ id: user._id, email: user.email });
            const refreshToken = generateRefreshToken();

            await new RefreshToken({
                  user: user._id,
                  token: refreshToken.token,
                  expires: refreshToken.expires,
                  createdByIp: req.ip,
            }).save();

            return sendResponse(res, 200, true, 'Login successful', {
                  user: user.toJSON(),
                  accessToken,
                  refreshToken: refreshToken.token,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error during login', null, { details: error.message });
      }
};

const refreshToken = async (req, res) => {
      try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                  return sendResponse(res, 400, false, 'Token is required');
            }

            const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

            if (!tokenDoc) {
                  return sendResponse(res, 400, false, 'Invalid token');
            }

            if (tokenDoc.revoked) {
                  await RefreshToken.updateMany({ user: tokenDoc.user }, { revoked: Date.now(), revokedByIp: req.ip });
                  return sendResponse(res, 400, false, 'Invalid token (reuse detected)');
            }

            if (tokenDoc.isExpired) {
                  return sendResponse(res, 400, false, 'Token expired');
            }

            const user = await User.findById(tokenDoc.user);
            if (!user) {
                  return sendResponse(res, 404, false, 'User not found');
            }

            const newAccessToken = generateToken({ id: user._id, email: user.email });
            const newRefreshToken = generateRefreshToken();

            tokenDoc.revoked = Date.now();
            tokenDoc.revokedByIp = req.ip;
            tokenDoc.replacedByToken = newRefreshToken.token;
            await tokenDoc.save();

            await new RefreshToken({
                  user: user._id,
                  token: newRefreshToken.token,
                  expires: newRefreshToken.expires,
                  createdByIp: req.ip,
            }).save();

            return sendResponse(res, 200, true, 'Token refreshed', {
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken.token,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error refreshing token', null, { details: error.message });
      }
};

const revokeToken = async (req, res) => {
      try {
            const { token } = req.body;
            if (!token) return sendResponse(res, 400, false, 'Token required');

            await RefreshToken.findOneAndUpdate({ token }, { revoked: Date.now(), revokedByIp: req.ip });
            return sendResponse(res, 200, true, 'Token revoked');
      } catch (err) {
            console.error('Error revoking token:', err);
            return sendResponse(res, 500, false, 'Error revoking token'); 
      }
};

const logout = async (req, res) => {
      try {
            const { refreshToken } = req.body;
            if (refreshToken) {
                  const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
                  if (tokenDoc) {
                        await RefreshToken.updateOne({ _id: tokenDoc._id }, { revoked: Date.now(), revokedByIp: req.ip });
                        await User.findByIdAndUpdate(tokenDoc.user, { lastLogoutAt: Date.now() });
                  }
            } else if (req.user) {
                  await User.findByIdAndUpdate(req.user._id, { lastLogoutAt: Date.now() });
            }
            return sendResponse(res, 200, true, 'Logout successful', null);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error during logout', null, { details: error.message });
      }
};

const editProfile = async (req, res) => {
      try {
            const { username } = req.body;
            const userId = req.user._id || req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                  return sendResponse(res, 404, false, 'User not found', null);
            }

            user.username = username;
            await user.save();

            return sendResponse(res, 200, true, 'Username updated successfully', {
                  user: user.toJSON(),
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error updating profile', null, { details: error.message });
      }
};

const changePassword = async (req, res) => {
      try {
            const { oldPassword, newPassword } = req.body;
            const userId = req.user._id || req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                  return sendResponse(res, 404, false, 'User not found', null);
            }

            if (!user.password) {
                  return sendResponse(res, 400, false, 'Password change not available for this account', null);
            }

            const isOldPasswordValid = await user.comparePassword(oldPassword);
            if (!isOldPasswordValid) {
                  return sendResponse(res, 401, false, 'Current password is incorrect', null);
            }

            user.password = newPassword;
            await user.save();

            return sendResponse(res, 200, true, 'Password changed successfully', null);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error changing password', null, { details: error.message });
      }
};

const forgotPassword = async (req, res) => {
      try {
            const { email } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                  return sendResponse(res, 200, true, 'If the email exists, an OTP has been sent to your email', null);
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const resetTokenExpiry = Date.now() + 10 * 60 * 1000;

            user.resetPasswordToken = otp;
            user.resetPasswordExpires = new Date(resetTokenExpiry);
            await user.save();

            try {
                  await sendOtpEmail(email, otp);

                  if (process.env.NODE_ENV === 'development') {
                        return sendResponse(res, 200, true, 'OTP sent to email', {
                              otp,
                              expiresIn: '10 minutes',
                        });
                  }

                  return sendResponse(res, 200, true, 'OTP has been sent to your email', null);
            } catch (emailError) {
                  console.error('Failed to send OTP email:', emailError);

                  if (process.env.NODE_ENV === 'development') {
                        return sendResponse(res, 200, true, 'OTP generated (email failed)', {
                              otp,
                              expiresIn: '10 minutes',
                              emailError: emailError.message,
                        });
                  }

                  return sendResponse(res, 200, true, 'If the email exists, an OTP has been sent to your email', null);
            }
      } catch (error) {
            return sendResponse(res, 500, false, 'Error processing password reset request', null, { details: error.message });
      }
};

const verifyOtp = async (req, res) => {
      try {
            const { email, otp } = req.body;

            const user = await User.findOne({
                  email,
                  resetPasswordToken: otp,
                  resetPasswordExpires: { $gt: Date.now() },
            });

            if (!user) {
                  return sendResponse(res, 400, false, 'Invalid or expired OTP', null);
            }

            const crypto = require('crypto');
            const resetToken = crypto.randomBytes(32).toString('hex');

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
            await user.save();

            return sendResponse(res, 200, true, 'OTP verified', {
                  resetToken,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error verifying OTP', null, { details: error.message });
      }
};

const resetPassword = async (req, res) => {
      try {
            const { token, newPassword } = req.body;

            const user = await User.findOne({
                  resetPasswordToken: token,
                  resetPasswordExpires: { $gt: Date.now() },
            });

            if (!user) {
                  return sendResponse(res, 400, false, 'Invalid or expired reset token', null);
            }

            if (!user.password && !user.googleId) {
                  return sendResponse(res, 400, false, 'Password reset not available for this account', null);
            }

            user.password = newPassword;
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            return sendResponse(res, 200, true, 'Password reset successfully', null);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error resetting password', null, { details: error.message });
      }
};



const googleAuth = passport.authenticate('google', {
      scope: ['profile', 'email'],
});

const googleCallback = async (req, res) => {
      try {
            const user = req.user;

            if (!user) {
                  return sendResponse(res, 401, false, 'Google authentication failed', null);
            }

            const accessToken = generateToken({ id: user._id, email: user.email });
            const refreshToken = generateRefreshToken();

            await new RefreshToken({
                  user: user._id,
                  token: refreshToken.token,
                  expires: refreshToken.expires,
                  createdByIp: req.ip,
            }).save();

            if (process.env.FRONTEND_URL) {
                  return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refreshToken=${refreshToken.token}`);
            }

            return sendResponse(res, 200, true, 'Google authentication successful', {
                  user: user.toJSON(),
                  accessToken,
                  refreshToken: refreshToken.token,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error during Google authentication', null, { details: error.message });
      }
};

module.exports = {
      signup,
      login,
      logout,
      refreshToken,
      editProfile,
      changePassword,
      forgotPassword,
      verifyOtp,
      resetPassword,
      googleAuth,
      googleCallback,
      revokeToken,
};
