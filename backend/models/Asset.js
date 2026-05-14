const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['vehicle', 'weapon', 'ammunition'],
    required: true
  },
  base: {
    type: String,
    required: true,
    trim: true
  },
  openingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  closingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  purchasedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  transferredIn: {
    type: Number,
    default: 0,
    min: 0
  },
  transferredOut: {
    type: Number,
    default: 0,
    min: 0
  },
  assignedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  expendedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  netMovement: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Recalculate netMovement before every save
assetSchema.pre('save', function (next) {
  this.netMovement = this.closingBalance - this.openingBalance;
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Asset', assetSchema);
