const mongoose = require('mongoose');
const { Schema } = mongoose;

const SponsorSchema = new Schema({
  name: { type: String, required: true },
  likeliness: { type: Number, default: 50 },
  est_cost: { type: Number, default: 0 },
  tier_level: { type: String, enum: ['Very High', 'High', 'Moderate-High'], required: true },
  fit_score: { type: Number, default: 50 },
  email: { type: String },
  schedule: [{ title: String, date: Date, description: String }],
  email_tasks: [
    {
      _id: { type: Schema.Types.ObjectId, auto: true },
      subject: String,
      due_date: Date,
      status: { type: String, enum: ['Pending', 'Sent', 'Failed'], default: 'Pending' },
    },
  ],
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Sponsors = mongoose.models.Sponsor || mongoose.model('Sponsor', SponsorSchema);

mongoose.connect('mongodb://localhost:27017/idurar_db');

const seedData = async () => {
  try {
    const sponsors = await Sponsors.find();
    if (sponsors.length === 0) {
      console.log('No sponsors found in the database. Please seed sponsors first.');
      return;
    }

    for (let i = 0; i < Math.min(10, sponsors.length); i++) {
      const sponsor = sponsors[i];
      sponsor.schedule = [
        { title: 'Initial Call', date: new Date('2025-03-05'), description: 'Discuss sponsorship opportunities' },
        { title: 'Follow-Up', date: new Date('2025-03-10'), description: 'Review proposal' },
      ];
      sponsor.email_tasks = [
        { subject: 'Send intro email', status: 'Pending', due_date: new Date('2025-03-01') },
        { subject: 'Follow up on proposal', status: 'Sent', due_date: new Date('2025-03-07') },
      ];
      await sponsor.save();
      console.log(`Updated ${sponsor.name} with sample data`);
    }
    console.log('Seeding complete');
  } catch (error) {
    console.error('Seeding error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

seedData();
