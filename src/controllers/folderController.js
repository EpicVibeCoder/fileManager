const Folder = require('../models/Folder');
const File = require('../models/File');
const sendResponse = require('../utils/response');
const { updateStorageUsage } = require('../services/storageService');
const fs = require('fs');

const createFolder = async (req, res) => {
      try {
            const { name, parentId } = req.body;
            const userId = req.user._id;

            // Check if folder with same name exists in the parent directory
            const query = { name, userId, parentId: parentId || null };

            const existingFolder = await Folder.findOne(query);
            if (existingFolder) {
                  return sendResponse(res, 400, false, 'Folder with this name already exists in this location');
            }

            // If parentId provided, verify it exists and belongs to user
            if (parentId) {
                  const parent = await Folder.findOne({ _id: parentId, userId });
                  if (!parent) {
                        return sendResponse(res, 404, false, 'Parent folder not found');
                  }
            }

            const folder = new Folder({
                  name,
                  userId,
                  parentId: parentId || null,
            });

            await folder.save();
            return sendResponse(res, 201, true, 'Folder created successfully', folder);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error creating folder', null, { details: error.message });
      }
};

const getFolders = async (req, res) => {
      try {
            const { parentId } = req.query;
            const userId = req.user._id;
            const query = { userId };

            // If getting root folders, parentId should be null
            // If getting subfolders, parentId should be the ID
            // If parentId param is explicit 'null' string, or undefined, treat as root?
            // Let's assume ?parentId=xxx filters by strict parent.
            // If not provided, should we list ALL folders or just root?
            // Usually file managers list root first. But existing file API has flattened view option.
            // Let's support hierarchical view: if parentId provided, show children. If not, show root.

            if (parentId) {
                  query.parentId = parentId;
            } else {
                  query.parentId = null;
            }

            const folders = await Folder.find(query).sort({ name: 1 });
            return sendResponse(res, 200, true, 'Folders retrieved successfully', folders);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error retrieving folders', null, { details: error.message });
      }
};

const getFolderContents = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            // Verify folder exists
            const folder = await Folder.findOne({ _id: id, userId });
            if (!folder) {
                  return sendResponse(res, 404, false, 'Folder not found');
            }

            // Get subfolders
            const subfolders = await Folder.find({ parentId: id, userId }).sort({ name: 1 });

            // Get files
            const files = await File.find({ folderId: id, userId }).sort({ name: 1 });

            return sendResponse(res, 200, true, 'Folder contents retrieved', { folder, subfolders, files });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error retrieving folder contents', null, { details: error.message });
      }
};

const renameFolder = async (req, res) => {
      try {
            const { id } = req.params;
            const { name } = req.body;
            const userId = req.user._id;

            const folder = await Folder.findOne({ _id: id, userId });
            if (!folder) {
                  return sendResponse(res, 404, false, 'Folder not found');
            }

            // Check duplicate name in same location
            const existing = await Folder.findOne({
                  name,
                  userId,
                  parentId: folder.parentId,
                  _id: { $ne: id },
            });

            if (existing) {
                  return sendResponse(res, 400, false, 'Folder with this name already exists in this location');
            }

            folder.name = name;
            await folder.save();

            return sendResponse(res, 200, true, 'Folder renamed successfully', folder);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error renaming folder', null, { details: error.message });
      }
};

const deleteFolderRecursive = async (folderId, userId) => {
      // Find all subfolders
      const subfolders = await Folder.find({ parentId: folderId, userId });

      for (const subfolder of subfolders) {
            await deleteFolderRecursive(subfolder._id, userId);
      }

      // Find and delete all files in this folder
      const files = await File.find({ folderId: folderId, userId });
      for (const file of files) {
            if (fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
            }
            await File.deleteOne({ _id: file._id });
            await updateStorageUsage(userId, file.size, 'remove');
      }

      // Delete the folder itself
      await Folder.deleteOne({ _id: folderId });
};

const deleteFolder = async (req, res) => {
      try {
            const { id } = req.params;
            const userId = req.user._id;

            const folder = await Folder.findOne({ _id: id, userId });
            if (!folder) {
                  return sendResponse(res, 404, false, 'Folder not found');
            }

            // Warning: This is a heavy operation for deep trees
            await deleteFolderRecursive(id, userId);

            // We need to sync storage usage. Since deleteFolderRecursive doesn't track bytes deleted easily,
            // a better approach in a real app would be to aggregate file sizes before delete or update incrementally.
            // For now, let's assume storage recalculation is done separately or we accept potential drift until a "recalc" job runs.
            // OR: We can iterate and sum up sizes to decrement.

            return sendResponse(res, 200, true, 'Folder and contents deleted successfully');
      } catch (error) {
            return sendResponse(res, 500, false, 'Error deleting folder', null, { details: error.message });
      }
};

module.exports = {
      createFolder,
      getFolders,
      getFolderContents,
      renameFolder,
      deleteFolder,
};
