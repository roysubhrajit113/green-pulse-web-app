const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  building_id: {
    type: Number,
    required: true,
    ref: 'Building'
  },
  building_name: {
    type: String,
    required: true
  },
  institute: {
    type: String,
    required: true
  },
  meter_reading: {
    type: Number,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active'
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  acknowledged_at: {
    type: Date
  },
  resolved_at: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
alertSchema.index({ user_id: 1, status: 1 });
alertSchema.index({ building_id: 1, status: 1 });
alertSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);