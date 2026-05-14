const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  assetName: {
    type: String,
    required: true
  },
  base: {
    type: String,
    required: true
  },
  assignedTo: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  purpose: {
    type: String,
    required: true
  },
  expendedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  returnDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'expended'],
    default: 'active'
  }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
