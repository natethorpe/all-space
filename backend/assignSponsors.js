const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define schemas locally
const sponsorSchema = new Schema({
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

const adminSchema = new Schema({
  email: String,
  name: String,
  role: String,
});

const Sponsors = mongoose.models.Sponsor || mongoose.model('Sponsor', sponsorSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

mongoose.connect('mongodb://localhost:27017/idurar_db');

const assignSponsors = async () => {
  try {
    const admin = await Admin.findOne({ email: 'admin@idurarapp.com' });
    if (!admin) throw new Error('Admin not found');

    const sponsors = await Sponsors.find().limit(10);
    for (const sponsor of sponsors) {
      sponsor.assignedTo = admin._id;
      await sponsor.save();
      console.log(`Assigned ${sponsor.name} to ${admin.name}`);
    }
    console.log('Assignment complete');
  } catch (error) {
    console.error('Assignment error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

assignSponsors();
