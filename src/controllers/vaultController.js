const VaultPin = require('../models/VaultPin');
const File = require('../models/File');
const Folder = require('../models/Folder');
const sendResponse = require('../utils/response');
const bcrypt = require('bcrypt');

const setPin = async (req, res) => {
      try {
            const { pin } = req.body;
            const userId = req.user._id;

            if (!pin || pin.length < 4) {
                  return sendResponse(res, 400, false, 'PIN must be at least 4 digits');
            }

            let vaultPin = await VaultPin.findOne({ userId });

            if (vaultPin) {
                  vaultPin.hashedPin = pin; // Will be hashed by pre-save
                  await vaultPin.save();
                  return sendResponse(res, 200, true, 'Vault PIN updated successfully');
            } else {
                  vaultPin = new VaultPin({
                        userId,
                        hashedPin: pin,
                  });
                  await vaultPin.save();
                  return sendResponse(res, 201, true, 'Vault PIN set successfully');
            }
      } catch (error) {
            return sendResponse(res, 500, false, 'Error setting vault PIN', null, { details: error.message });
      }
};

const verifyPin = async (req, res) => {
      try {
            const { pin } = req.body;
            const userId = req.user._id;

            const vaultPin = await VaultPin.findOne({ userId });
            if (!vaultPin) {
                  return sendResponse(res, 404, false, 'PIN not set');
            }

            const isMatch = await vaultPin.matchPin(pin);
            if (!isMatch) {
                  return sendResponse(res, 401, false, 'Invalid PIN');
            }

            return sendResponse(res, 200, true, 'PIN verified successfully');
      } catch (error) {
            return sendResponse(res, 500, false, 'Error verifying PIN', null, { details: error.message });
      }
};

const getVaultItems = async (req, res) => {
      try {
            const userId = req.user._id;
            // Middleware should have verified PIN, but let's double check if we want to enforce it here or rely on middleware.
            // We will rely on middleware 'requireVaultAuth'.

            const files = await File.find({ userId, isVault: true }).sort({ updatedAt: -1 });
            const folders = await Folder.find({ userId, isVault: true }).sort({ updatedAt: -1 });

            return sendResponse(res, 200, true, 'Vault items retrieved', { files, folders });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error retrieving vault items', null, { details: error.message });
      }
};

const moveFileToVault = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const file = await File.findOne({ _id: id, userId });
            if (!file) return sendResponse(res, 404, false, 'File not found');

            file.isVault = true;
            file.isFavorite = false; // Remove from favorites? Optional decision.
            await file.save();

            return sendResponse(res, 200, true, 'File moved to vault', file);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error moving file to vault', null, { details: error.message });
      }
};

const removeFileFromVault = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const file = await File.findOne({ _id: id, userId });
            if (!file) return sendResponse(res, 404, false, 'File not found');

            file.isVault = false;
            await file.save();

            return sendResponse(res, 200, true, 'File removed from vault', file);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error removing file from vault', null, { details: error.message });
      }
};

const moveFolderToVault = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const folder = await Folder.findOne({ _id: id, userId });
            if (!folder) return sendResponse(res, 404, false, 'Folder not found');

            folder.isVault = true;
            // Logic to recursively move contents?
            // For now, simple flag update. The 'getFiles' endpoint usually filters out vault items unless requested?
            // Wait, standard getFiles should EXCLUDE vault items. I need to update fileController/folderController to exclude isVault: true defaults.
            // That's a catch!
            // I'll update that later.

            await folder.save();

            return sendResponse(res, 200, true, 'Folder moved to vault', folder);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error moving folder to vault', null, { details: error.message });
      }
};

const removeFolderFromVault = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const folder = await Folder.findOne({ _id: id, userId });
            if (!folder) return sendResponse(res, 404, false, 'Folder not found');

            folder.isVault = false;
            await folder.save();

            return sendResponse(res, 200, true, 'Folder removed from vault', folder);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error removing folder from vault', null, { details: error.message });
      }
};

module.exports = {
      setPin,
      verifyPin,
      getVaultItems,
      moveFileToVault,
      removeFileFromVault,
      moveFolderToVault,
      removeFolderFromVault,
};
