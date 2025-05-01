const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/coreModels/Admin');
const AdminPassword = require('./models/coreModels/AdminPassword');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.DATABASE)
  .then(async () => {
    console.log('Connected to MongoDB');
    const admin = await Admin.create({
      name: 'Test Admin',
      email: 'test@admin.com',
      role: 'owner',
      enabled: true,
    });
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(salt + 'test123'); // Use bcrypt directly
    await AdminPassword.create({
      user: admin._id,
      password: hashedPassword,
      salt: salt,
    });
    console.log('Test admin created:', admin.email);
    mongoose.connection.close();
  })
  .catch(err => console.error('Error:', err));
  