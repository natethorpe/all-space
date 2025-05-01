// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\setup\setup.js
/*
 * Purpose: Initializes the application with default admin and settings.
 * Dependencies: dotenv, mongoose, shortid, fs, glob, bcryptjs
 * Notes:
 *   - Seeds admin user and default settings.
 *   - Grok Programming Machine: Track setup execution; update notes with success (e.g., "Admin X created on Y").
 *   - Nate & Grok: Future updates:
 *     - Support multi-user setup for initial teams.
 *     - Load settings from a configurable JSON file.
 * Change Log:
 *   - 04/08/2025: Updated admin email to match login (Chat Line 5600).
 *     - Why: Admin not found error (User logs, 17:46 UTC).
 *     - How: Changed email to admin@idurarapp.com, added bcrypt.
 *     - Test: Run `node src/setup/setup.js`, login with admin@idurarapp.com/admin123.
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { globSync } = require('glob');
const fs = require('fs');
const { generate: uniqueId } = require('shortid');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupApp() {
  try {
    await mongoose.connect(process.env.DATABASE || 'mongodb://localhost:27017/idurar_erp_crm');
    const Admin = require('../models/coreModels/Admin');
    const AdminPassword = require('../models/coreModels/AdminPassword');

    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const salt = uniqueId();
      const passwordHash = bcrypt.hashSync('admin123' + salt, 10);
      const demoAdmin = {
        email: 'admin@idurarapp.com', // Aligned with login attempt
        name: 'IDURAR',
        surname: 'Admin',
        enabled: true,
        role: 'owner',
      };
      const result = await new Admin(demoAdmin).save();
      const adminPasswordData = {
        password: passwordHash,
        emailVerified: true,
        salt,
        user: result._id,
      };
      await new AdminPassword(adminPasswordData).save();
      console.log('👍 Admin created: admin@idurarapp.com, password: admin123');
    } else {
      console.log('👍 Admin already exists, skipping');
    }

    const Setting = require('../models/coreModels/Setting');
    const settingFiles = globSync('./src/setup/defaultSettings/**/*.json');
    const settingsData = [];
    for (const filePath of settingFiles) {
      const file = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      settingsData.push(...file);
    }
    await Setting.insertMany(settingsData);
    console.log('👍 Settings created');

    const PaymentMode = require('../models/appModels/PaymentMode');
    const Taxes = require('../models/appModels/Taxes');
    await Taxes.insertMany([{ taxName: 'Tax 0%', taxValue: '0', isDefault: true }]);
    console.log('👍 Taxes created');
    await PaymentMode.insertMany([
      { name: 'Default Payment', description: 'Default Payment Mode (Cash, Wire Transfer)', isDefault: true },
    ]);
    console.log('👍 PaymentMode created');

    console.log('🥳 Setup completed');
    process.exit();
  } catch (e) {
    console.error('🚫 Setup error:', e);
    process.exit(1);
  }
}

setupApp();
