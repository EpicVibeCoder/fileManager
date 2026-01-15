const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const sendResponse = require('../utils/response');
const passport = require('passport');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
            return sendResponse(res, 400, false, 'Validation failed', null, { errors: errors.array() });
      }
      return next();
};

// Signup validation rules
const signupValidation = [
      body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
      body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                  throw new Error('Passwords do not match');
            }
            return true;
      }),
      body('agreementAccepted').equals('true').withMessage('You must accept the agreement'),
];

// Login validation rules
const loginValidation = [
      body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
      body('password').notEmpty().withMessage('Password is required'),
];

// Profile validation rules
const profileValidation = [
      body('username')
            .trim()
            .notEmpty()
            .withMessage('Username is required')
            .isLength({ min: 1, max: 50 })
            .withMessage('Username must be between 1 and 50 characters'),
];

// Change password validation rules
const changePasswordValidation = [
      body('oldPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
];

// Forgot password validation rules
const forgotPasswordValidation = [body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail()];

// Reset password validation rules
const resetPasswordValidation = [
      body('token').notEmpty().withMessage('Reset token is required'),
      body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
];



// Protected routes (require authentication)
router.put(
      '/api/auth/profile',
      passport.authenticate('jwt', { session: false }),
      ...profileValidation,
      handleValidationErrors,
      authController.editProfile,
);

router.post(
      '/api/auth/change-password',
      passport.authenticate('jwt', { session: false }),
      ...changePasswordValidation,
      handleValidationErrors,
      authController.changePassword,
);

// Public routes
router.post('/api/auth/forgot-password', ...forgotPasswordValidation, handleValidationErrors, authController.forgotPassword);

router.post('/api/auth/reset-password', ...resetPasswordValidation, handleValidationErrors, authController.resetPassword);
// Routes
router.post('/api/auth/signup', ...signupValidation, handleValidationErrors, authController.signup);

router.post('/api/auth/login', ...loginValidation, handleValidationErrors, authController.login);

router.post('/api/auth/logout', authController.logout);

// Google OAuth routes
router.get('/api/auth/google', authController.googleAuth);

router.get(
  '/api/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
  authController.googleCallback
);

router.get('/api/auth/google/failure', (req, res) => {
  return sendResponse(res, 401, false, 'Google authentication failed', null);
});


module.exports = router;
