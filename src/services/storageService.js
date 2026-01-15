const User = require('../models/User');

const checkStorageLimit = async (userId, fileSize) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.storageUsed + fileSize > user.storageLimit) {
    return false;
  }
  return true;
};

const updateStorageUsage = async (userId, fileSize, operation = 'add') => {
  const user = await User.findById(userId);
  if (!user) return;

  if (operation === 'add') {
    user.storageUsed += fileSize;
  } else if (operation === 'remove') {
    user.storageUsed = Math.max(0, user.storageUsed - fileSize);
  }

  await user.save();
};

module.exports = {
  checkStorageLimit,
  updateStorageUsage,
};