const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const sendResponse = require('../utils/response');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(
      res,
      400,
      false,
      'Validation failed',
      null,
      { errors: errors.array() }
    );
  }
  next();
};

// Signup validation rules
const signupValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('agreementAccepted')
    .equals('true')
    .withMessage('You must accept the agreement'),
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Routes
router.post(
  '/api/auth/signup',
  signupValidation,
  handleValidationErrors,
  authController.signup
);

router.post(
  '/api/auth/login',
  loginValidation,
  handleValidationErrors,
  authController.login
);

router.post('/api/auth/logout', authController.logout);

module.exports = router;