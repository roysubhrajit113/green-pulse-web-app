require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CarbonBiometric = require('./models/CarbonBiometric');

async function debugUserInstitute() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');


    console.log('=== USERS AND THEIR INSTITUTES ===');
    const users = await User.find({}).select('email fullName institute');
    
    users.forEach(user => {
      console.log(`User: ${user.email}`);
      console.log(`Institute: ${typeof user.institute === 'object' ? JSON.stringify(user.institute) : user.institute}`);
      console.log(`Institute Type: ${typeof user.institute}`);
      console.log('---');
    });


    console.log('\n=== CARBON DATA INSTITUTES ===');
    const carbonInstitutes = await CarbonBiometric.distinct('institute');
    console.log('Carbon data institutes:');
    carbonInstitutes.forEach((inst, idx) => {
      console.log(`${idx + 1}. "${inst}" (type: ${typeof inst})`);
    });


    console.log('\n=== MATCHING TEST ===');
    for (const user of users) {
      console.log(`\nTesting user: ${user.email}`);
      console.log(`User institute: "${user.institute}"`);
      

      const exactMatch = await CarbonBiometric.findOne({ institute: user.institute });
      console.log(`Exact match: ${exactMatch ? 'YES' : 'NO'}`);
      

      const stringInstitute = typeof user.institute === 'object' ? 
        (user.institute.name || user.institute.id || JSON.stringify(user.institute)) : 
        String(user.institute);
      
      console.log(`String institute: "${stringInstitute}"`);
      const stringMatch = await CarbonBiometric.findOne({ institute: stringInstitute });
      console.log(`String match: ${stringMatch ? 'YES' : 'NO'}`);
      

      const caseInsensitiveMatch = await CarbonBiometric.findOne({ 
        institute: { $regex: new RegExp(`^${stringInstitute}$`, 'i') }
      });
      console.log(`Case insensitive match: ${caseInsensitiveMatch ? 'YES' : 'NO'}`);
      

      const similarInstitutes = carbonInstitutes.filter(inst => 
        inst.toLowerCase().includes(stringInstitute.toLowerCase().substring(0, 10)) ||
        stringInstitute.toLowerCase().includes(inst.toLowerCase().substring(0, 10))
      );
      if (similarInstitutes.length > 0) {
        console.log(`Similar institutes: ${similarInstitutes.join(', ')}`);
      }
    }

    await mongoose.connection.close();
    console.log('\nDebug complete!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugUserInstitute();