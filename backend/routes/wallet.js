const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { instituteFilter } = require('../middleware/instituteAuth');


const CarbonTransaction = require('../models/CarbonTransaction');
const EnergyPack = require('../models/EnergyPack');
const Loan = require('../models/Loan');


router.use(authenticateToken);
router.use(instituteFilter);


const generateBlockchainData = () => {
  return {
    blockchainTxHash: `0x${Math.random().toString(16).substr(2, 40)}`,
    blockNumber: Math.floor(Math.random() * 1000000),
    gasUsed: Math.floor(Math.random() * 50000),
    confirmations: 12
  };
};


router.get('/data', async (req, res) => {
  try {
    const userId = req.user._id;
    const institute = req.userInstitute;
    
    console.log('🔍 Fetching wallet data:', {
      userId: userId.toString(),
      institute,
      instituteType: typeof institute
    });


    const energyPack = await EnergyPack.findOne({
      userId,
      institute,
      status: 'active'
    }).sort({ createdAt: -1 });

    console.log('🔍 Energy pack query result:', energyPack ? 'Found' : 'Not found');
    

    const allUserPacks = await EnergyPack.find({ userId });
    console.log('🔍 All user energy packs:', allUserPacks.map(pack => ({
      id: pack._id,
      institute: pack.institute,
      instituteType: typeof pack.institute,
      status: pack.status
    })));


    const loan = await Loan.findOne({
      userId,
      institute,
      status: 'active'
    }).sort({ createdAt: -1 });


    const transactions = await CarbonTransaction.find({
      userId,
      institute
    });

    let balance = 0;
    transactions.forEach(tx => {
      if (tx.type === 'ento_transfer' || tx.type === 'carbon_offset_purchase') {
        balance += tx.amount || 0;
      } else if (tx.type === 'energy_pack_purchase' || tx.type === 'loan_payment') {
        balance -= tx.amount || 0;
      }
    });

    res.json({
      success: true,
      data: {
        energyPack,
        loan,
        balance: Math.max(0, balance),
        debug: {
          searchInstitute: institute,
          foundPacks: allUserPacks.length,
          activePack: !!energyPack
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching wallet data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


router.post('/energy-pack', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { packType, capacity, price, description } = req.body;
    const userId = req.user._id;
    const institute = req.userInstitute;
    
    console.log('🔍 Creating energy pack:', {
      userId: userId.toString(),
      institute,
      instituteType: typeof institute,
      packType,
      capacity,
      price
    });


    const energyPack = new EnergyPack({
      userId,
      institute,
      packType,
      totalCapacity: capacity,
      remainingEnergy: capacity,
      dailyUsage: 0,
      efficiency: 92,
      purchasePrice: price,
      status: 'active',
      purchaseDate: new Date(),
      lastCharged: new Date(),
      nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const savedEnergyPack = await energyPack.save({ session });
    console.log('✅ Energy pack created:', savedEnergyPack._id);


    const blockchainData = generateBlockchainData();
    const transaction = new CarbonTransaction({
      userId,
      institute,
      instituteId: institute,
      type: 'energy_pack_purchase',
      amount: price,
      description: description || `${packType} energy pack - ${capacity} kWh`,
      building: 'Residential',
      status: 'verified',
      date: new Date(),
      ...blockchainData,
      metadata: {
        energyPackId: savedEnergyPack._id,
        packType,
        capacity,
        price
      }
    });

    const savedTransaction = await transaction.save({ session });
    console.log('✅ Transaction created:', savedTransaction._id);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Energy pack purchased successfully',
      data: {
        energyPack: savedEnergyPack,
        transaction: savedTransaction
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Error purchasing energy pack:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


router.post('/loan-payment', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { loanId, amount, paymentType } = req.body;
    const userId = req.user._id;
    const institute = req.userInstitute;

    console.log('🔍 Processing loan payment:', {
      userId: userId.toString(),
      institute,
      loanId,
      amount,
      paymentType
    });


    const loan = await Loan.findOne({
      _id: loanId,
      userId,
      institute
    }).session(session);

    if (!loan) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        error: 'Loan not found'
      });
    }


    const previousBalance = loan.remainingBalance;
    loan.remainingBalance = Math.max(0, loan.remainingBalance - amount);
    
    if (loan.remainingBalance === 0) {
      loan.status = 'paid_off';
    }
    
    loan.lastPaymentDate = new Date();
    

    if (paymentType === 'regular') {
      loan.remainingPayments = Math.max(0, loan.remainingPayments - 1);
    }
    

    if (loan.remainingBalance > 0) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      loan.nextPaymentDate = nextDate.toISOString().split('T')[0];
    } else {
      loan.nextPaymentDate = null;
    }

    const savedLoan = await loan.save({ session });
    console.log('✅ Loan updated:', savedLoan._id);


    const blockchainData = generateBlockchainData();
    const transaction = new CarbonTransaction({
      userId,
      institute,
      instituteId: institute,
      type: 'loan_payment',
      amount,
      description: `${paymentType} loan payment - ${amount} ENTO`,
      building: 'Financial',
      status: 'verified',
      date: new Date(),
      ...blockchainData,
      metadata: {
        loanId: loan._id,
        paymentType,
        previousBalance,
        newBalance: loan.remainingBalance
      }
    });

    const savedTransaction = await transaction.save({ session });
    console.log('✅ Transaction created:', savedTransaction._id);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        loan: savedLoan,
        transaction: savedTransaction
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Error processing loan payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


router.post('/loan-application', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { 
      amount = 50000, 
      loanType = 'Green Energy Investment', 
      term = 36,
      interestRate = 4.5 
    } = req.body;
    const userId = req.user._id;
    const institute = req.userInstitute;

    console.log('🔍 Processing loan application:', {
      userId: userId.toString(),
      institute,
      amount,
      loanType,
      term,
      interestRate
    });


    const monthlyPayment = Math.round((amount * (interestRate/100/12)) / (1 - Math.pow(1 + (interestRate/100/12), -term)));
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const loan = new Loan({
      userId,
      institute,
      totalAmount: amount,
      remainingBalance: amount,
      interestRate,
      monthlyPayment,
      totalPayments: term,
      remainingPayments: term,
      loanType,
      status: 'active',
      applicationDate: new Date(),
      startDate: new Date(),
      nextPaymentDate: nextPaymentDate.toISOString().split('T')[0]
    });

    const savedLoan = await loan.save({ session });
    console.log('✅ Loan created:', savedLoan._id);


    const blockchainData = generateBlockchainData();
    const transaction = new CarbonTransaction({
      userId,
      institute,
      instituteId: institute,
      type: 'loan_application',
      amount,
      description: `${loanType} loan approved - ${amount} ENTO`,
      building: 'Financial',
      status: 'verified',
      date: new Date(),
      ...blockchainData,
      metadata: {
        loanId: savedLoan._id,
        loanType,
        term,
        interestRate,
        monthlyPayment
      }
    });

    const savedTransaction = await transaction.save({ session });
    console.log('✅ Transaction created:', savedTransaction._id);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Loan application approved',
      data: {
        loan: savedLoan,
        transaction: savedTransaction
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Error processing loan application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


router.post('/energy-charge', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { energyPackId, chargeAmount = 50 } = req.body;
    const userId = req.user._id;
    const institute = req.userInstitute;

    console.log('🔍 Charging energy pack:', {
      userId: userId.toString(),
      institute,
      energyPackId,
      chargeAmount
    });


    const energyPack = await EnergyPack.findOne({
      _id: energyPackId,
      userId,
      institute
    }).session(session);

    if (!energyPack) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        error: 'Energy pack not found'
      });
    }


    const previousEnergy = energyPack.remainingEnergy;
    const maxCharge = energyPack.totalCapacity - energyPack.remainingEnergy;
    const actualCharge = Math.min(chargeAmount, maxCharge);
    
    energyPack.remainingEnergy += actualCharge;
    energyPack.lastCharged = new Date();
    energyPack.efficiency = Math.min(100, energyPack.efficiency + 1);

    const savedEnergyPack = await energyPack.save({ session });
    console.log('✅ Energy pack updated:', savedEnergyPack._id);


    const blockchainData = generateBlockchainData();
    const transaction = new CarbonTransaction({
      userId,
      institute,
      instituteId: institute,
      type: 'energy_charge',
      amount: actualCharge * 2,
      description: `Energy pack charging - ${actualCharge} kWh added`,
      building: 'Residential',
      status: 'verified',
      date: new Date(),
      ...blockchainData,
      metadata: {
        energyPackId: energyPack._id,
        chargeAmount: actualCharge,
        previousEnergy,
        newEnergy: energyPack.remainingEnergy
      }
    });

    const savedTransaction = await transaction.save({ session });
    console.log('✅ Transaction created:', savedTransaction._id);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Energy pack charged with ${actualCharge} kWh`,
      data: {
        energyPack: savedEnergyPack,
        transaction: savedTransaction
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Error charging energy pack:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


router.get('/debug-data', async (req, res) => {
  try {
    const userId = req.user._id;
    const institute = req.userInstitute;
    
    console.log('🔍 Debug information:');
    console.log('  Current user:', userId);
    console.log('  Current institute:', institute);
    console.log('  Institute type:', typeof institute);
    

    const allPacks = await EnergyPack.find({ userId });
    console.log(`  Found ${allPacks.length} energy packs for user`);
    
    const packDetails = allPacks.map(pack => ({
      id: pack._id,
      institute: pack.institute,
      instituteType: typeof pack.institute,
      status: pack.status,
      createdAt: pack.createdAt
    }));
    

    const allLoans = await Loan.find({ userId });
    console.log(`  Found ${allLoans.length} loans for user`);
    
    const loanDetails = allLoans.map(loan => ({
      id: loan._id,
      institute: loan.institute,
      instituteType: typeof loan.institute,
      status: loan.status,
      remainingBalance: loan.remainingBalance,
      createdAt: loan.createdAt
    }));
    

    const exactPackMatch = await EnergyPack.find({ userId, institute });
    const exactLoanMatch = await Loan.find({ userId, institute });
    
    res.json({
      success: true,
      debug: {
        userId,
        institute,
        instituteType: typeof institute,
        energyPacks: {
          total: allPacks.length,
          exactInstituteMatch: exactPackMatch.length,
          details: packDetails
        },
        loans: {
          total: allLoans.length,
          exactInstituteMatch: exactLoanMatch.length,
          details: loanDetails
        },
        queryResults: {
          exactPackMatch: exactPackMatch.map(p => p._id),
          exactLoanMatch: exactLoanMatch.map(l => l._id)
        }
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
