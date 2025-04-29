const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    await AdminPassword.updateOne(
      { user: admin._id },
      { password: hash, emailVerified: true },
      { upsert: true } // Create if not exists, though it already does
    );
    console.log('Password reset for admin@idurarapp.com to admin123');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
  