const express = require('express');
const router = express.Router();
const passport = require('passport');
const favoriteController = require('../controllers/favoriteController');

// All routes require authentication
const requireAuth = passport.authenticate('jwt', { session: false });

// Apply auth to individual routes
router.get('/api/favorites', requireAuth, favoriteController.getFavorites);

router.post('/api/favorites/files/:id', requireAuth, favoriteController.addFileToFavorites);
router.delete('/api/favorites/files/:id', requireAuth, favoriteController.removeFileFromFavorites);

router.post('/api/favorites/folders/:id', requireAuth, favoriteController.addFolderToFavorites);
router.delete('/api/favorites/folders/:id', requireAuth, favoriteController.removeFolderFromFavorites);

module.exports = router;
