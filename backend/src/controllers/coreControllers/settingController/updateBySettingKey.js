/*
 * Purpose: Updates a setting by settingKey in the Setting collection.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to track updates; update notes with success/failure stats.
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add validation for settingValue based on settingCategory.
 *     - Support partial updates with $set.
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Setting' (Chat Line 5000-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch (User logs, 20:41 UTC).
 *     - How: Changed 'Settings' to 'Setting'.
 *     - Test: npm start, hit /api/settings/updateBySettingKey/testKey with { "settingValue": "test" }.
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
