const express = require('express');
const router = express.Router();
const passport = require('passport');
const fileController = require('../controllers/fileController');
const upload = require('../middleware/upload');

// Middleware to protect routes using Passport
const requireAuth = passport.authenticate('jwt', { session: false });

// Apply auth to all routes
router.use(requireAuth);

router.post('/api/files/upload', upload.single('file'), fileController.uploadFile);
router.get('/api/files', fileController.getFiles);
router.get('/api/files/:id', fileController.getFileDetails);
router.get('/api/files/:id/download', fileController.downloadFile);

module.exports = router;