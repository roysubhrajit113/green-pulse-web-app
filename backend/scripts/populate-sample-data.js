
const mongoose = require('mongoose');
const CarbonBiometric = require('../models/CarbonBiometric');
const EnergyConsumption = require('../models/EnergyConsumption');
require('dotenv').config();

const sampleInstitutes = [
  'MIT',
  'Harvard University', 
  'Stanford University',
  'UC Berkeley',
  'Carnegie Mellon'
];

const sampleDepartments = [
  'Computer Science',
  'Engineering', 
  'Medical',
  'Business',
  'Arts',
  'Science'
];

const sampleBuildings = [
  'Building A',
  'Building B', 
  'Building C',
  'Building D',
  'Science Lab',
  'Engineering Complex'
];

async function populateSampleData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');


    console.log('🧹 Clearing existing data...');
    await CarbonBiometric.deleteMany({});
    await EnergyConsumption.deleteMany({});

    console.log('📊 Creating carbon biometric data...');
    

    for (const institute of sampleInstitutes) {
      console.log(`  Creating data for ${institute}...`);
      

      for (let monthsBack = 6; monthsBack >= 0; monthsBack--) {
        for (let daysInMonth = 0; daysInMonth < 10; daysInMonth++) {
          const timestamp = new Date();
          timestamp.setMonth(timestamp.getMonth() - monthsBack);
          timestamp.setDate(daysInMonth * 3 + 1);

          for (const department of sampleDepartments) {
            const carbonBiometric = new CarbonBiometric({
              institute: institute,
              timestamp: timestamp,
              co2Emissions: Math.random() * 10 + 5,
              co2Savings: Math.random() * 50 + 10,
              carbonFootprint: Math.random() * 200 + 100,
              carbonOffset: Math.random() * 20 + 5,
              energyConsumption: Math.random() * 1000 + 500,
              renewableEnergyUsage: Math.random() * 200 + 50,
              gridEnergyUsage: Math.random() * 800 + 400,
              carbonBudget: {
                allocated: 1000 + Math.random() * 500,
                used: Math.random() * 800 + 200,
                remaining: Math.random() * 300 + 100
              },
              carbonWallet: {
                balance: Math.random() * 2000 + 500,
                transactions: [
                  {
                    type: 'credit',
                    amount: Math.random() * 500 + 100,
                    description: 'Carbon credit purchase',
                    timestamp: timestamp
                  },
                  {
                    type: 'offset_purchase',
                    amount: Math.random() * 300 + 50,
                    description: 'Tree planting offset',
                    timestamp: timestamp
                  }
                ]
              },
              energyEfficiency: Math.random() * 20 + 75,
              carbonEfficiency: Math.random() * 25 + 70,
              buildingName: sampleBuildings[Math.floor(Math.random() * sampleBuildings.length)],
              departmentName: department,
              deviceId: `sensor_${institute.replace(/\s+/g, '_').toLowerCase()}_${department.replace(/\s+/g, '_').toLowerCase()}`,
              sensorData: {
                temperature: Math.random() * 10 + 20,
                humidity: Math.random() * 20 + 40,
                airQuality: Math.random() * 100 + 50
              },
              dataSource: 'sensor'
            });

            await carbonBiometric.save();
          }
        }
      }
    }

    console.log('⚡ Creating energy consumption data...');
    

    for (const institute of sampleInstitutes) {
      for (let monthsBack = 6; monthsBack >= 0; monthsBack--) {
        for (let daysInMonth = 0; daysInMonth < 15; daysInMonth++) {
          const timestamp = new Date();
          timestamp.setMonth(timestamp.getMonth() - monthsBack);
          timestamp.setDate(daysInMonth * 2 + 1);

          for (const department of sampleDepartments) {
            const building = sampleBuildings[Math.floor(Math.random() * sampleBuildings.length)];
            
            const energyConsumption = new EnergyConsumption({
              institute: institute,
              timestamp: timestamp,
              buildingName: building,
              departmentName: department,
              consumption: Math.random() * 500 + 200,
              efficiency: Math.random() * 25 + 70,
              carbonFootprint: Math.random() * 100 + 50,
              energySource: ['grid', 'solar', 'wind', 'hybrid'][Math.floor(Math.random() * 4)],
              cost: Math.random() * 200 + 50,
              deviceId: `meter_${building.replace(/\s+/g, '_').toLowerCase()}`,
              meterReading: Math.random() * 10000 + 5000
            });

            await energyConsumption.save();
          }
        }
      }
    }

    console.log('📈 Data population summary:');
    const carbonCount = await CarbonBiometric.countDocuments();
    const energyCount = await EnergyConsumption.countDocuments();
    
    console.log(`  ✅ Created ${carbonCount} carbon biometric records`);
    console.log(`  ✅ Created ${energyCount} energy consumption records`);
    console.log(`  🏢 For ${sampleInstitutes.length} institutes`);
    console.log(`  🏫 Across ${sampleDepartments.length} departments`);
    console.log(`  🏗️ In ${sampleBuildings.length} buildings`);

    console.log('🎉 Sample data population completed successfully!');
    console.log('\n📋 Test the data with these institute names:');
    sampleInstitutes.forEach(institute => console.log(`   - ${institute}`));

  } catch (error) {
    console.error('❌ Error populating sample data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}


if (require.main === module) {
  populateSampleData().then(() => {
    console.log('\n✨ Script execution complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = { populateSampleData };