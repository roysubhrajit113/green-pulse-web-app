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


router.use(authenticateToken);


router.get('/summary', getAlertSummary);


router.get('/', getUserAlerts);


router.post('/generate', generateAlertsForUser);


router.patch('/:id/acknowledge', acknowledgeAlert);


router.patch('/:id/resolve', resolveAlert);


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


router.get('/debug/:id', async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.user._id;
    

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