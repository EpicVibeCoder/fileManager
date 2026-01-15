const File = require('../models/File');
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
            const userId = req.user._id;

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
            if (folderId) query.folderId = folderId;

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
