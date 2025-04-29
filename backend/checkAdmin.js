const mongoose = require('mongoose');

// Require db.js to register schemas and connect to MongoDB
require('./src/db');

// Access models via mongoose.model()
const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');

mongoose.connect('mongodb://localhost:27017/idurar_erp_crm', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const admin = await Admin.findOne({ email: 'admin@idurarapp.com' });
    if (!admin) {
      console.log('Admin not found');
      return process.exit(1);
    }
    const adminPassword = await AdminPassword.findOne({ user: admin._id });
    console.log('Admin:', admin);
    console.log('Password Record:', adminPassword);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });