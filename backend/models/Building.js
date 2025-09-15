const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  campus_id: {
    type: Number,
    required: true
  },
  building_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  institute: {
    type: String,
    required: true,
    index: true
  },
  city: {
    type: String,
    required: true
  },
  latitude: Number,
  longitude: Number,
  primary_use: {
    type: String,
    required: true
  },
  assigned_name: {
    type: String,
    required: true
  },
  square_feet: {
    type: Number,
    required: true
  },
  year_built: Number
}, {
  collection: 'building_data'
});


buildingSchema.index({ institute: 1, building_id: 1 });

module.exports = mongoose.model('Building', buildingSchema);
