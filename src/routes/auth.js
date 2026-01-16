const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const sendResponse = require('../utils/response');
const passport = require('passport');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
            return sendResponse(res, 400, false, 'Validation failed', null, { errors: errors.array() });
      }
      return next();
};

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

const loginValidation = [
      body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
      body('password').notEmpty().withMessage('Password is required'),
];

const profileValidation = [
      body('username')
            .trim()
            .notEmpty()
            .withMessage('Username is required')
            .isLength({ min: 1, max: 50 })
            .withMessage('Username must be between 1 and 50 characters'),
];

const changePasswordValidation = [
      body('oldPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
];

const forgotPasswordValidation = [body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail()];

const verifyOtpValidation = [
      body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
      body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const resetPasswordValidation = [
      body('token').notEmpty().withMessage('Reset token is required'),
      body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
];

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

router.post('/api/auth/forgot-password', ...forgotPasswordValidation, handleValidationErrors, authController.forgotPassword);

router.post('/api/auth/verify-otp', ...verifyOtpValidation, handleValidationErrors, authController.verifyOtp);

router.post('/api/auth/reset-password', ...resetPasswordValidation, handleValidationErrors, authController.resetPassword);

router.post('/api/auth/signup', ...signupValidation, handleValidationErrors, authController.signup);

router.post('/api/auth/login', ...loginValidation, handleValidationErrors, authController.login);

router.post('/api/auth/refresh-token', authController.refreshToken);
router.post('/api/auth/revoke-token', authController.revokeToken);

router.post('/api/auth/logout', passport.authenticate('jwt', { session: false }), authController.logout);

router.get('/api/auth/google', authController.googleAuth);

router.get(
      '/api/auth/google/callback',
      passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failure' }),
      authController.googleCallback,
);

router.get('/api/auth/google/failure', (req, res) => {
      return sendResponse(res, 401, false, 'Google authentication failed', null);
});

module.exports = router;
