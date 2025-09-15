const mongoose = require('mongoose');

const carbonTransactionSchema = new mongoose.Schema({
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
  instituteId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [

      'carbon_offset_purchase',
      'ento_transfer', 
      'energy_consumption',
      

      'energy_pack_purchase',
      'loan_application',
      'loan_payment',
      'energy_charge'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  building: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  date: {
    type: Date,
    default: Date.now
  },
  blockchainTxHash: {
    type: String
  },
  blockNumber: {
    type: Number
  },
  gasUsed: {
    type: Number
  },
  confirmations: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'carbon_transactions'
});

carbonTransactionSchema.index({ userId: 1, institute: 1, type: 1 });
carbonTransactionSchema.index({ date: -1 });

module.exports = mongoose.model('CarbonTransaction', carbonTransactionSchema);
