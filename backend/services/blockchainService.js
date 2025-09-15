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

      this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
      

      const deploymentsPath = path.join(__dirname, '../../deploy/deployments/localhost.json');
      if (fs.existsSync(deploymentsPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
        this.contractAddresses = deploymentData.addresses || {};
        

        const artifactsPath = path.join(__dirname, '../../artifacts/contracts');
        

        if (this.contractAddresses.EnergyToken) {
          const tokenArtifact = require(path.join(artifactsPath, 'EnergyToken.sol/EnergyToken.json'));
          this.contracts.token = new ethers.Contract(
            this.contractAddresses.EnergyToken,
            tokenArtifact.abi,
            this.provider
          );
        }
        

        console.log('Blockchain service initialized with contracts:', Object.keys(this.contracts));
      } else {
        console.error('Deployment file not found. Run deployment script first.');
      }
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
    }
  }


  async storeTransaction(transaction) {
    try {
      const { userId, institute, type, amount, description, building, consumption, blockchainTxHash } = transaction;
      

      let carbonData = await CarbonData.findOne({ userId, institute });
      
      if (!carbonData) {

        carbonData = new CarbonData({
          userId,
          institute,
        });
      }
      

      carbonData.transactions.push({
        type,
        amount,
        description,
        building,
        consumption,
        blockchainTxHash,
        date: new Date()
      });
      

      if (type === 'energy_consumption') {
        carbonData.currentEnergyConsumption += consumption || 0;
        

        if (building) {
          const buildingIndex = carbonData.buildingData.findIndex(b => b.buildingName === building);
          if (buildingIndex >= 0) {
            carbonData.buildingData[buildingIndex].consumption += consumption || 0;
            carbonData.buildingData[buildingIndex].lastUpdated = new Date();
          }
        }
      }
      

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


  async getTransactionByHash(txHash) {
    try {

      const txReceipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!txReceipt) {
        return {
          success: false,
          error: 'Transaction not found on blockchain'
        };
      }
      

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