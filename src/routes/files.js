const express = require('express');
const router = express.Router();
const passport = require('passport');
const fileController = require('../controllers/fileController');
const upload = require('../middleware/upload');

// Middleware to protect routes using Passport
const requireAuth = passport.authenticate('jwt', { session: false });

// Apply auth to individual routes
router.post('/api/files/upload', requireAuth, upload.single('file'), fileController.uploadFile);
router.get('/api/files', requireAuth, fileController.getFiles);
router.get('/api/files/:id', requireAuth, fileController.getFileDetails);
router.get('/api/files/:id/download', requireAuth, fileController.downloadFile);

module.exports = router;
