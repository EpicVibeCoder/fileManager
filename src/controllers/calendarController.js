const File = require('../models/File');
const Folder = require('../models/Folder');
const sendResponse = require('../utils/response');

const getItemsByDate = async (req, res) => {
      try {
            const { date } = req.query; // YYYY-MM-DD
            const userId = req.user._id;

            if (!date) {
                  return sendResponse(res, 400, false, 'Date parameter (YYYY-MM-DD) is required');
            }

            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            if (isNaN(startDate.getTime())) {
                  return sendResponse(res, 400, false, 'Invalid date format');
            }

            const files = await File.find({
                  userId,
                  createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                  },
            }).sort({ createdAt: 1 });

            const folders = await Folder.find({
                  userId,
                  createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                  },
            }).sort({ createdAt: 1 });

            return sendResponse(res, 200, true, 'Items retrieved for date ' + date, { files, folders });
      } catch (error) {
            return sendResponse(res, 500, false, 'Error retrieving calendar items', null, { details: error.message });
      }
};

module.exports = {
      getItemsByDate,
};
