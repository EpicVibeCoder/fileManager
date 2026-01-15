const File = require('../models/File');
const Folder = require('../models/Folder');
const { checkStorageLimit, updateStorageUsage } = require('../services/storageService');
const sendResponse = require('../utils/response');
const fs = require('fs');
const path = require('path');

const uploadFile = async (req, res) => {
      try {
            if (!req.file) {
                  return sendResponse(res, 400, false, 'No file uploaded');
            }

            const { size, path: filePath, mimetype, originalname } = req.file;
            const { folderId } = req.body;
            const userId = req.user._id;

            // If folderId is provided, verify it exists and belongs to user
            if (folderId) {
                  const folder = await Folder.findOne({ _id: folderId, userId });
                  if (!folder) {
                        return sendResponse(res, 404, false, 'Target folder not found');
                  }
            }

            // Determine type
            let type = 'doc';
            if (mimetype.startsWith('image/')) type = 'image';
            else if (mimetype === 'application/pdf') type = 'pdf';

            // Check if file with same name and type exists
            const existingFile = await File.findOne({
                  name: originalname,
                  type: type,
                  userId: userId,
            });

            if (existingFile) {
                  fs.unlinkSync(filePath);
                  return sendResponse(res, 400, false, 'File with the same name and type already exists');
            }

            // Check storage limit
            const hasSpace = await checkStorageLimit(userId, size);
            if (!hasSpace) {
                  // Remove the uploaded file if limit exceeded
                  fs.unlinkSync(filePath);
                  return sendResponse(res, 400, false, 'Storage limit exceeded');
            }

            const file = new File({
                  name: originalname,
                  type,
                  size,
                  path: filePath,
                  mimeType: mimetype,
                  userId,
                  folderId: folderId || null,
            });

            await file.save();
            await updateStorageUsage(userId, size, 'add');

            return sendResponse(res, 201, true, 'File uploaded successfully', file);
      } catch (error) {
            // Cleanup if error
            if (req.file) {
                  fs.unlinkSync(req.file.path);
            }
            return sendResponse(res, 500, false, 'Error uploading file', null, { details: error.message });
      }
};

const getFiles = async (req, res) => {
      try {
            const { type, folderId } = req.query;
            const query = {};

            // If not admin, restrict to own files
            if (req.user.role !== 'admin') {
                  query.userId = req.user._id;
            }

            if (type) query.type = type;

            // Filter by folder: if folderId provided, use it.
            // If explicit 'null' filtering logic is needed for root, the client might send empty string or 'null'.
            // However, usually listing "Files" implies all files unless a specific folder is requested.
            // But per request "user's should be able to upload ... without selecting folder in that case it will be stored in users root folder"
            // and usually UI lists root files separately.
            if (folderId) {
                  query.folderId = folderId;
            } else {
                  // If no folderId specified, should we return ALL files or just ROOT files?
                  // To strictly follow "List Files" usually means all.
                  // But if current view is "Root Directory", we likely want folderId: null.
                  // For now, let's keep it as "if folderId provided, filter by it".
                  // If client usually calls this for root view, they might need a way to say "folderId=null".
                  // Let's check for explicit "null" or "root" query param if needed, or default behavior.
                  // Given simple requirement, let's leave as optional filter.
                  // WAIT: User probably wants "List Files" to list root files if folder navigation is in place.
                  // But existing endpoint was "List all files". Creating a "Get Folder Contents" in folderController usually handles the drilled-down view.
                  // So this endpoint might remain "Search files" or "List all".
            }

            const files = await File.find(query).sort({ createdAt: -1 });

            return sendResponse(res, 200, true, 'Files retrieved successfully', files);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error retrieving files', null, { details: error.message });
      }
};

const getFileDetails = async (req, res) => {
      try {
            const query = { _id: req.params.id };

            // If not admin, restrict to own files
            if (req.user.role !== 'admin') {
                  query.userId = req.user._id;
            }

            const file = await File.findOne(query);
            if (!file) {
                  return sendResponse(res, 404, false, 'File not found');
            }

            return sendResponse(res, 200, true, 'File details retrieved', file);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error getting file details', null, { details: error.message });
      }
};

const downloadFile = async (req, res) => {
      try {
            const query = { _id: req.params.id };

            // If not admin, restrict to own files
            if (req.user.role !== 'admin') {
                  query.userId = req.user._id;
            }

            const file = await File.findOne(query);
            if (!file) {
                  return sendResponse(res, 404, false, 'File not found');
            }

            // Validate physical path
            if (!fs.existsSync(file.path)) {
                  return sendResponse(res, 404, false, 'Physical file not found');
            }

            res.download(file.path, file.name);
      } catch (error) {
            return sendResponse(res, 500, false, 'Error downloading file', null, { details: error.message });
      }
};

module.exports = {
      uploadFile,
      getFiles,
      getFileDetails,
      downloadFile,
};
