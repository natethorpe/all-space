// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\models\appModels\Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  settingCategory: {
    type: String,
    required: true,
    enum: ['general', 'display', 'payment'], // Add categories as needed
  },
  settingKey: {
    type: String,
    required: true,
  },
  settingValue: {
    type: mongoose.Mixed, // Flexible type for strings, numbers, etc.
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', settingsSchema);
