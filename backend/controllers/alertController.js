const mongoose = require('mongoose');
const Building = require('../models/Building');
const MeterData = require('../models/MeterData');
const Alert = require('../models/Alert');
const User = require('../models/User');


const DEFAULT_THRESHOLD = 1000;


const generateAlertsForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }


    const userInstitute = typeof user.institute === 'string' 
      ? user.institute 
      : user.institute.name || user.institute.label;

    if (!userInstitute) {
      return res.status(400).json({
        success: false,
        message: 'User institute not found'
      });
    }


    const threshold = req.body.threshold || DEFAULT_THRESHOLD;


    const buildings = await Building.find({ institute: userInstitute });
    
    if (buildings.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No buildings found for institute: ${userInstitute}`
      });
    }

    const buildingIds = buildings.map(building => building.building_id);
    const alerts = [];


    for (const building of buildings) {

      const latestMeterData = await MeterData.findOne(
        { building_id: building.building_id }
      ).sort({ timestamp: -1 });

      if (latestMeterData && latestMeterData.meter_reading > threshold) {

        const existingAlert = await Alert.findOne({
          user_id: userId,
          building_id: building.building_id,
          status: 'active'
        });

        if (!existingAlert) {

          let severity = 'medium';
          const exceedanceRatio = latestMeterData.meter_reading / threshold;
          
          if (exceedanceRatio > 3) severity = 'critical';
          else if (exceedanceRatio > 2) severity = 'high';
          else if (exceedanceRatio > 1.5) severity = 'medium';
          else severity = 'low';


          const newAlert = new Alert({
            user_id: userId,
            building_id: building.building_id,
            building_name: building.assigned_name,
            institute: userInstitute,
            meter_reading: latestMeterData.meter_reading,
            threshold: threshold,
            severity: severity,
            message: `High energy consumption detected in ${building.assigned_name}. Current reading: ${latestMeterData.meter_reading}, Threshold: ${threshold}`,
            timestamp: new Date()
          });

          const savedAlert = await newAlert.save();
          alerts.push(savedAlert);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${alerts.length} new alerts for ${userInstitute}`,
      data: {
        alerts,
        institute: userInstitute,
        buildingsChecked: buildings.length,
        threshold: threshold
      }
    });

  } catch (error) {
    console.error('Error generating alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating alerts',
      error: error.message
    });
  }
};


const getUserAlerts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status = 'active', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const alerts = await Alert.find({ 
      user_id: userId, 
      status: status 
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const totalAlerts = await Alert.countDocuments({ 
      user_id: userId, 
      status: status 
    });

    res.status(200).json({
      success: true,
      data: {
        alerts,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalAlerts / limit),
          total_alerts: totalAlerts,
          has_next: skip + alerts.length < totalAlerts,
          has_prev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
};


const acknowledgeAlert = async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.user._id;

    const alert = await Alert.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(alertId), 
        user_id: new mongoose.Types.ObjectId(userId) 
      },
      { 
        status: 'acknowledged',
        acknowledged_at: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: alert
    });

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error acknowledging alert',
      error: error.message
    });
  }
};


const resolveAlert = async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.user._id;

    const alert = await Alert.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(alertId), 
        user_id: new mongoose.Types.ObjectId(userId) 
      },
      { 
        status: 'resolved',
        resolved_at: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });

  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alert',
      error: error.message
    });
  }
};


const getAlertSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const summary = await Alert.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const severitySummary = await Alert.aggregate([
      { $match: { user_id: userId, status: 'active' } },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);


    const statusCounts = {};
    summary.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    const severityCounts = {};
    severitySummary.forEach(item => {
      severityCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        by_status: statusCounts,
        by_severity: severityCounts,
        total_active: statusCounts.active || 0,
        total_acknowledged: statusCounts.acknowledged || 0,
        total_resolved: statusCounts.resolved || 0
      }
    });

  } catch (error) {
    console.error('Error fetching alert summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert summary',
      error: error.message
    });
  }
};

module.exports = {
  generateAlertsForUser,
  getUserAlerts,
  acknowledgeAlert,
  resolveAlert,
  getAlertSummary
};