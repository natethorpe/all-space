/*
 * Purpose: Middleware to fetch settings by settingKey array from the Setting collection.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to verify model usage; update notes with query success/failure details (e.g., "Fetched X settings for keys: [Y, Z]").
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add caching (e.g., Redis) for frequent settingKey lookups to improve performance.
 *     - Support regex-based key matching for flexible queries.
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Settings' (Chat Line 5100).
 *   - 04/08/2025 (Tonight): Changed model name to 'Setting' (Chat Line 6300-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch after consolidating to db.js (User logs, 20:47 UTC).
 *     - How: Updated 'Settings' to 'Setting' to match db.js.
 *     - Impact: Resolves schema error, aligns with centralized schema.
 *     - Test: npm start, hit /api/settings/listBySettingKey?settingKeyArray=test1,test2.
 */

const mongoose = require('mongoose');
const Setting = mongoose.model('Setting'); // Changed from 'Settings'

const listBySettingKey = async (req, res) => {
  const settingKeyArray = req.query.settingKeyArray ? req.query.settingKeyArray.split(',') : [];

  if (settingKeyArray.length === 0) {
    return res.status(202).json({
      success: false,
      result: [],
      message: 'Please provide settings you need',
    });
  }

  const settingsToShow = { $or: [] };
  for (const settingKey of settingKeyArray) {
    settingsToShow.$or.push({ settingKey });
  }

  let results = await Setting.find({
    ...settingsToShow,
    removed: false,
  });

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(202).json({
      success: false,
      result: [],
      message: 'No document found by this request',
    });
  }
};

module.exports = listBySettingKey;
