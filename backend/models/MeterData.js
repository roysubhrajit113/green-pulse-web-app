const mongoose = require('mongoose');

const meterDataSchema = new mongoose.Schema({
  building_id: {
    type: Number,
    required: true,
    index: true
  },
  meter: {
    type: Number,
    required: true
  },
  timestamp: {
    type: String,
    required: true,
    index: true
  },
  meter_reading: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  collection: 'meter_data'
});


meterDataSchema.index({ building_id: 1, timestamp: -1 });
meterDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('MeterData', meterDataSchema);
