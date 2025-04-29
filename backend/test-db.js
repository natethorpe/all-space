const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
mongoose.connect(process.env.DATABASE)
  .then(() => {
    console.log('Connected to MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.log('Error:', err);
    process.exit(1);
  });