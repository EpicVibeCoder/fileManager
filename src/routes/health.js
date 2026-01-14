const express = require('express');
const router = express.Router();
const sendResponse = require('../utils/response');
const mongoose = require('mongoose');

router.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    return sendResponse(
      res,
      200,
      true,
      'Server is running',
      {
        status: 'healthy',
        database: dbStatus,
        timestamp: new Date().toISOString()
      }
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      false,
      'Health check failed',
      null,
      { details: error.message }
    );
  }
});

module.exports = router;