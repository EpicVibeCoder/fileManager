const sendResponse = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return sendResponse(
      res,
      400,
      false,
      'Validation Error',
      null,
      { details: err.message }
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return sendResponse(
      res,
      400,
      false,
      'Duplicate entry',
      null,
      { details: 'This record already exists' }
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendResponse(
      res,
      401,
      false,
      'Invalid token',
      null,
      { details: 'Authentication failed' }
    );
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendResponse(
    res,
    statusCode,
    false,
    message,
    null,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}
  );
};

module.exports = errorHandler;