const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const vaultPinSchema = new mongoose.Schema(
      {
            userId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: 'User',
                  required: true,
                  unique: true,
            },
            hashedPin: {
                  type: String,
                  required: true,
            },
      },
      { timestamps: true },
);

// Method to verify PIN
vaultPinSchema.methods.matchPin = async function (enteredPin) {
      return await bcrypt.compare(enteredPin, this.hashedPin);
};

// Pre-save middleware to hash PIN
vaultPinSchema.pre('save', async function (next) {
      if (!this.isModified('hashedPin')) {
            next();
      }
      const salt = await bcrypt.genSalt(10);
      this.hashedPin = await bcrypt.hash(this.hashedPin, salt);
});

module.exports = mongoose.model('VaultPin', vaultPinSchema);
