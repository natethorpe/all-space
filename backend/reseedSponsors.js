const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/idurar_db');

const Sponsor = mongoose.model('Sponsor', new mongoose.Schema({
  name: String,
  email: String,
  tier_level: String,
  likeliness: String,
  est_cost: Number,
  assignedTo: String,
  image: String,
  events: [{ title: String, date: String, description: String }],
  createdAt: Date,
}));

const reseedSponsors = async () => {
  try {
    await Sponsor.updateMany(
      { likeliness: { $type: 'number' } },
      [{ $set: { likeliness: { $concat: [{ $toString: '$likeliness' }, '%'] } } }]
    );
    console.log('Numeric likeliness values converted to strings with %');

    const count = await Sponsor.countDocuments();
    if (count === 0) {
      await Sponsor.insertMany([
        { name: 'Nike', email: 'nike@example.com', tier_level: 'Very High', likeliness: '80%', est_cost: 10000 },
        { name: 'Adidas', email: 'adidas@example.com', tier_level: 'High', likeliness: '60%', est_cost: 7500 },
      ]);
      console.log('Mock sponsors seeded');
    }
  } catch (error) {
    console.error('Reseed error:', error);
  } finally {
    mongoose.connection.close();
  }
};

reseedSponsors();
