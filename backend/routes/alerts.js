const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const alertService = require('../services/alertService');
const {
  generateAlertsForUser,
  getUserAlerts,
  acknowledgeAlert,
  resolveAlert,
  getAlertSummary
} = require('../controllers/alertController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get alert summary/statistics
router.get('/summary', getAlertSummary);

// Get user alerts with pagination and filtering
router.get('/', getUserAlerts);

// Generate alerts for current user (manual trigger)
router.post('/generate', generateAlertsForUser);

// Acknowledge an alert
router.patch('/:id/acknowledge', acknowledgeAlert);

// Resolve an alert
router.patch('/:id/resolve', resolveAlert);

// Trigger manual alert check for current user
router.post('/check', async (req, res) => {
  try {
    const userId = req.user._id;
    const { threshold } = req.body;

    const alertsGenerated = await alertService.triggerUserAlertCheck(userId, threshold);

    res.status(200).json({
      success: true,
      message: `Generated ${alertsGenerated} new alerts`,
      data: {
        alerts_generated: alertsGenerated
      }
    });

  } catch (error) {
    console.error('Error in manual alert check:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking for new alerts',
      error: error.message
    });
  }
});

// Get alert service status (admin only - can be extended with role-based auth)
router.get('/service/status', (req, res) => {
  try {
    const status = alertService.getStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching service status',
      error: error.message
    });
  }
});

// Add this temporary debugging endpoint
router.get('/debug/:id', async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.user._id;
    
    // Check the alert in database
    const alert = await Alert.findById(alertId);
    console.log('=== ALERT DEBUG ===');
    console.log('Alert found:', !!alert);
    console.log('Alert status:', alert?.status);
    console.log('Alert user_id:', alert?.user_id);
    console.log('Current user_id:', userId);
    console.log('IDs match:', alert?.user_id.toString() === userId.toString());
    
    res.json({
      alert,
      currentUserId: userId,
      idsMatch: alert?.user_id.toString() === userId.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;