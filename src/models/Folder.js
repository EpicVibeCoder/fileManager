const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
      {
            name: {
                  type: String,
                  required: true,
                  trim: true,
            },
            userId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'User',
                  required: true,
            },
            parentId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'Folder',
                  default: null,
            },
      },
      {
            timestamps: true,
      },
);

// Compound index to ensure folder names are unique within the same parent folder for a user
folderSchema.index({ userId: 1, parentId: 1, name: 1 }, { unique: true });

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
