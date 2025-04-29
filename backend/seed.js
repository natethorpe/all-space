// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\seed.js
const mongoose = require('mongoose');
const Sponsor = require('./src/models/appModels/Sponsors');

mongoose.connect('mongodb://localhost:27017/idurar_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedSponsors = async () => {
  await Sponsor.deleteMany({});
  const sponsors = [
    {
      name: 'PepsiCo',
      likeliness: 90,
      est_cost: 75000,
      tier_level: 'Very High',
      fit_score: 85,
      email: 'sponsor@pepsico.com',
      schedule: [{ title: 'Initial Call', date: new Date('2025-04-10'), description: 'Discuss sponsorship' }],
      email_tasks: [{ subject: 'Follow Up', due_date: new Date(), status: 'Pending' }],
    },
    // ... (rest of your sponsors, up to 117)
    ...Array.from({ length: 116 }, (_, i) => ({
      name: `Sponsor ${i + 2}`,
      likeliness: Math.floor(Math.random() * (90 - 50 + 1)) + 50,
      est_cost: Math.floor(Math.random() * (80000 - 10000 + 1)) + 10000,
      tier_level: i % 3 === 0 ? 'Very High' : i % 3 === 1 ? 'High' : 'Moderate-High',
      fit_score: Math.floor(Math.random() * (90 - 50 + 1)) + 50,
      email: `sponsor${i + 2}@example.com`,
      schedule: i % 2 === 0 ? [{ title: `Call ${i + 2}`, date: new Date(`2025-04-${10 + (i % 20)}`), description: 'General discussion' }] : [],
      email_tasks: i % 2 === 1 ? [{ subject: `Task ${i + 2}`, due_date: new Date(), status: 'Pending' }] : [],
    })),
  ];

  await Sponsor.insertMany(sponsors);
  console.log(`Seeded ${sponsors.length} sponsors`);
  mongoose.connection.close();
};

seedSponsors();
