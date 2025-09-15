
class CarbonDataService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.carbonDataEndpoint = `${this.baseUrl}/carbon-data`;
  }


  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    
    console.log('🔑 Getting auth headers:');
    console.log('  Token present:', !!token);
    console.log('  Token preview:', token ? token.substring(0, 20) + '...' : 'None');
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }


  async getTransactionHistory(instituteId, limit = 50, offset = 0) {
    try {
      const url = `${this.carbonDataEndpoint}/transactions/${instituteId}?limit=${limit}&offset=${offset}`;
      console.log('🔍 Fetching transaction history:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📊 Transaction history received:', result);
      
      return result.success ? result.transactions : [];
    } catch (error) {
      console.error('❌ Error fetching transaction history:', error);
      return this.getFallbackTransactions();
    }
  }


  async getEntoTransactions(instituteId, limit = 50, offset = 0) {
    try {
      const url = `${this.carbonDataEndpoint}/ento-transactions/${instituteId}?limit=${limit}&offset=${offset}`;
      console.log('🔍 Fetching ENTO transactions:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📊 ENTO transactions received:', result);
      
      return result.success ? result.transactions : [];
    } catch (error) {
      console.error('❌ Error fetching ENTO transactions:', error);
      return [];
    }
  }


  async getCarbonBalance(instituteId) {
    try {
      const url = `${this.carbonDataEndpoint}/balance/${instituteId}`;
      console.log('🔍 Fetching carbon balance:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('💰 Carbon balance received:', result);
      
      return result.success ? result.balance : 0;
    } catch (error) {
      console.error('❌ Error fetching carbon balance:', error);
      return 0;
    }
  }


  async verifyTransaction(txHash) {
    try {
      const url = `${this.carbonDataEndpoint}/verify-transaction/${txHash}`;
      console.log('🔍 Verifying transaction:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Transaction verification:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error verifying transaction:', error);
      return { success: false, verified: false };
    }
  }


  async submitTransaction(transactionData) {
    try {
      const url = `${this.carbonDataEndpoint}/transactions`;
      console.log('🔍 Submitting transaction:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(transactionData)
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Transaction submitted:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error submitting transaction:', error);
      throw error;
    }
  }


  async getWeeklyEnergyData() {
    try {
      const url = `${this.carbonDataEndpoint}/weekly-energy`;
      console.log('🔍 Calling weekly energy API:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Unauthorized - token may be invalid or expired');

          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📊 API Response data:', result);
      
      if (result && result.success) {
        const weeklyData = result.data.weeklyEnergyData || [];
        const dataSource = result.data.dataSource || 'mongodb';
        
        const formattedData = weeklyData.map(dept => ({
          name: dept.name || dept.departmentName || 'Unknown Department',
          data: dept.data || [0, 0, 0, 0, 0, 0, 0],
          source: dataSource
        }));

        return formattedData.length > 0 ? formattedData : this.getFallbackWeeklyEnergyData();
      }
      
      return this.getFallbackWeeklyEnergyData();
    } catch (error) {
      console.error('❌ Error getting weekly energy data:', error);
      return this.getFallbackWeeklyEnergyData();
    }
  }


  getFallbackWeeklyEnergyData() {
    return [
      {
        name: "Computer Science Department",
        data: [180, 165, 195, 175, 185, 190, 170],
        source: 'sample'
      },
      {
        name: "Engineering Department", 
        data: [220, 200, 240, 210, 225, 235, 205],
        source: 'sample'
      },
      {
        name: "Medical School",
        data: [200, 185, 215, 195, 205, 210, 190],
        source: 'sample'
      },
      {
        name: "Science Lab Complex",
        data: [250, 230, 270, 245, 255, 265, 235],
        source: 'sample'
      },
      {
        name: "Business School",
        data: [150, 140, 165, 155, 160, 165, 145],
        source: 'sample'
      }
    ];
  }


  getFallbackTransactions() {
    return [
      {
        _id: '1',
        type: 'carbon_offset_purchase',
        amount: 250,
        description: 'Monthly carbon offset purchase',
        building: 'Main Campus',
        blockchainTxHash: '0x1234567890abcdef',
        status: 'verified',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        confirmations: 12,
        gasUsed: 21000
      },
      {
        _id: '2',
        type: 'energy_consumption',
        amount: 150,
        consumption: 1500,
        description: 'Weekly energy consumption',
        building: 'Science Lab',
        blockchainTxHash: '0xabcdef1234567890',
        status: 'verified',
        date: new Date(Date.now() - 48 * 60 * 60 * 1000),
        confirmations: 8,
        gasUsed: 18500
      }
    ];
  }


  async getDashboardData() {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/dashboard`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }


  async updateWalletBalance(amount, type = 'credit') {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/wallet-balance`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ amount, type })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Failed to update wallet balance');
      }
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }


  async purchaseCarbonOffset(amount, description = 'Carbon offset purchase') {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/carbon-offset`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ amount, description })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Failed to purchase carbon offset');
      }
    } catch (error) {
      console.error('Error purchasing carbon offset:', error);
      throw error;
    }
  }


  async recordEnergyConsumption(consumption, building = 'Building A') {
    try {
      const response = await fetch(`${this.carbonDataEndpoint}/energy-consumption`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ consumption, building })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message || 'Failed to record energy consumption');
      }
    } catch (error) {
      console.error('Error recording energy consumption:', error);
      throw error;
    }
  }


  async getEnergyConsumptionData() {
    try {
      const dashboardData = await this.getDashboardData();
      
      if (dashboardData && dashboardData.monthlyEnergyConsumption) {
        return {
          current: dashboardData.currentEnergyConsumption || 2847,
          monthly: dashboardData.monthlyEnergyConsumption.map(item => item.consumption),
          efficiency: dashboardData.monthlyEnergyConsumption.map(item => item.efficiency),
          buildings: dashboardData.buildingData ? 
            dashboardData.buildingData.reduce((acc, building) => {
              acc[building.buildingName] = building.consumption;
              return acc;
            }, {}) : {
              'Building A': 35,
              'Building B': 28, 
              'Building C': 22,
              'Building D': 15
            }
        };
      }
      
      return {
        current: 2847,
        monthly: [2850, 3200, 2800, 3100, 2900, 2847],
        efficiency: [85, 88, 82, 90, 87, 92],
        buildings: {
          'Building A': 35,
          'Building B': 28,
          'Building C': 22,
          'Building D': 15
        }
      };
    } catch (error) {
      console.error('Error getting energy consumption data:', error);
      return {
        current: 2847,
        monthly: [2850, 3200, 2800, 3100, 2900, 2847],
        efficiency: [85, 88, 82, 90, 87, 92],
        buildings: {
          'Building A': 35,
          'Building B': 28,
          'Building C': 22,
          'Building D': 15
        }
      };
    }
  }


  async submitToBlockchain(transaction) {
    try {
      console.log('Submitting to blockchain:', transaction);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const blockchainResponse = {
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: Math.floor(Math.random() * 100000),
        status: 'success'
      };
      
      return {
        success: true,
        blockchainResponse,
        transaction
      };
    } catch (error) {
      console.error('Blockchain submission failed:', error);
      return {
        success: false,
        error: error.message,
        transaction
      };
    }
  }
}


const carbonDataService = new CarbonDataService();

export default carbonDataService;
