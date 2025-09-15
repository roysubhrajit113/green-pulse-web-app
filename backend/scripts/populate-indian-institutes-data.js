
const mongoose = require('mongoose');
const CarbonBiometric = require('../models/CarbonBiometric');
const EnergyConsumption = require('../models/EnergyConsumption');
require('dotenv').config();


const indianInstitutes = [
  'Indian Institute of Information Technology Hyderabad',
  'Indian Institute of Science Bangalore',
  'Indian Institute of Science Education and Research Kolkata',
  'Indian Institute of Science Education and Research Pune',
  'Indian Institute of Space Science and Technology Thiruvananthapuram',
  'Indian Institute of Technology Bombay',
  'Indian Institute of Technology Delhi',
  'Indian Institute of Technology Kanpur',
  'Indian Institute of Technology Kharagpur',
  'Indian Institute of Technology Madras',
  'Malaviya National Institute of Technology Jaipur',
  'National Institute of Technology Karnataka Surathkal',
  'National Institute of Technology Tiruchirappalli',
  'National Institute of Technology Warangal'
];

const indianDepartments = [
  'Computer Science',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Chemical Engineering',
  'Aerospace Engineering',
  'Biotechnology',
  'Mathematics',
  'Physics',
  'Chemistry'
];

const indianBuildings = [
  'Academic Building 1',
  'Academic Building 2',
  'Research Block',
  'Central Library',
  'Computer Centre',
  'Laboratory Complex',
  'Administrative Block',
  'Hostel Block A',
  'Hostel Block B',
  'Faculty Housing'
];

async function populateIndianInstitutesData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');


    console.log('🧹 Clearing existing carbonbiometrics data...');
    await CarbonBiometric.deleteMany({});
    await EnergyConsumption.deleteMany({});

    console.log('📊 Creating carbon biometric data for Indian institutes...');
    

    for (const institute of indianInstitutes) {
      console.log(`  Creating data for ${institute}...`);
      

      for (let monthsBack = 6; monthsBack >= 0; monthsBack--) {
        for (let daysInMonth = 0; daysInMonth < 12; daysInMonth++) {
          const timestamp = new Date();
          timestamp.setMonth(timestamp.getMonth() - monthsBack);
          timestamp.setDate(daysInMonth * 2 + 1);

          for (const department of indianDepartments) {

            const instituteMultiplier = (indianInstitutes.indexOf(institute) + 1) * 0.1 + 1;
            const departmentMultiplier = (indianDepartments.indexOf(department) + 1) * 0.05 + 1;
            
            const carbonBiometric = new CarbonBiometric({
              institute: institute,
              timestamp: timestamp,
              co2Emissions: Math.random() * 15 * instituteMultiplier + 8,
              co2Savings: Math.random() * 80 * instituteMultiplier + 20,
              carbonFootprint: Math.random() * 300 * instituteMultiplier + 150,
              carbonOffset: Math.random() * 30 * instituteMultiplier + 10,
              energyConsumption: Math.random() * 1200 * departmentMultiplier + 600,
              renewableEnergyUsage: Math.random() * 300 * instituteMultiplier + 80,
              gridEnergyUsage: Math.random() * 1000 * departmentMultiplier + 500,
              carbonBudget: {
                allocated: 1200 + Math.random() * 800 * instituteMultiplier,
                used: Math.random() * 1000 * instituteMultiplier + 300,
                remaining: Math.random() * 500 * instituteMultiplier + 150
              },
              carbonWallet: {
                balance: Math.random() * 2500 * instituteMultiplier + 800,
                transactions: [
                  {
                    type: 'credit',
                    amount: Math.random() * 600 * instituteMultiplier + 150,
                    description: 'Government green initiative fund',
                    timestamp: timestamp
                  },
                  {
                    type: 'offset_purchase',
                    amount: Math.random() * 400 * instituteMultiplier + 80,
                    description: 'Renewable energy offset',
                    timestamp: timestamp
                  }
                ]
              },
              energyEfficiency: Math.random() * 25 + 75,
              carbonEfficiency: Math.random() * 30 + 70,
              buildingName: indianBuildings[Math.floor(Math.random() * indianBuildings.length)],
              departmentName: department,
              deviceId: `sensor_${institute.replace(/\s+/g, '_').toLowerCase()}_${department.replace(/\s+/g, '_').toLowerCase()}`,
              sensorData: {
                temperature: Math.random() * 15 + 25,
                humidity: Math.random() * 40 + 40,
                airQuality: Math.random() * 150 + 50
              },
              dataSource: 'sensor'
            });

            await carbonBiometric.save();
          }
        }
      }
    }

    console.log('⚡ Creating energy consumption data for Indian institutes...');
    

    for (const institute of indianInstitutes) {
      for (let monthsBack = 6; monthsBack >= 0; monthsBack--) {
        for (let daysInMonth = 0; daysInMonth < 20; daysInMonth++) {
          const timestamp = new Date();
          timestamp.setMonth(timestamp.getMonth() - monthsBack);
          timestamp.setDate(daysInMonth + 1);

          for (const department of indianDepartments.slice(0, 8)) {
            const building = indianBuildings[Math.floor(Math.random() * indianBuildings.length)];
            const instituteMultiplier = (indianInstitutes.indexOf(institute) + 1) * 0.1 + 1;
            
            const energyConsumption = new EnergyConsumption({
              institute: institute,
              timestamp: timestamp,
              buildingName: building,
              departmentName: department,
              consumption: Math.random() * 600 * instituteMultiplier + 250,
              efficiency: Math.random() * 30 + 70,
              carbonFootprint: Math.random() * 150 * instituteMultiplier + 75,
              energySource: ['grid', 'solar', 'wind', 'hybrid'][Math.floor(Math.random() * 4)],
              cost: Math.random() * 300 * instituteMultiplier + 80,
              deviceId: `meter_${building.replace(/\s+/g, '_').toLowerCase()}`,
              meterReading: Math.random() * 15000 + 8000
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
    console.log(`  🏢 For ${indianInstitutes.length} Indian institutes`);
    console.log(`  🏫 Across ${indianDepartments.length} departments`);
    console.log(`  🏗️ In ${indianBuildings.length} buildings`);

    console.log('🎉 Indian institutes data population completed successfully!');
    console.log('\n📋 Test the data with these Indian institute names:');
    indianInstitutes.forEach(institute => console.log(`   - ${institute}`));

  } catch (error) {
    console.error('❌ Error populating Indian institutes data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}


if (require.main === module) {
  populateIndianInstitutesData().then(() => {
    console.log('\n✨ Script execution complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}

module.exports = { populateIndianInstitutesData };