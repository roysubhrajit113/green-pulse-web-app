const mongoose = require('mongoose');
const CarbonTransaction = require('../models/CarbonTransaction');
require('dotenv').config();

const sampleTransactions = [
  {
    userId: new mongoose.Types.ObjectId(),
    institute: 'Indian Institute of Technology Bombay',
    instituteId: 'Indian Institute of Technology Bombay',
    type: 'energy_consumption',
    status: 'verified',
    amount: 1500,
    blockchainTxHash: '0x1234567890abcdef1234567890abcdef12345678',
    blockNumber: 18500000,
    gasUsed: 45000,
    confirmations: 12,
    building: 'Computer Science Building',
    consumption: 1500,
    description: 'Monthly energy consumption recorded'
  },
  {
    userId: new mongoose.Types.ObjectId(),
    institute: 'Indian Institute of Technology Bombay',
    instituteId: 'Indian Institute of Technology Bombay',
    type: 'carbon_offset_purchase',
    status: 'verified',
    amount: 500,
    blockchainTxHash: '0xabcdef1234567890abcdef1234567890abcdef12',
    blockNumber: 18500001,
    gasUsed: 52000,
    confirmations: 8,
    description: 'Carbon offset purchase for Q3'
  },
  {
    userId: new mongoose.Types.ObjectId(),
    institute: 'Malaviya National Institute of Technology  Jaipur',
    instituteId: 'Malaviya National Institute of Technology  Jaipur',
    type: 'ento_transfer',
    status: 'pending',
    amount: 250,
    description: 'ENTO token transfer to partner institute'
  }
];

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    

    await CarbonTransaction.deleteMany({});
    

    await CarbonTransaction.insertMany(sampleTransactions);
    
    console.log('✅ Carbon transaction data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
