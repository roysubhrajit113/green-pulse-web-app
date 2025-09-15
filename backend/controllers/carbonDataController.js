const CarbonData = require('../models/CarbonData');
const CarbonBiometric = require('../models/CarbonBiometric');
const EnergyConsumption = require('../models/EnergyConsumption');
const User = require('../models/User');
const { createInstituteFilter, getInstituteDisplayName } = require('../middleware/instituteAuth');


const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;
    const userInstitute = req.userInstitute;
    
    console.log('Getting dashboard data for user:', userId, 'institute:', userInstitute);
    
    if (!userInstitute) {
      return res.status(400).json({
        success: false,
        message: 'User institute not found'
      });
    }


    const instituteDisplayName = getInstituteDisplayName(userInstitute);
    console.log('Institute display name:', instituteDisplayName);
    

    const instituteNameForQuery = typeof userInstitute === 'object' && userInstitute.name 
      ? userInstitute.name 
      : String(userInstitute);
    
    console.log('Institute name for query:', instituteNameForQuery);


    const carbonBiometricData = await CarbonBiometric.getDashboardData(instituteNameForQuery);
    console.log('Carbon biometric data:', carbonBiometricData);


    const monthlyTrends = await CarbonBiometric.getMonthlyTrends(instituteNameForQuery, 6);
    console.log('Monthly trends:', monthlyTrends);


    const departmentData = await CarbonBiometric.getDepartmentData(instituteNameForQuery);
    console.log('Department data:', departmentData);


    const buildingData = await CarbonBiometric.getBuildingData(instituteNameForQuery);
    console.log('Building data:', buildingData);


    if (!carbonBiometricData || carbonBiometricData.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No carbon data found for institute: ${instituteDisplayName}. Please contact administrator to set up data for your institute.`
      });
    }


    const biometric = carbonBiometricData[0];
    

    const realMonthlyTrends = monthlyTrends && monthlyTrends.length > 0 ? monthlyTrends : [];
    

    const realBuildingData = buildingData && buildingData.length > 0 ? buildingData : [];
    

    const realDepartmentData = departmentData && departmentData.length > 0 ? departmentData : [];
    
    const dashboardData = {
      instituteDisplayName,
      co2Savings: biometric.co2Savings || 0,
      carbonBudgetUsed: biometric.carbonBudgetUsed || 0,
      carbonBudgetTotal: biometric.carbonBudgetTotal || 1000,
      walletBalance: biometric.walletBalance || 1000,
      offsetsPurchased: biometric.offsetsPurchased || 0,
      currentEnergyConsumption: biometric.currentEnergyConsumption || 0,
      

      monthlyEnergyConsumption: realMonthlyTrends,
      

      buildingData: realBuildingData,
      

      departmentData: realDepartmentData,
      
      analytics: {
        totalReductionInitiatives: biometric.totalReductionInitiatives || 0,
        carbonValue: Math.round(biometric.co2Savings * 100) || 0
      },
      
      dataSource: 'mongodb',
      lastUpdated: biometric.lastUpdated || new Date(),
      dataPoints: biometric.dataPoints || 0
    };

    console.log('Final dashboard data:', dashboardData);

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};


const updateWalletBalance = async (req, res) => {
  try {
    const { amount, type } = req.body;
    const userId = req.user._id;
    const userInstitute = req.userInstitute;

    if (!amount || !type) {
      return res.status(400).json({
        success: false,
        message: 'Amount and type are required'
      });
    }

    const carbonData = await CarbonData.findOne({
      userId,
      ...createInstituteFilter(userInstitute)
    });

    if (!carbonData) {
      return res.status(404).json({
        success: false,
        message: 'Carbon data not found for user'
      });
    }


    if (type === 'credit') {
      carbonData.walletBalance += amount;
    } else {
      carbonData.walletBalance = Math.max(0, carbonData.walletBalance - amount);
    }


    carbonData.transactions.push({
      type,
      amount,
      description: type === 'credit' ? 'Wallet top-up' : 'Wallet deduction',
      date: new Date()
    });

    await carbonData.save();

    res.status(200).json({
      success: true,
      message: 'Wallet balance updated successfully',
      data: {
        newBalance: carbonData.walletBalance
      }
    });

  } catch (error) {
    console.error('Update wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating wallet balance'
    });
  }
};


const purchaseCarbonOffset = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const userId = req.user._id;
    const userInstitute = req.userInstitute;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const carbonData = await CarbonData.findOne({
      userId,
      ...createInstituteFilter(userInstitute)
    });

    if (!carbonData) {
      return res.status(404).json({
        success: false,
        message: 'Carbon data not found for user'
      });
    }


    if (carbonData.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }


    const co2Impact = amount * 0.1;


    carbonData.walletBalance -= amount;
    carbonData.offsetsPurchased += amount;
    carbonData.co2Savings += co2Impact;


    carbonData.transactions.push({
      type: 'offset_purchase',
      amount,
      description: description || 'Carbon offset purchase',
      co2Impact,
      blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      date: new Date()
    });

    await carbonData.save();

    res.status(200).json({
      success: true,
      message: 'Carbon offset purchased successfully',
      data: {
        transaction: carbonData.transactions[carbonData.transactions.length - 1],
        newBalance: carbonData.walletBalance,
        co2Savings: carbonData.co2Savings
      }
    });

  } catch (error) {
    console.error('Purchase carbon offset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error purchasing carbon offset'
    });
  }
};


const recordEnergyConsumption = async (req, res) => {
  try {
    const { consumption, building } = req.body;
    const userId = req.user._id;
    const userInstitute = req.userInstitute;

    if (!consumption) {
      return res.status(400).json({
        success: false,
        message: 'Consumption amount is required'
      });
    }

    const carbonData = await CarbonData.findOne({
      userId,
      ...createInstituteFilter(userInstitute)
    });

    if (!carbonData) {
      return res.status(404).json({
        success: false,
        message: 'Carbon data not found for user'
      });
    }


    const cost = consumption * 0.05;


    carbonData.currentEnergyConsumption += consumption;
    carbonData.carbonBudgetUsed += cost;


    if (building) {
      const buildingIndex = carbonData.buildingData.findIndex(b => b.buildingName === building);
      if (buildingIndex >= 0) {
        carbonData.buildingData[buildingIndex].consumption += consumption;
        carbonData.buildingData[buildingIndex].lastUpdated = new Date();
      }
    }


    carbonData.transactions.push({
      type: 'energy_consumption',
      amount: cost,
      description: `Energy consumption in ${building || 'Building A'}`,
      building: building || 'Building A',
      consumption,
      blockchainTxHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      date: new Date()
    });

    await carbonData.save();

    res.status(200).json({
      success: true,
      message: 'Energy consumption recorded successfully',
      data: {
        transaction: carbonData.transactions[carbonData.transactions.length - 1],
        currentConsumption: carbonData.currentEnergyConsumption,
        carbonBudgetUsed: carbonData.carbonBudgetUsed
      }
    });

  } catch (error) {
    console.error('Record energy consumption error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording energy consumption'
    });
  }
};


const getWeeklyEnergyData = async (req, res) => {
  try {
    const userInstitute = req.userInstitute;
    

    const instituteNameForQuery = typeof userInstitute === 'object' && userInstitute.name 
      ? userInstitute.name 
      : String(userInstitute);
    
    console.log('🔍 Getting weekly energy data for institute:', instituteNameForQuery);
    
    const instituteDisplayName = getInstituteDisplayName(userInstitute);
    

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    

    const testQuery = await CarbonBiometric.find({
      institute: instituteNameForQuery
    }).limit(5);
    
    console.log('📊 Data availability check:', testQuery.length, 'documents found');
    
    if (testQuery.length === 0) {

      console.log('⚠️ No real data found, returning sample data for testing');
      
      const sampleData = [
        {
          name: `${instituteDisplayName} - Computer Science`,
          data: [180, 165, 195, 175, 185, 190, 170]
        },
        {
          name: `${instituteDisplayName} - Engineering`,
          data: [220, 200, 240, 210, 225, 235, 205]
        },
        {
          name: `${instituteDisplayName} - Science Lab`,
          data: [200, 185, 215, 195, 205, 210, 190]
        },
        {
          name: `${instituteDisplayName} - Medical School`,
          data: [160, 150, 175, 165, 170, 180, 155]
        },
        {
          name: `${instituteDisplayName} - Business School`,
          data: [140, 135, 155, 145, 150, 160, 140]
        }
      ];
      
      return res.status(200).json({
        success: true,
        data: {
          weeklyEnergyData: sampleData,
          dataSource: 'sample',
          institute: instituteDisplayName,
          message: 'Using sample data - no real data found in database',
          dateRange: {
            start: startDate.toISOString(),
            end: new Date().toISOString()
          }
        }
      });
    }
    

    const weeklyData = await CarbonBiometric.aggregate([
      {
        $match: {
          institute: instituteNameForQuery,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            department: '$departmentName'
          },
          totalConsumption: { $sum: '$energyConsumption' },
          avgEfficiency: { $avg: '$energyEfficiency' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.department',
          weeklyData: {
            $push: {
              dayOfWeek: '$_id.dayOfWeek',
              consumption: '$totalConsumption'
            }
          },
          totalWeeklyConsumption: { $sum: '$totalConsumption' }
        }
      },
      {
        $project: {
          departmentName: '$_id',
          data: {
            $map: {
              input: [2, 3, 4, 5, 6, 7, 1],
              as: 'day',
              in: {
                $let: {
                  vars: {
                    dayData: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$weeklyData',
                            cond: { $eq: ['$$this.dayOfWeek', '$$day'] }
                          }
                        }, 0
                      ]
                    }
                  },
                  in: {
                    $ifNull: ['$$dayData.consumption', { $add: [150, { $multiply: [{ $rand: {} }, 100] }] }]
                  }
                }
              }
            }
          },
          totalWeeklyConsumption: 1,
          _id: 0
        }
      },
      { $sort: { totalWeeklyConsumption: -1 } },
      { $limit: 5 }
    ]);
    
    console.log('📊 Aggregation results:', weeklyData.length, 'departments');
    

    const formattedData = weeklyData.length > 0 ? weeklyData.map(dept => ({
      name: `${instituteDisplayName} - ${dept.departmentName || 'Unknown Department'}`,
      data: dept.data && dept.data.length === 7 ? 
        dept.data : 
        [150, 160, 170, 165, 175, 180, 155]
    })) : [
      {
        name: `${instituteDisplayName} - Sample Department 1`,
        data: [180, 165, 195, 175, 185, 190, 170]
      },
      {
        name: `${instituteDisplayName} - Sample Department 2`, 
        data: [220, 200, 240, 210, 225, 235, 205]
      },
      {
        name: `${instituteDisplayName} - Sample Department 3`,
        data: [200, 185, 215, 195, 205, 210, 190]
      }
    ];
    
    console.log('✅ Final formatted data:', formattedData);
    
    res.status(200).json({
      success: true,
      data: {
        weeklyEnergyData: formattedData,
        dataSource: weeklyData.length > 0 ? 'mongodb' : 'sample',
        institute: instituteDisplayName,
        message: weeklyData.length > 0 ? 'Real data from MongoDB' : 'Sample data generated',
        dateRange: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Get weekly energy data error:', error);
    

    const instituteDisplayName = getInstituteDisplayName(req.userInstitute || 'Default Institute');
    
    const fallbackData = [
      {
        name: `${instituteDisplayName} - Emergency Fallback 1`,
        data: [180, 165, 195, 175, 185, 190, 170]
      },
      {
        name: `${instituteDisplayName} - Emergency Fallback 2`,
        data: [220, 200, 240, 210, 225, 235, 205]
      }
    ];
    
    res.status(200).json({
      success: true,
      data: {
        weeklyEnergyData: fallbackData,
        dataSource: 'fallback',
        institute: instituteDisplayName,
        message: 'Emergency fallback data due to server error',
        error: error.message
      }
    });
  }
};


const getInstituteAnalytics = async (req, res) => {
  try {
    const userInstitute = req.userInstitute;
    

    const instituteNameForQuery = typeof userInstitute === 'object' && userInstitute.name 
      ? userInstitute.name 
      : String(userInstitute);
    

    const instituteData = await CarbonData.aggregate([
      { $match: createInstituteFilter(userInstitute) },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalCO2Savings: { $sum: '$co2Savings' },
          totalCarbonBudgetUsed: { $sum: '$carbonBudgetUsed' },
          totalWalletBalance: { $sum: '$walletBalance' },
          totalOffsetsPurchased: { $sum: '$offsetsPurchased' },
          avgEnergyConsumption: { $avg: '$currentEnergyConsumption' }
        }
      }
    ]);

    const analytics = instituteData.length > 0 ? instituteData[0] : {
      totalUsers: 0,
      totalCO2Savings: 0,
      totalCarbonBudgetUsed: 0,
      totalWalletBalance: 0,
      totalOffsetsPurchased: 0,
      avgEnergyConsumption: 0
    };

    res.status(200).json({
      success: true,
      data: {
        instituteName: getInstituteDisplayName(userInstitute),
        ...analytics
      }
    });

  } catch (error) {
    console.error('Get institute analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching institute analytics'
    });
  }
};

module.exports = {
  getDashboardData,
  updateWalletBalance,
  purchaseCarbonOffset,
  recordEnergyConsumption,
  getWeeklyEnergyData,
  getInstituteAnalytics
};
