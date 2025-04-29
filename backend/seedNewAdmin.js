const mongoose = require('mongoose');
const Admin = require('./src/models/coreModels/Admin');
const AdminPassword = require('./src/models/coreModels/AdminPassword');
const Sponsor = require('./src/models/appModels/Sponsors');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/idurar_db');

const seedNewAdmin = async () => {
  try {
    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email: 'staff@idurarapp.com' });
    if (existingAdmin) {
      console.log('Admin with email staff@idurarapp.com already exists');
      // Check if AdminPassword exists, if not, create it
      const existingPassword = await AdminPassword.findOne({ user: existingAdmin._id });
      if (!existingPassword) {
        const salt = bcrypt.genSaltSync(10);
        const password = bcrypt.hashSync('password123', salt);
        const adminPassword = new AdminPassword({
          user: existingAdmin._id,
          password: password,
          salt: salt,
          emailVerified: true,
          authType: 'email',
          loggedSessions: [],
          removed: false,
        });
        await adminPassword.save();
        console.log('Admin password created for existing admin:', existingAdmin.email);
      }
      // Reassign sponsors
      const sponsorsToReassign = await Sponsor.find({ name: { $in: ['Sponsor6', 'Sponsor7', 'Sponsor8', 'Sponsor9', 'Sponsor10'] } });
      for (const sponsor of sponsorsToReassign) {
        sponsor.assignedTo = existingAdmin._id;
        await sponsor.save();
        console.log(`Reassigned ${sponsor.name} to ${existingAdmin.email}`);
      }
      console.log('Seeding complete');
      return;
    }

    // Create a new admin with role 'staff'
    const newAdmin = new Admin({
      email: 'staff@idurarapp.com',
      name: 'Staff User',
      role: 'staff',
      created: new Date(),
      enabled: true,
      removed: false,
    });
    const savedAdmin = await newAdmin.save();
    console.log('New admin created:', savedAdmin);

    // Create a password for the new admin
    const salt = bcrypt.genSaltSync(10);
    const password = bcrypt.hashSync('password123', salt);
    const adminPassword = new AdminPassword({
      user: savedAdmin._id,
      password: password,
      salt: salt,
      emailVerified: true,
      authType: 'email',
      loggedSessions: [],
      removed: false,
    });
    await adminPassword.save();
    console.log('Admin password created for:', savedAdmin.email);

    // Reassign Sponsors 6-10 to the new admin
    const sponsorsToReassign = await Sponsor.find({ name: { $in: ['Sponsor6', 'Sponsor7', 'Sponsor8', 'Sponsor9', 'Sponsor10'] } });
    for (const sponsor of sponsorsToReassign) {
      sponsor.assignedTo = savedAdmin._id;
      await sponsor.save();
      console.log(`Reassigned ${sponsor.name} to ${savedAdmin.email}`);
    }

    console.log('Seeding complete');
  } catch (error) {
    console.error('Seeding error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

seedNewAdmin();
