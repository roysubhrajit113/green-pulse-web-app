const Building = require('../models/Building');
const MeterData = require('../models/MeterData');
const Alert = require('../models/Alert');
const User = require('../models/User');

// Default threshold value
const DEFAULT_THRESHOLD = 1000;

class AlertService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
  }

  /**
   * Start the alert monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('Alert service is already running');
      return;
    }

    console.log('Starting Alert Monitoring Service...');
    this.isRunning = true;
    
    // Run initial check
    this.checkAllUsersForAlerts();
    
    // Set up recurring checks
    this.intervalId = setInterval(() => {
      this.checkAllUsersForAlerts();
    }, this.checkInterval);

    console.log(`Alert service started with ${this.checkInterval / 1000}s interval`);
  }

  /**
   * Stop the alert monitoring service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Alert service is not running');
      return;
    }

    console.log('Stopping Alert Monitoring Service...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Alert service stopped');
  }

  /**
   * Check alerts for all users
   */
  async checkAllUsersForAlerts() {
    try {
      console.log('Checking alerts for all users...');
      
      const users = await User.find({}).select('_id institute');
      let totalAlertsGenerated = 0;

      for (const user of users) {
        const alertsGenerated = await this.checkUserForAlerts(user._id, user.institute);
        totalAlertsGenerated += alertsGenerated;
      }

      console.log(`Alert check completed. Generated ${totalAlertsGenerated} new alerts for ${users.length} users.`);
      
    } catch (error) {
      console.error('Error in checkAllUsersForAlerts:', error);
    }
  }

  /**
   * Check alerts for a specific user
   */
  async checkUserForAlerts(userId, userInstitute, customThreshold = null) {
    try {
      // Get the institute name
      const institute = typeof userInstitute === 'string' 
        ? userInstitute 
        : userInstitute?.name || userInstitute?.label;

      if (!institute) {
        console.log(`No institute found for user ${userId}`);
        return 0;
      }

      const threshold = customThreshold || DEFAULT_THRESHOLD;

      // Find all buildings for the user's institute
      const buildings = await Building.find({ institute: institute });
      
      if (buildings.length === 0) {
        console.log(`No buildings found for institute: ${institute}`);
        return 0;
      }

      let alertsGenerated = 0;

      // Check each building for meter readings above threshold
      for (const building of buildings) {
        try {
          // Get the latest meter reading for this building
          const latestMeterData = await MeterData.findOne(
            { building_id: building.building_id }
          ).sort({ timestamp: -1 });

          if (latestMeterData && latestMeterData.meter_reading > threshold) {
            // Check if alert already exists for this building
            const existingAlert = await Alert.findOne({
              user_id: userId,
              building_id: building.building_id,
              status: 'active'
            });

            if (!existingAlert) {
              // Determine severity based on how much the reading exceeds threshold
              let severity = 'medium';
              const exceedanceRatio = latestMeterData.meter_reading / threshold;
              
              if (exceedanceRatio > 3) severity = 'critical';
              else if (exceedanceRatio > 2) severity = 'high';
              else if (exceedanceRatio > 1.5) severity = 'medium';
              else severity = 'low';

              // Create new alert
              const newAlert = new Alert({
                user_id: userId,
                building_id: building.building_id,
                building_name: building.assigned_name,
                institute: institute,
                meter_reading: latestMeterData.meter_reading,
                threshold: threshold,
                severity: severity,
                message: `High energy consumption detected in ${building.assigned_name}. Current reading: ${latestMeterData.meter_reading}, Threshold: ${threshold}`,
                timestamp: new Date()
              });

              await newAlert.save();
              alertsGenerated++;
              
              console.log(`Alert generated for user ${userId}, building ${building.assigned_name}: ${latestMeterData.meter_reading} > ${threshold}`);
            }
          }
        } catch (buildingError) {
          console.error(`Error processing building ${building.building_id}:`, buildingError);
        }
      }

      return alertsGenerated;

    } catch (error) {
      console.error(`Error checking alerts for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Manually trigger alert check for a specific user
   */
  async triggerUserAlertCheck(userId, customThreshold = null) {
    try {
      const user = await User.findById(userId).select('institute');
      if (!user) {
        throw new Error('User not found');
      }

      const alertsGenerated = await this.checkUserForAlerts(userId, user.institute, customThreshold);
      return alertsGenerated;

    } catch (error) {
      console.error(`Error in manual alert check for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old resolved alerts (older than 30 days)
   */
  async cleanupOldAlerts() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await Alert.deleteMany({
        status: 'resolved',
        resolved_at: { $lt: thirtyDaysAgo }
      });

      console.log(`Cleaned up ${result.deletedCount} old resolved alerts`);
      return result.deletedCount;

    } catch (error) {
      console.error('Error cleaning up old alerts:', error);
      return 0;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.isRunning ? new Date(Date.now() + this.checkInterval) : null
    };
  }
}

// Export a singleton instance
const alertService = new AlertService();
module.exports = alertService;