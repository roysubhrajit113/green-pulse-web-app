// contexts/CarbonContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import carbonDataService from '../services/carbonDataService';
import { useAuth } from './AuthContext';

const CarbonContext = createContext();

export const useCarbon = () => {
  const context = useContext(CarbonContext);
  if (!context) {
    return {
      dashboardData: null,
      loading: true,
      error: null,
      transactions: [],
      carbonBalance: 0,
      updateWalletBalance: () => {},
      purchaseCarbonOffset: async () => ({ success: false, error: 'Context not available' }),
      recordEnergyConsumption: async () => ({ success: false, error: 'Context not available' }),
      getEnergyConsumptionData: async () => ({ current: 2847, monthly: [2850, 3200, 2800, 3100, 2900, 2847], efficiency: [85, 88, 82, 90, 87, 92], buildings: { 'Building A': 35, 'Building B': 28, 'Building C': 22, 'Building D': 15 } }),
      getTransactionHistory: async () => [],
      getEntoTransactions: async () => [],
      submitTransaction: async () => ({ success: false }),
      verifyTransaction: async () => ({ success: false, verified: false }),
      refreshData: () => {}
    };
  }
  return context;
};

export const CarbonProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [carbonBalance, setCarbonBalance] = useState(0);

  // ✅ NEW: Get institute ID helper
  const getInstituteId = () => {
    if (!user) return null;
    return typeof user.institute === 'object' ? user.institute.name : user.institute;
  };

  // Load dashboard data from API (institute-filtered)
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading dashboard data from API...');
      const data = await carbonDataService.getDashboardData();
      console.log('Dashboard data received:', data);
      
      if (data && data.instituteDisplayName) {
        console.log('✅ Successfully loaded dashboard data:', {
          instituteName: data.instituteDisplayName,
          dataSource: data.dataSource,
          hasRealData: data.dataSource === 'mongodb',
          departmentCount: data.departmentData?.length || 0,
          co2Savings: data.co2Savings
        });
        setDashboardData(data);
        
        if (data.dataSource === 'sample') {
          setError('Using sample data - no real MongoDB data found for your institute');
        }
      } else {
        console.warn('No institute data received');
        setError('Unable to load institute data - please ensure your institute has carbon data in the system');
        setDashboardData(null);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (err.message.includes('404') || err.message.includes('No carbon data found')) {
        setError('No carbon data found for your institute. Please contact administrator to set up data.');
      } else {
        setError(`Failed to load data: ${err.message}`);
      }
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Load transaction history
  const loadTransactionHistory = async () => {
    const instituteId = getInstituteId();
    if (!instituteId) return;

    try {
      console.log('Loading transaction history...');
      const transactionData = await carbonDataService.getTransactionHistory(instituteId, 50, 0);
      setTransactions(transactionData);
      
      // Also load carbon balance
      const balance = await carbonDataService.getCarbonBalance(instituteId);
      setCarbonBalance(balance);
      
      console.log('✅ Transaction history loaded:', transactionData.length, 'transactions');
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      setTransactions([]);
      setCarbonBalance(0);
    }
  };

  // ✅ NEW: Get transaction history (public method)
  const getTransactionHistory = async (limit = 50, offset = 0) => {
    const instituteId = getInstituteId();
    if (!instituteId) return [];

    try {
      return await carbonDataService.getTransactionHistory(instituteId, limit, offset);
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  };

  // ✅ NEW: Get ENTO transactions (public method)
  const getEntoTransactions = async (limit = 50, offset = 0) => {
    const instituteId = getInstituteId();
    if (!instituteId) return [];

    try {
      return await carbonDataService.getEntoTransactions(instituteId, limit, offset);
    } catch (error) {
      console.error('Error getting ENTO transactions:', error);
      return [];
    }
  };

  // ✅ NEW: Submit transaction
  const submitTransaction = async (transactionData) => {
    const instituteId = getInstituteId();
    if (!instituteId) return { success: false, error: 'No institute ID' };

    try {
      const result = await carbonDataService.submitTransaction({
        ...transactionData,
        instituteId,
        userId: user._id
      });
      
      // Reload transaction history
      await loadTransactionHistory();
      
      return result;
    } catch (error) {
      console.error('Error submitting transaction:', error);
      return { success: false, error: error.message };
    }
  };

  // ✅ NEW: Verify transaction
  const verifyTransaction = async (txHash) => {
    try {
      return await carbonDataService.verifyTransaction(txHash);
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { success: false, verified: false };
    }
  };

  // Update wallet balance
  const updateWalletBalance = async (amount, type = 'credit') => {
    try {
      await carbonDataService.updateWalletBalance(amount, type);
      loadDashboardData();
      loadTransactionHistory(); // ✅ Reload transactions
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      setError(error.message);
    }
  };

  // Purchase carbon offset
  const purchaseCarbonOffset = async (amount, description = 'Carbon offset purchase') => {
    try {
      const result = await carbonDataService.purchaseCarbonOffset(amount, description);
      loadDashboardData();
      loadTransactionHistory(); // ✅ Reload transactions
      return { success: true, ...result };
    } catch (err) {
      console.error('Error purchasing carbon offset:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Record energy consumption
  const recordEnergyConsumption = async (consumption, building = 'Building A') => {
    try {
      const result = await carbonDataService.recordEnergyConsumption(consumption, building);
      loadDashboardData();
      loadTransactionHistory(); // ✅ Reload transactions
      return { success: true, ...result };
    } catch (err) {
      console.error('Error recording energy consumption:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Get energy consumption data for charts
  const getEnergyConsumptionData = async () => {
    try {
      return await carbonDataService.getEnergyConsumptionData();
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
  };

  // Get weekly energy data for institutes
  const getWeeklyEnergyData = async () => {
    try {
      return await carbonDataService.getWeeklyEnergyData();
    } catch (error) {
      console.error('Error getting weekly energy data:', error);
      return carbonDataService.getFallbackWeeklyEnergyData();
    }
  };

  // Refresh data
  const refreshData = () => {
    loadDashboardData();
    loadTransactionHistory();
  };

  // Load dashboard data when component mounts or when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Loading dashboard data for user:', user.email, 'institute:', user.institute);
      loadDashboardData();
      loadTransactionHistory();
    } else if (!isAuthenticated) {
      // Clear data when user logs out
      setDashboardData(null);
      setTransactions([]);
      setCarbonBalance(0);
      setError(null);
      setLoading(false);
    }
  }, [user, isAuthenticated]); // Reload data whenever user changes

  const value = {
    dashboardData,
    loading,
    error,
    transactions,
    carbonBalance,
    updateWalletBalance,
    purchaseCarbonOffset,
    recordEnergyConsumption,
    getEnergyConsumptionData,
    getWeeklyEnergyData,
    getTransactionHistory,
    getEntoTransactions,
    submitTransaction,
    verifyTransaction,
    refreshData
  };

  return (
    <CarbonContext.Provider value={value}>
      {children}
    </CarbonContext.Provider>
  );
};
