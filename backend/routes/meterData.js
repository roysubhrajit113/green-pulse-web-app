const express = require('express');
const router = express.Router();
const MeterData = require('../models/MeterData'); // Adjust path as needed

// POST /api/meter-data
// Get meter data for multiple building IDs
router.post('/', async (req, res) => {
  try {
    const { building_ids } = req.body;
    
    if (!Array.isArray(building_ids) || building_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'building_ids must be a non-empty array'
      });
    }

    console.log('Fetching meter data for buildings:', building_ids);

    // Find meter data for all specified building IDs, sorted by timestamp
    const meterData = await MeterData.find({
      building_id: { $in: building_ids }
    }).sort({ timestamp: 1 }); // Sort ascending by timestamp

    console.log(`Found ${meterData.length} meter readings`);

    res.json({
      success: true,
      meterData: meterData,
      count: meterData.length
    });

  } catch (error) {
    console.error('Error fetching meter data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meter data',
      error: error.message
    });
  }
});

// POST /api/meter-data/latest
// Get latest meter readings for each building
router.post('/latest', async (req, res) => {
  try {
    const { building_ids } = req.body;
    
    if (!Array.isArray(building_ids) || building_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'building_ids must be a non-empty array'
      });
    }

    console.log('Fetching latest meter readings for buildings:', building_ids);

    // Use MongoDB aggregation to get the latest reading per building
    const latestReadings = await MeterData.aggregate([
      // Match documents for the specified building IDs
      { 
        $match: { 
          building_id: { $in: building_ids } 
        } 
      },
      // Sort by building_id and timestamp (descending for latest)
      { 
        $sort: { 
          building_id: 1, 
          timestamp: -1 
        } 
      },
      // Group by building_id and get the first (latest) document
      {
        $group: {
          _id: '$building_id',
          latestReading: { $first: '$$ROOT' }
        }
      }
    ]);

    console.log(`Found latest readings for ${latestReadings.length} buildings`);

    res.json({
      success: true,
      data: latestReadings.map(item => item.latestReading),
      count: latestReadings.length
    });

  } catch (error) {
    console.error('Error fetching latest meter readings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest meter readings',
      error: error.message
    });
  }
});

module.exports = router;
