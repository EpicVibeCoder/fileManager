const File = require('../models/File');
const Folder = require('../models/Folder');
const sendResponse = require('../utils/response');

const getFavorites = async (req, res) => {
      try {
            const userId = req.user._id;

            const favoriteFiles = await File.find({ userId, isFavorite: true }).sort({ updatedAt: -1 });
            const favoriteFolders = await Folder.find({ userId, isFavorite: true }).sort({ updatedAt: -1 });

            return sendResponse(res, 200, true, 'Favorites retrieved successfully', {
                  files: favoriteFiles,
                  folders: favoriteFolders,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error retrieving favorites', null, { details: error.message });
      }
};

const addFileToFavorites = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const file = await File.findOne({ _id: id, userId });
            if (!file) {
                  return sendResponse(res, 404, false, 'File not found');
            }

            file.isFavorite = true;
            await file.save();

            return sendResponse(res, 200, true, 'File added to favorites', file);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error adding file to favorites', null, { details: error.message });
      }
};

const removeFileFromFavorites = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const file = await File.findOne({ _id: id, userId });
            if (!file) {
                  return sendResponse(res, 404, false, 'File not found');
            }

            file.isFavorite = false;
            await file.save();

            return sendResponse(res, 200, true, 'File removed from favorites', file);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error removing file from favorites', null, { details: error.message });
      }
};

const addFolderToFavorites = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const folder = await Folder.findOne({ _id: id, userId });
            if (!folder) {
                  return sendResponse(res, 404, false, 'Folder not found');
            }

            folder.isFavorite = true;
            await folder.save();

            return sendResponse(res, 200, true, 'Folder added to favorites', folder);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error adding folder to favorites', null, { details: error.message });
      }
};

const removeFolderFromFavorites = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const folder = await Folder.findOne({ _id: id, userId });
            if (!folder) {
                  return sendResponse(res, 404, false, 'Folder not found');
            }

            folder.isFavorite = false;
            await folder.save();

            return sendResponse(res, 200, true, 'Folder removed from favorites', folder);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error removing folder from favorites', null, { details: error.message });
      }
};

module.exports = {
      getFavorites,
      addFileToFavorites,
      removeFileFromFavorites,
      addFolderToFavorites,
      removeFolderFromFavorites,
};
