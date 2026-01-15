const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
      {
            name: {
                  type: String,
                  required: true,
            },
            type: {
                  type: String,
                  enum: ['pdf', 'image', 'doc'],
                  required: true,
            },
            size: {
                  type: Number,
                  required: true,
            },
            path: {
                  type: String,
                  required: true,
            },
            mimeType: {
                  type: String,
                  required: true,
            },
            userId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'User',
                  required: true,
            },
            folderId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'Folder',
                  default: null,
            },
            folderId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'Folder',
                  default: null,
            },
            isFavorite: {
                  type: Boolean,
                  default: false,
            },
            isVault: {
                  type: Boolean,
                  default: false,
            },
      },
      { timestamps: true },
);

module.exports = mongoose.model('File', fileSchema);
