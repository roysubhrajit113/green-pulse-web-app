const express = require('express');
const router = express.Router();
const Building = require('../models/Building'); // Adjust path as needed

// GET /api/buildings?institute=<name>
// Get buildings by institute name
router.get('/', async (req, res) => {
  try {
    const { institute } = req.query;
    
    if (!institute) {
      return res.status(400).json({
        success: false,
        message: 'Institute query parameter is required'
      });
    }

    // Find buildings for the specified institute
    const buildings = await Building.find({ institute: institute });
    
    console.log(`Found ${buildings.length} buildings for institute: ${institute}`);
    
    res.json({
      success: true,
      buildings: buildings,
      count: buildings.length
    });

  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch buildings',
      error: error.message
    });
  }
});

module.exports = router;
