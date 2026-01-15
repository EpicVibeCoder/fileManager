const jwt = require('jsonwebtoken');

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Access token should be short-lived
const JWT_EXPIRES_IN = '15m';

const generateToken = (payload) => {
      return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
      });
};

const generateRefreshToken = () => {
      // Generate a random token
      return {
            token: crypto.randomBytes(40).toString('hex'),
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
};

module.exports = {
      generateToken,
      generateRefreshToken,
};
