const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const User = require('../models/User');
require('dotenv').config();

const checkAlertsCollection = async () => {
  try {

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');


    const collections = await mongoose.connection.db.listCollections().toArray();
    const alertsCollection = collections.find(col => col.name === 'alerts');
    
    if (alertsCollection) {
      console.log('✅ Alerts collection exists');
    } else {
      console.log('❌ Alerts collection does not exist yet');
    }


    const totalAlerts = await Alert.countDocuments();
    console.log(`📊 Total alerts in database: ${totalAlerts}`);


    const statusCounts = await Alert.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📈 Alerts by Status:');
    statusCounts.forEach(status => {
      console.log(`  ${status._id}: ${status.count}`);
    });


    const recentAlerts = await Alert.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user_id', 'fullName email');

    console.log('\n🔔 Recent Alerts:');
    recentAlerts.forEach((alert, index) => {
      console.log(`${index + 1}. Building: ${alert.building_name}`);
      console.log(`   User: ${alert.user_id?.fullName || 'Unknown'} (${alert.user_id?.email || 'No email'})`);
      console.log(`   Status: ${alert.status}`);
      console.log(`   Severity: ${alert.severity}`);
      console.log(`   Reading: ${alert.meter_reading} > Threshold: ${alert.threshold}`);
      console.log(`   Time: ${alert.timestamp.toLocaleString()}`);
      if (alert.acknowledged_at) {
        console.log(`   Acknowledged: ${alert.acknowledged_at.toLocaleString()}`);
      }
      if (alert.resolved_at) {
        console.log(`   Resolved: ${alert.resolved_at.toLocaleString()}`);
      }
      console.log('   ---');
    });


    const alertsByUser = await Alert.aggregate([
      {
        $group: {
          _id: '$user_id',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n👥 Alerts by User:');
    alertsByUser.forEach(userAlert => {
      console.log(`  ${userAlert.user.fullName} (${userAlert.user.email}): ${userAlert.count} alerts`);
    });


    const sampleAlert = await Alert.findOne().lean();
    if (sampleAlert) {
      console.log('\n📋 Sample Alert Document Structure:');
      console.log(JSON.stringify(sampleAlert, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};


checkAlertsCollection();