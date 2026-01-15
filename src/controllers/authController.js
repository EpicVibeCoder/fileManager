const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const sendResponse = require('../utils/response');
const passport = require('passport');

const signup = async (req, res) => {
      try {
            const { email, password, confirmPassword, agreementAccepted } = req.body;

            // Check if agreement is accepted
            if (!agreementAccepted) {
                  return sendResponse(res, 400, false, 'You must accept the agreement to sign up', null, { field: 'agreementAccepted' });
            }

            // Check if passwords match
            if (password !== confirmPassword) {
                  return sendResponse(res, 400, false, 'Passwords do not match', null, { field: 'confirmPassword' });
            }

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                  return sendResponse(res, 409, false, 'User with this email already exists', null, { field: 'email' });
            }

            // Create new user
            const user = new User({
                  email,
                  password,
                  agreementAccepted,
            });

            await user.save();

            // Generate JWT token
            const token = generateToken({ id: user._id, email: user.email });

            return sendResponse(res, 201, true, 'User registered successfully', {
                  user: user.toJSON(),
                  token,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error during signup', null, { details: error.message });
      }
};

const login = async (req, res) => {
      try {
            const { email, password } = req.body;

            // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                  return sendResponse(res, 401, false, 'Invalid email or password', null);
            }

            // Check if user has a password (Google OAuth users might not)
            if (!user.password) {
                  return sendResponse(res, 401, false, 'Invalid email or password', null);
            }

            // Compare password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                  return sendResponse(res, 401, false, 'Invalid email or password', null);
            }

            // Generate JWT token
            const token = generateToken({ id: user._id, email: user.email });

            return sendResponse(res, 200, true, 'Login successful', {
                  user: user.toJSON(),
                  token,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error during login', null, { details: error.message });
      }
};

const logout = async (req, res) => {
      try {
            // Since we're using stateless JWT, logout is handled client-side
            // by removing the token. For server-side logout, you'd need to maintain
            // a token blacklist, which is beyond Phase 2 scope.
            return sendResponse(res, 200, true, 'Logout successful. Please remove the token from client storage.', null);
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
            const token = generateToken({ id: user._id, email: user.email });

            // Redirect to frontend with token (or return JSON for API)
            if (process.env.FRONTEND_URL) {
                  return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
            }

            // Return JSON response for API testing
            return sendResponse(res, 200, true, 'Google authentication successful', {
                  user: user.toJSON(),
                  token,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error during Google authentication', null, { details: error.message });
      }
};

module.exports = {
      signup,
      login,
      logout,
      editProfile,
      changePassword,
      forgotPassword,
      resetPassword,
      googleAuth,
      googleCallback,
};
