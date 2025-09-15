const mongoose = require('mongoose');

const energyPackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  institute: {
    type: String,
    required: true,
    index: true
  },
  packType: {
    type: String,
    enum: ['basic', 'standard', 'premium', 'custom'],
    default: 'standard'
  },
  totalCapacity: {
    type: Number,
    required: true
  },
  remainingEnergy: {
    type: Number,
    required: true
  },
  dailyUsage: {
    type: Number,
    default: 0
  },
  efficiency: {
    type: Number,
    default: 92
  },
  purchasePrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  lastCharged: {
    type: Date,
    default: Date.now
  },
  nextMaintenance: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'energy_packs'
});

energyPackSchema.index({ userId: 1, institute: 1, status: 1 });

module.exports = mongoose.model('EnergyPack', energyPackSchema);
