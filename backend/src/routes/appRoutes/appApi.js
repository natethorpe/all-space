const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();
const Settings = require('../../models/appModels/Settings');
const sponsorRoutes = require('./sponsor');

router.get('/settings/listAll', catchErrors(async (req, res) => {
  console.log('Settings/listAll route hit');
  try {
    let settings = await Settings.find();
    console.log('Settings found:', settings);
    if (!settings.length) {
      console.log('No settings found, seeding defaults');
      const defaultSettings = [
        { settingCategory: 'general', settingKey: 'appName', settingValue: 'Festival CRM' },
        { settingCategory: 'general', settingKey: 'currency', settingValue: 'USD' },
      ];
      await Settings.insertMany(defaultSettings);
      settings = await Settings.find();
      console.log('Seeded settings:', settings);
    }
    res.json({ success: true, result: settings });
  } catch (error) {
    console.error('Error in settings/listAll:', error.message);
    res.status(500).json({ success: false, result: [], message: error.message });
  }
}));

// Mount sponsor routes at root, since /api/sponsors is handled by app.js
router.use('/', sponsorRoutes);

module.exports = router;
