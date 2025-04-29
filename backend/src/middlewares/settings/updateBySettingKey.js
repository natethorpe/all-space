// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\middlewares\settings\updateBySettingKey.js
/*
 * Purpose: Middleware to update a setting by settingKey in the Setting collection.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to track updates; update notes with success/failure stats (e.g., "Updated settingKey: X, New Value: Y").
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add validation for settingValue based on settingCategory (e.g., enum checks).
 *     - Support partial updates with $set for specific fields beyond settingValue.
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Settings' (Chat Line 5100).
 *   - 04/08/2025 (Tonight): Changed model name to 'Setting' (Chat Line 6300-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch after consolidating to db.js (User logs, 20:47 UTC).
 *     - How: Updated 'Settings' to 'Setting'.
 *     - Test: npm start, hit an endpoint using this middleware (e.g., /api/settings/updateBySettingKey/testKey with { "settingValue": "test" }).
 */

const mongoose = require('mongoose');
const Setting = mongoose.model('Setting'); // Changed from 'Settings'

const updateBySettingKey = async (req, res) => {
  const settingKey = req.params.settingKey || undefined;

  if (!settingKey) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingKey provided',
    });
  }
  const { settingValue } = req.body;

  if (!settingValue) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingValue provided',
    });
  }
  const result = await Setting.findOneAndUpdate(
    { settingKey },
    { settingValue },
    { new: true, runValidators: true }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found by this settingKey: ' + settingKey,
    });
  } else {
    return res.status(200).json({
      success: true,
      result,
      message: 'We updated this document by this settingKey: ' + settingKey,
    });
  }
};

module.exports = updateBySettingKey;
