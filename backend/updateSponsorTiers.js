const mongoose = require('mongoose');
const Sponsor = require('./src/models/appModels/Sponsors');

mongoose.connect('mongodb://localhost:27017/idurar_db');

const updateSponsorTiers = async () => {
  try {
    // Update Sponsors 6-10 to 'High' tier
    await Sponsor.updateMany(
      { name: { $in: ['Sponsor6', 'Sponsor7', 'Sponsor8', 'Sponsor9', 'Sponsor10'] } },
      { $set: { tier_level: 'High' } }
    );
    console.log('Updated tiers for Sponsors 6-10 to High');
  } catch (error) {
    console.error('Error updating sponsor tiers:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

updateSponsorTiers();
