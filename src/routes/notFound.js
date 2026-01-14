const express = require('express');
const router = express.Router();
const sendResponse = require('../utils/response');

// Dedicated not found route (optional - for testing)
router.get('/api/not-found', (req, res) => {
  return sendResponse(
    res,
    404,
    false,
    'Route not found',
    null,
    { 
      path: req.originalUrl,
      message: 'This is a test endpoint for 404 responses'
    }
  );
});

module.exports = router;