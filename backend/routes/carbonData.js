const express = require('express');
const router = express.Router();
const CarbonTransaction = require('../models/CarbonTransaction'); // You'll need this model

// Middlewares
const { authenticateToken } = require('../middleware/auth');
const { instituteFilter } = require('../middleware/instituteAuth');

// Controllers (keep your existing ones)
const {
  getDashboardData,
  updateWalletBalance,
  purchaseCarbonOffset,
  recordEnergyConsumption,
  getWeeklyEnergyData,
  getInstituteAnalytics
} = require('../controllers/carbonDataController');

// Services
const blockchainService = require('../services/blockchainService');

// ---------------------------------------------------
// 🔐 Apply authentication + institute filtering to ALL routes
// ---------------------------------------------------
router.use(authenticateToken);
router.use(instituteFilter);

// ---------------------------------------------------
// Carbon Data Routes (Your existing routes)
// ---------------------------------------------------
router.get('/dashboard', getDashboardData);
router.get('/weekly-energy', getWeeklyEnergyData);
router.put('/wallet-balance', updateWalletBalance);
router.post('/carbon-offset', purchaseCarbonOffset);
router.post('/energy-consumption', recordEnergyConsumption);
router.get('/institute-analytics', getInstituteAnalytics);

// ---------------------------------------------------
// 🚨 MISSING ENDPOINTS - These are what your frontend needs
// ---------------------------------------------------

// GET /api/carbon-data/transactions/:instituteId
// Get transaction history for an institute
router.get('/transactions/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`Fetching transaction history for: ${instituteId}`);
    
    // Query your CarbonTransaction model or create mock data
    const transactions = await CarbonTransaction.find({ 
      $or: [
        { instituteId: instituteId },
        { institute: instituteId }
      ]
    })
    .sort({ date: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .lean();
    
    const total = await CarbonTransaction.countDocuments({ 
      $or: [
        { instituteId: instituteId },
        { institute: instituteId }
      ]
    });
    
    console.log(`✅ Found ${transactions.length} transactions`);
    
    res.json({
      success: true,
      transactions: transactions,
      total: total
    });
    
  } catch (error) {
    console.error('❌ Error fetching transaction history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/carbon-data/ento-transactions/:instituteId
// Get ENTO token transactions for an institute
router.get('/ento-transactions/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`Fetching ENTO transactions for: ${instituteId}`);
    
    const transactions = await CarbonTransaction.find({ 
      $or: [
        { instituteId: instituteId },
        { institute: instituteId }
      ],
      type: { $in: ['ento_transfer', 'carbon_credit_transfer'] }
    })
    .sort({ date: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .lean();
    
    const total = await CarbonTransaction.countDocuments({ 
      $or: [
        { instituteId: instituteId },
        { institute: instituteId }
      ],
      type: { $in: ['ento_transfer', 'carbon_credit_transfer'] }
    });
    
    console.log(`✅ Found ${transactions.length} ENTO transactions`);
    
    res.json({
      success: true,
      transactions: transactions,
      total: total
    });
    
  } catch (error) {
    console.error('❌ Error fetching ENTO transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/carbon-data/balance/:instituteId
// Get carbon credit balance for an institute
router.get('/balance/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    
    console.log(`Fetching balance for: ${instituteId}`);
    
    // Calculate balance from transactions
    const transactions = await CarbonTransaction.find({ 
      $or: [
        { instituteId: instituteId },
        { institute: instituteId }
      ]
    });
    
    let balance = 0;
    transactions.forEach(tx => {
      if (tx.type === 'carbon_offset_purchase' || tx.type === 'ento_transfer') {
        balance += tx.amount || 0;
      } else if (tx.type === 'carbon_credit_transfer') {
        balance -= tx.amount || 0;
      }
    });
    
    res.json({
      success: true,
      balance: Math.max(0, balance),
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/carbon-data/verify-transaction/:txHash
// Verify a blockchain transaction
router.get('/verify-transaction/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    
    console.log(`Verifying transaction: ${txHash}`);
    
    const transaction = await CarbonTransaction.findOne({ 
      blockchainTxHash: txHash 
    });
    
    if (!transaction) {
      return res.json({
        success: true,
        verified: false,
        confirmations: 0,
        blockNumber: 0,
        gasUsed: 0
      });
    }
    
    const verified = transaction.status === 'verified';
    
    res.json({
      success: true,
      verified: verified,
      confirmations: transaction.confirmations || 0,
      blockNumber: transaction.blockNumber || 0,
      gasUsed: transaction.gasUsed || 0
    });
    
  } catch (error) {
    console.error('❌ Error verifying transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Replace the POST /api/carbon-data/blockchain/submit-transaction route with:

// POST /api/carbon-data/transaction
// Submit transaction directly to database
router.post('/transactions', async (req, res) => {
  try {
    const transactionData = req.body;
    
    console.log('Submitting transaction to blockchain:', transactionData);
    
    // Create and save transaction
    const newTransaction = new CarbonTransaction({
      ...transactionData,
      instituteId: transactionData.instituteId || req.userInstitute || req.user.institute,
      status: 'verified', // Mark as verified immediately since we're not using blockchain
      date: new Date()
    });
    
    const savedTransaction = await newTransaction.save();
    
    res.json({
      success: true,
      transaction: savedTransaction,
      data: savedTransaction
    });
    
  } catch (error) {
    console.error('❌ Error submitting transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ---------------------------------------------------
// Updated Blockchain Routes (Your existing ones improved)
// ---------------------------------------------------

// POST /api/carbon-data/blockchain/transaction
// Store blockchain transaction in MongoDB
router.post('/blockchain/transaction', async (req, res) => {
  try {
    const { type, amount, description, building, consumption, blockchainTxHash } = req.body;

    const newTransaction = new CarbonTransaction({
      userId: req.user._id,
      institute: req.userInstitute || req.user.institute,
      instituteId: req.userInstitute || req.user.institute,
      type,
      amount,
      description,
      building,
      consumption,
      blockchainTxHash,
      status: blockchainTxHash ? 'verified' : 'pending',
      date: new Date()
    });

    const savedTransaction = await newTransaction.save();

    res.status(200).json({
      success: true,
      transaction: savedTransaction
    });
  } catch (error) {
    console.error('❌ Blockchain transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing blockchain transaction',
      error: error.message
    });
  }
});

// GET /api/carbon-data/blockchain/transaction/:txHash
// Get transaction by hash (Your existing route)
router.get('/blockchain/transaction/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    const transaction = await CarbonTransaction.findOne({ 
      blockchainTxHash: txHash 
    });

    if (transaction) {
      res.status(200).json({
        success: true,
        data: transaction
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
  } catch (error) {
    console.error('❌ Get blockchain transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving blockchain transaction',
      error: error.message
    });
  }
});

module.exports = router;
