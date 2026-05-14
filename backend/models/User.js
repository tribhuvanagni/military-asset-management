const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'commander', 'logistics'],
    required: true
  },
  assignedBase: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Strip passwordHash from JSON responses - never leak hashes to the client
userSchema.methods.toSafeObject = function () {
  const { _id, username, role, assignedBase, createdAt } = this;
  return { _id, username, role, assignedBase, createdAt };
};

module.exports = mongoose.model('User', userSchema);
