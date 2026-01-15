const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const passport = require('passport');

// Middleware to protect routes using Passport
const requireAuth = passport.authenticate('jwt', { session: false });

router.post('/api/folders', requireAuth, folderController.createFolder);
router.get('/api/folders', requireAuth, folderController.getFolders);
router.get('/api/folders/:id/files', requireAuth, folderController.getFolderContents);
router.put('/api/folders/:id/rename', requireAuth, folderController.renameFolder);
router.delete('/api/folders/:id', requireAuth, folderController.deleteFolder);

module.exports = router;
