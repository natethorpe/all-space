/*
 * Purpose: Retrieves a single setting by settingKey from the Setting collection.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to verify model usage; update notes with query success/failure details.
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add caching (e.g., Redis) for frequent settingKey lookups.
 *     - Support returning multiple settings if settingKey is an array.
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Setting' (Chat Line 5000-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch (User logs, 20:41 UTC).
 *     - How: Changed 'Settings' to 'Setting' to match db.js.
 *     - Test: npm start, hit /api/settings/readBySettingKey/testKey.
 */

const mongoose = require('mongoose');
const Setting = mongoose.model('Setting'); // Changed from 'Settings'

const readBySettingKey = async (req, res) => {
  const settingKey = req.params.settingKey || undefined;

  if (!settingKey) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingKey provided',
    });
  }

  const result = await Setting.findOne({ settingKey });

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
      message: 'We found this document by this settingKey: ' + settingKey,
    });
  }
};

module.exports = readBySettingKey;
