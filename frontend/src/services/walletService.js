import carbonDataService from './carbonDataService';

class WalletService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.walletEndpoint = `${this.baseUrl}/wallet`;
  }


  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }


  async getWalletData() {
    try {
      console.log('🔍 Fetching wallet data...');
      
      const response = await fetch(`${this.walletEndpoint}/data`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Wallet data received:', result);
      
      return result.success ? result.data : this.getFallbackData();
    } catch (error) {
      console.error('❌ Error fetching wallet data:', error);
      return this.getFallbackData();
    }
  }


  async purchaseEnergyPack(packData) {
    try {
      console.log('🔍 Purchasing energy pack:', packData);
      
      const response = await fetch(`${this.walletEndpoint}/energy-pack`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(packData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Energy pack purchased:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error purchasing energy pack:', error);
      throw error;
    }
  }


  async makeLoanPayment(paymentData) {
    try {
      console.log('🔍 Making loan payment:', paymentData);
      
      const response = await fetch(`${this.walletEndpoint}/loan-payment`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Loan payment processed:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error making loan payment:', error);
      throw error;
    }
  }


  async applyForLoan(loanData = {}) {
    try {
      console.log('🔍 Applying for loan:', loanData);
      
      const response = await fetch(`${this.walletEndpoint}/loan-application`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(loanData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Loan application processed:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error applying for loan:', error);
      throw error;
    }
  }


  async chargeEnergyPack(chargeData) {
    try {
      console.log('🔍 Charging energy pack:', chargeData);
      
      const response = await fetch(`${this.walletEndpoint}/energy-charge`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(chargeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Energy pack charged:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error charging energy pack:', error);
      throw error;
    }
  }


  getFallbackData() {
    return {
      energyPack: null,
      loan: null,
      balance: 0
    };
  }
}

const walletService = new WalletService();
export default walletService;
