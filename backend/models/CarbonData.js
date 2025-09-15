const mongoose = require('mongoose');

const carbonDataSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  co2Savings: {
    type: Number,
    default: 0
  },
  carbonBudgetUsed: {
    type: Number,
    default: 0
  },
  carbonBudgetTotal: {
    type: Number,
    default: 1000
  },
  walletBalance: {
    type: Number,
    default: 1000
  },
  offsetsPurchased: {
    type: Number,
    default: 0
  },

  currentEnergyConsumption: {
    type: Number,
    default: 0
  },
  monthlyEnergyConsumption: [{
    month: String,
    consumption: Number,
    efficiency: Number,
    date: { type: Date, default: Date.now }
  }],

  buildingData: [{
    buildingName: String,
    consumption: Number,
    efficiency: Number,
    carbonFootprint: Number,
    lastUpdated: { type: Date, default: Date.now }
  }],

  departmentData: [{
    departmentName: String,
    consumption: Number,
    efficiency: Number,
    carbonFootprint: Number,
    color: String,
    lastUpdated: { type: Date, default: Date.now }
  }],

  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit', 'offset_purchase', 'energy_consumption'],
      required: true
    },
    amount: Number,
    description: String,
    co2Impact: Number,
    building: String,
    consumption: Number,
    blockchainTxHash: String,
    date: { type: Date, default: Date.now }
  }],

  analytics: {
    totalReductionInitiatives: { type: Number, default: 0 },
    carbonValue: { type: Number, default: 0 },
    weeklyRevenueData: [{
      week: String,
      revenue: Number,
      date: { type: Date, default: Date.now }
    }],
    dailyTrafficData: [{
      day: String,
      traffic: Number,
      date: { type: Date, default: Date.now }
    }]
  }
}, {
  timestamps: true
});


carbonDataSchema.index({ institute: 1, userId: 1 });


carbonDataSchema.statics.getInstituteIdentifier = function(institute) {
  if (!institute) return null;
  
  if (typeof institute === 'string') {
    return institute.toLowerCase();
  } else if (typeof institute === 'object' && institute.name) {
    return institute.name.toLowerCase();
  } else if (typeof institute === 'object' && institute.id) {
    return institute.id;
  }
  
  return String(institute).toLowerCase();
};


carbonDataSchema.methods.belongsToInstitute = function(targetInstitute) {
  const thisInstitute = this.constructor.getInstituteIdentifier(this.institute);
  const checkInstitute = this.constructor.getInstituteIdentifier(targetInstitute);
  return thisInstitute === checkInstitute;
};

module.exports = mongoose.model('CarbonData', carbonDataSchema);