const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const sendResponse = require('../utils/response');
const passport = require('passport');

// Helper to set refresh token in cookie (optional) or just return in body
const setTokenCookie = (res, token) => {
      // Phase requirements don't strictly specify cookies, so we'll return in body.
      // If we wanted cookies:
      // const cookieOptions = {
      //     httpOnly: true,
      //     expires: new Date(Date.now() + 7*24*60*60*1000)
      // };
      // res.cookie('refreshToken', token, cookieOptions);
};

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

            // Token Reuse Detection (Rotation Strategy)
            if (tokenDoc.revoked) {
                  // If a revoked token is used, it might be a theft. Revoke all descendant tokens.
                  // For now, simpler implementation: revoke all tokens for this user (force re-login).
                  // This is "family" revocation.
                  await RefreshToken.updateMany({ user: tokenDoc.user }, { revoked: Date.now(), revokedByIp: req.ip });
                  return sendResponse(res, 400, false, 'Invalid token (reuse detected)');
            }

            if (tokenDoc.isExpired) {
                  // Cleanup if needed, or rely on TTL
                  return sendResponse(res, 400, false, 'Token expired');
            }

            const user = await User.findById(tokenDoc.user);
            if (!user) {
                  return sendResponse(res, 404, false, 'User not found');
            }

            // Generate new pair
            const newAccessToken = generateToken({ id: user._id, email: user.email });
            const newRefreshToken = generateRefreshToken();

            // Rotate: Revoke old token, Replacing with new one
            tokenDoc.revoked = Date.now();
            tokenDoc.revokedByIp = req.ip;
            tokenDoc.replacedByToken = newRefreshToken.token;
            await tokenDoc.save();

            // Save new token
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
            // Can accept token in body or use current user context if auth required
            // Implementation for manual revocation (optional)
            const { token } = req.body;
            if (!token) return sendResponse(res, 400, false, 'Token required');

            await RefreshToken.findOneAndUpdate({ token }, { revoked: Date.now(), revokedByIp: req.ip });
            return sendResponse(res, 200, true, 'Token revoked');
      } catch (err) {
            return sendResponse(res, 500, false, 'Error revoking token');
      }
};

const logout = async (req, res) => {
      try {
            // Revoke the refresh token provided by client
            const { refreshToken } = req.body;
            if (refreshToken) {
                  const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
                  if (tokenDoc) {
                        // Revoke refresh token
                        await RefreshToken.updateOne({ _id: tokenDoc._id }, { revoked: Date.now(), revokedByIp: req.ip });

                        // Update user's lastLogoutAt to invalidate all current access tokens
                        await User.findByIdAndUpdate(tokenDoc.user, { lastLogoutAt: Date.now() });
                  }
            } else if (req.user) {
                  // Fallback if only access token is present (though client should send refresh token)
                  // If we have req.user from auth middleware
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

            // Check if user has a password (Google OAuth users might not)
            if (!user.password) {
                  return sendResponse(res, 400, false, 'Password change not available for this account', null);
            }

            // Verify old password
            const isOldPasswordValid = await user.comparePassword(oldPassword);
            if (!isOldPasswordValid) {
                  return sendResponse(res, 401, false, 'Current password is incorrect', null);
            }

            // Update password
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
                  // Don't reveal if email exists for security
                  return sendResponse(res, 200, true, 'If the email exists, a password reset link has been sent', null);
            }

            // Generate reset token
            const crypto = require('crypto');
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = new Date(resetTokenExpiry);
            await user.save();

            // In production, send email with reset token
            // For now, return token in response (remove in production!)
            if (process.env.NODE_ENV === 'development') {
                  return sendResponse(res, 200, true, 'Password reset token generated', {
                        resetToken, // Remove this in production - send via email instead
                        expiresIn: '10 minutes',
                  });
            }
            // Production: don't return token
            return sendResponse(res, 200, true, 'If the email exists, a password reset link has been sent', null);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error processing password reset request', null, { details: error.message });
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

            // Update password and clear reset token
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
            // User is attached to req.user by passport after successful authentication
            const user = req.user;

            if (!user) {
                  return sendResponse(res, 401, false, 'Google authentication failed', null);
            }

            // Generate JWT token (already imported at top)
            const accessToken = generateToken({ id: user._id, email: user.email });
            const refreshToken = generateRefreshToken();

            // Save refresh token
            await new RefreshToken({
                  user: user._id,
                  token: refreshToken.token,
                  expires: refreshToken.expires,
                  createdByIp: req.ip,
            }).save();

            // Redirect to frontend with token (or return JSON for API)
            // Note: Returning refresh token in URL is risky. Usually set as cookie or return in JSON body via POST.
            // Since this is a callback, we usually redirect to a client page which then exchanges a temporary code or receives tokens securely.
            // For this API:
            if (process.env.FRONTEND_URL) {
                  return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refreshToken=${refreshToken.token}`);
            }

            // Return JSON response for API testing
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
      resetPassword,
      googleAuth,
      googleCallback,
      revokeToken,
};
