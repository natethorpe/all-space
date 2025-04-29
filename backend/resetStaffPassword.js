const mongoose = require('mongoose');
const AdminPassword = require('./src/models/coreModels/AdminPassword');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/idurar_db');

const resetStaffPassword = async () => {
  try {
    const userId = '67e9edbfe9a0ebf1a19643be'; // ID of staff@idurarapp.com
    const hash = bcrypt.hashSync('password123', 10); // Generate hash with 10 rounds
    const adminPassword = new AdminPassword({
      user: userId,
      password: hash,
      emailVerified: true,
      authType: 'email',
      loggedSessions: [],
      removed: false,
    });
    await adminPassword.save();
    console.log('Admin password reset for staff@idurarapp.com:', { password: adminPassword.password });
  } catch (error) {
    console.error('Error resetting password:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

resetStaffPassword();
