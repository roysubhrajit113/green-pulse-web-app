// Transaction Service for GreenPulse Carbon Transactions

class BlockchainService {
  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  }

  // Get transaction history from backend
  async getTransactionHistory(instituteId, limit = 50, offset = 0) {
    try {
      console.log(`Fetching transaction history for: ${instituteId}`);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiUrl}/api/carbon-data/transactions/${instituteId}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get transaction history');
      }
      
      console.log(`✅ Fetched ${result.transactions.length} transactions`);
      
      return {
        success: true,
        transactions: result.transactions || [],
        total: result.total || 0
      };
    } catch (error) {
      console.error('❌ Error fetching transaction history:', error);
      return {
        success: false,
        error: error.message,
        transactions: []
      };
    }
  }
  
  // Get ENTO transactions from backend
  async getEntoTransactions(instituteId, limit = 50, offset = 0) {
    try {
      console.log(`Fetching ENTO transactions for: ${instituteId}`);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiUrl}/api/carbon-data/ento-transactions/${instituteId}?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get ENTO transactions');
      }
      
      console.log(`✅ Fetched ${result.transactions.length} ENTO transactions`);
      
      return {
        success: true,
        transactions: result.transactions || [],
        total: result.total || 0
      };
    } catch (error) {
      console.error('❌ Error fetching ENTO transactions:', error);
      return {
        success: false,
        error: error.message,
        transactions: []
      };
    }
  }

  // Submit transaction to database (renamed from submitCarbonTransaction)
  async submitTransaction(transactionData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiUrl}/api/carbon-data/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify(transactionData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit transaction');
      }
      
      return {
        success: true,
        transaction: result.transaction || {},
        data: result.data || null
      };
    } catch (error) {
      console.error('❌ Error submitting transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get carbon credit balance for institute
  async getCarbonCreditBalance(instituteId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${this.apiUrl}/api/carbon-data/balance/${instituteId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        balance: result.balance || 0,
        currency: 'ENTO',
        lastUpdated: result.lastUpdated || new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting carbon credit balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

export default blockchainService;
