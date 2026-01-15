const express = require('express');
const router = express.Router();
const passport = require('passport');
const vaultController = require('../controllers/vaultController');
const requireVaultAuth = require('../middleware/requireVaultAuth');

const requireAuth = passport.authenticate('jwt', { session: false });

// Set PIN
router.post('/api/vault/pin', requireAuth, vaultController.setPin);

// Verify PIN (for checking before UI access)
router.post('/api/vault/verify', requireAuth, vaultController.verifyPin);

// Get Items (requires header)
router.get('/api/vault', requireAuth, requireVaultAuth, vaultController.getVaultItems);

// Move TO Vault (usually doesn't strict PIN if user is logged in, but let's be safe - wait, user just needs logic. Moving IN is easy.)
// Let's assume moving IN requires auth only.
router.post('/api/vault/files/:id/move', requireAuth, vaultController.moveFileToVault);
router.post('/api/vault/folders/:id/move', requireAuth, vaultController.moveFolderToVault);

// Move OUT of Vault (requires PIN)
router.post('/api/vault/files/:id/restore', requireAuth, requireVaultAuth, vaultController.removeFileFromVault);
router.post('/api/vault/folders/:id/restore', requireAuth, requireVaultAuth, vaultController.removeFolderFromVault);

module.exports = router;
