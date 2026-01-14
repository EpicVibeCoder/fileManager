const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const sendResponse = require('../utils/response');

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

module.exports = {
      signup,
      login,
      logout,
};
