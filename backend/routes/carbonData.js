const express = require('express');
const router = express.Router();
const CarbonTransaction = require('../models/CarbonTransaction');


const { authenticateToken } = require('../middleware/auth');
const { instituteFilter } = require('../middleware/instituteAuth');


const {
  getDashboardData,
  updateWalletBalance,
  purchaseCarbonOffset,
  recordEnergyConsumption,
  getWeeklyEnergyData,
  getInstituteAnalytics
} = require('../controllers/carbonDataController');


const blockchainService = require('../services/blockchainService');




router.use(authenticateToken);
router.use(instituteFilter);




router.get('/dashboard', getDashboardData);
router.get('/weekly-energy', getWeeklyEnergyData);
router.put('/wallet-balance', updateWalletBalance);
router.post('/carbon-offset', purchaseCarbonOffset);
router.post('/energy-consumption', recordEnergyConsumption);
router.get('/institute-analytics', getInstituteAnalytics);







router.get('/transactions/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`Fetching transaction history for: ${instituteId}`);
    

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



router.get('/balance/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    
    console.log(`Fetching balance for: ${instituteId}`);
    

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





router.post('/transactions', async (req, res) => {
  try {
    const transactionData = req.body;
    
    console.log('Submitting transaction to blockchain:', transactionData);
    

    const newTransaction = new CarbonTransaction({
      ...transactionData,
      instituteId: transactionData.instituteId || req.userInstitute || req.user.institute,
      status: 'verified',
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
