const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
      {
            email: {
                  type: String,
                  required: [true, 'Email is required'],
                  unique: true,
                  lowercase: true,
                  trim: true,
                  match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
            },
            password: {
                  type: String,
                  required: function () {
                        return !this.googleId;
                  },
                  minlength: [6, 'Password must be at least 6 characters'],
            },
            username: {
                  type: String,
                  trim: true,
                  default: '',
            },
            storageUsed: {
                  type: Number,
                  default: 0,
            },
            storageLimit: {
                  type: Number,
                  default: 15 * 1024 * 1024 * 1024, // 15GB in bytes
            },
            agreementAccepted: {
                  type: Boolean,
                  default: false,
            },
            resetPasswordToken: {
                  type: String,
                  default: null,
            },
            resetPasswordExpires: {
                  type: Date,
                  default: null,
            },
            googleId: {
                  type: String,
                  default: null,
            },
            lastLogoutAt: {
                  type: Date,
                  default: null,
            },
      },
      {
            timestamps: true,
      },
);

// Hash password before saving
userSchema.pre('save', async function () {
      if (!this.isModified('password')) return;
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
};

// Method to remove password from JSON output
userSchema.methods.toJSON = function () {
      const obj = this.toObject();
      delete obj.password;
      delete obj.resetPasswordToken;
      delete obj.resetPasswordExpires;
      return obj;
};

module.exports = mongoose.model('User', userSchema);
