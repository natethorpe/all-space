const mongoose = require('mongoose');
const { Schema } = mongoose;

const SponsorSchema = new Schema({
  name: { type: String, required: true },
  likeliness: { type: Number, default: 50 },
  est_cost: { type: Number, default: 0 },
  tier_level: { type: String, enum: ['Very High', 'High', 'Moderate-High'], required: true },
  fit_score: { type: Number, default: 50 },
  email: { type: String },
  schedule: [{ title: String, date: String, description: String }],
  email_tasks: [{ task: String, status: String, due: String }],
});

const Sponsors = mongoose.models.Sponsors || mongoose.model('Sponsors', SponsorSchema);

mongoose.connect('mongodb://localhost:27017/idurar_db');

Sponsors.find().then((sponsors) => {
  console.log('Found sponsors:', sponsors.length);
  console.log('First 5 sponsors:', sponsors.slice(0, 5));
  mongoose.connection.close();
}).catch((err) => {
  console.error('Error:', err.message);
  mongoose.connection.close();
});
