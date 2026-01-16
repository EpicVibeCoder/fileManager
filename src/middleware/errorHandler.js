const sendResponse = require('../utils/response');

const errorHandler = (err, req, res, next) => {
      console.error('Error:', err);

      if (err.name === 'ValidationError') {
            return sendResponse(res, 400, false, 'Validation Error', null, { details: err.message });
      }

      if (err.code === 11000) {
            return sendResponse(res, 400, false, 'Duplicate entry', null, { details: 'This record already exists' });
      }

      if (err.name === 'MulterError') {
            let message = err.message;
            if (err.code === 'LIMIT_FILE_COUNT') {
                  message = '50 files max';
            } else if (err.code === 'LIMIT_FILE_SIZE') {
                  message = 'One or more files exceed the 50MB size limit';
            }
            return sendResponse(res, 400, false, message, null, { details: err.code });
      }

      if (err.name === 'JsonWebTokenError') {
            return sendResponse(res, 401, false, 'Invalid token', null, { details: 'Authentication failed' });
      }

      const statusCode = err.statusCode || 500;
      const message = err.message || 'Internal Server Error';

      return sendResponse(res, statusCode, false, message, null, process.env.NODE_ENV === 'development' ? { stack: err.stack } : {});
};

module.exports = errorHandler;
