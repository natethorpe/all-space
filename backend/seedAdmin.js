// C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\seedAdmin.js
/*
 * Purpose: Seeds an admin user into the MongoDB database for the IDURAR ERP CRM.
 * Functionality:
 *   - Connects to MongoDB at 'mongodb://localhost:27017/idurar_db'.
 *   - Defines Admin and AdminPassword schemas matching server.js structure.
 *   - Checks for existing admin by email to avoid duplicates.
 *   - Creates a new admin with email 'admin@idurarapp.com' and hashed password 'admin123'.
 *   - Links the password to the admin via a separate AdminPassword document.
 * Notes:
 *   - Uses bcryptjs for password hashing (consistent with server.js).
 *   - Updated on 04/23/2025 to align with server.js schemas and password 'admin123'.
 *   - Owner: nthorpe, with assistance from Grok 3 (xAI).
 * Dependencies:
 *   - mongoose: For MongoDB connection and schema management.
 *   - bcryptjs: For secure password hashing.
 * Usage:
 *   - Run with: `node seedAdmin.js` in the backend directory.
 *   - Verify with: `mongo idurar_db --eval "db.admins.find()"`.
 * Next Steps:
 *   - Test login with 'admin@idurarapp.com' and 'admin123' via curl or UI.
 *   - Add multi-user seeding if needed for testing.
 * Known Issues:
 *   - None currently; works as expected per curl test on 04/23/2025.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/idurar_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('Connected to MongoDB');

    // Define schemas matching server.js
    const adminSchema = new mongoose.Schema({
      email: String,
      name: String,
      role: String,
    });
    const adminPasswordSchema = new mongoose.Schema({
      password: String,
      emailVerified: Boolean,
      salt: String,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    });

    const Admin = mongoose.model('Admin', adminSchema);
    const AdminPassword = mongoose.model('AdminPassword', adminPasswordSchema);

    // Check for existing admin to prevent duplicates
    const existingAdmin = await Admin.findOne({ email: 'admin@idurarapp.com' });
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      mongoose.connection.close();
      return;
    }

    // Hash password 'admin123' (updated from '123456' to match UI tests)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create admin user
    const admin = new Admin({
      email: 'admin@idurarapp.com',
      name: 'Admin User',
      role: 'manager', // Updated to match curl response
    });
    await admin.save();

    // Link password to admin
    const adminPassword = new AdminPassword({
      password: hashedPassword,
      emailVerified: false,
      user: admin._id,
    });
    await adminPassword.save();

    console.log('Admin user created:', admin.email);
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error seeding admin:', err);
    mongoose.connection.close();
  });
  