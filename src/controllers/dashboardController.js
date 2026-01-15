const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');
const sendResponse = require('../utils/response');
const mongoose = require('mongoose');

const getDashboardStats = async (req, res) => {
      try {
            const userId = req.user._id;

            // 1. Storage Usage
            const user = await User.findById(userId).select('storageUsed storageLimit');
            const storage = {
                  used: user.storageUsed,
                  limit: user.storageLimit,
                  usedPercentage: Math.round((user.storageUsed / user.storageLimit) * 100),
            };

            // 2. File Statistics by Type
            const fileStats = await File.aggregate([
                  { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                  {
                        $group: {
                              _id: '$type',
                              count: { $sum: 1 },
                              totalSize: { $sum: '$size' },
                        },
                  },
            ]);

            // 3. Recent Items
            const recentFiles = await File.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();
            const recentFolders = await Folder.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();

            // Add 'category' field to distinguish in UI
            const formattedFiles = recentFiles.map((f) => ({ ...f, category: 'file' }));
            const formattedFolders = recentFolders.map((f) => ({ ...f, category: 'folder' }));

            // Merge and sort top 5
            const recentItems = [...formattedFiles, ...formattedFolders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

            return sendResponse(res, 200, true, 'Dashboard stats retrieved', {
                  storage,
                  fileStats,
                  recentItems,
            });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error retrieving dashboard stats', null, { details: error.message });
      }
};

module.exports = {
      getDashboardStats,
};
