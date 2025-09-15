const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
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
  totalAmount: {
    type: Number,
    required: true
  },
  remainingBalance: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number,
    required: true,
    default: 4.5
  },
  monthlyPayment: {
    type: Number,
    required: true
  },
  totalPayments: {
    type: Number,
    required: true
  },
  remainingPayments: {
    type: Number,
    required: true
  },
  loanType: {
    type: String,
    default: 'Green Energy Investment'
  },
  status: {
    type: String,
    enum: ['active', 'paid_off', 'defaulted', 'pending'],
    default: 'pending'
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  startDate: {
    type: Date
  },
  lastPaymentDate: {
    type: Date
  },
  nextPaymentDate: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'loans'
});

loanSchema.index({ userId: 1, institute: 1, status: 1 });

module.exports = mongoose.model('Loan', loanSchema);
