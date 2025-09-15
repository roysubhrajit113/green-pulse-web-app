const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const CarbonData = require('../models/CarbonData');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contracts = {};
    this.initialize();
  }

  async initialize() {
    try {
      // Connect to the blockchain (local Hardhat node by default)
      this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
      
      // Load contract addresses from deployment file
      const deploymentsPath = path.join(__dirname, '../../deploy/deployments/localhost.json');
      if (fs.existsSync(deploymentsPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
        this.contractAddresses = deploymentData.addresses || {};
        
        // Load contract ABIs from artifacts
        const artifactsPath = path.join(__dirname, '../../artifacts/contracts');
        
        // Initialize EnergyToken contract
        if (this.contractAddresses.EnergyToken) {
          const tokenArtifact = require(path.join(artifactsPath, 'EnergyToken.sol/EnergyToken.json'));
          this.contracts.token = new ethers.Contract(
            this.contractAddresses.EnergyToken,
            tokenArtifact.abi,
            this.provider
          );
        }
        
        // Initialize other contracts as needed
        console.log('Blockchain service initialized with contracts:', Object.keys(this.contracts));
      } else {
        console.error('Deployment file not found. Run deployment script first.');
      }
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
    }
  }

  // Store blockchain transaction in MongoDB
  async storeTransaction(transaction) {
    try {
      const { userId, institute, type, amount, description, building, consumption, blockchainTxHash } = transaction;
      
      // Find user's carbon data record
      let carbonData = await CarbonData.findOne({ userId, institute });
      
      if (!carbonData) {
        // Create new carbon data record if not exists
        carbonData = new CarbonData({
          userId,
          institute,
        });
      }
      
      // Add transaction to the record
      carbonData.transactions.push({
        type,
        amount,
        description,
        building,
        consumption,
        blockchainTxHash,
        date: new Date()
      });
      
      // Update other relevant fields based on transaction type
      if (type === 'energy_consumption') {
        carbonData.currentEnergyConsumption += consumption || 0;
        
        // Update building data if specified
        if (building) {
          const buildingIndex = carbonData.buildingData.findIndex(b => b.buildingName === building);
          if (buildingIndex >= 0) {
            carbonData.buildingData[buildingIndex].consumption += consumption || 0;
            carbonData.buildingData[buildingIndex].lastUpdated = new Date();
          }
        }
      }
      
      // Save the updated record
      await carbonData.save();
      
      return {
        success: true,
        data: carbonData
      };
    } catch (error) {
      console.error('Error storing blockchain transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get blockchain transaction by hash
  async getTransactionByHash(txHash) {
    try {
      // Query the blockchain for transaction details
      const txReceipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!txReceipt) {
        return {
          success: false,
          error: 'Transaction not found on blockchain'
        };
      }
      
      // Find the transaction in MongoDB
      const carbonData = await CarbonData.findOne({
        'transactions.blockchainTxHash': txHash
      });
      
      const transaction = carbonData ? 
        carbonData.transactions.find(tx => tx.blockchainTxHash === txHash) : 
        null;
      
      return {
        success: true,
        blockchainData: txReceipt,
        mongoData: transaction
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new BlockchainService();