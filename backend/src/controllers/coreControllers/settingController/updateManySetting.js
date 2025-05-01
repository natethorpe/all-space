/*
 * Purpose: Updates multiple settings in the Setting collection via bulk write.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to log bulk updates; update notes with operation outcomes.
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add transaction support for atomic updates.
 *     - Optimize with bulkWrite options (e.g., ordered: false).
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Setting' (Chat Line 5000-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch (User logs, 20:41 UTC).
 *     - How: Changed 'Settings' to 'Setting'.
 *     - Test: npm start, hit /api/settings/updateManySetting with { "settings": [{ "settingKey": "test", "settingValue": "value" }] }.
 */

const mongoose = require('mongoose');
const Setting = mongoose.model('Setting'); // Changed from 'Settings'

const updateManySetting = async (req, res) => {
  let settingsHasError = false;
  const updateDataArray = [];
  const { settings } = req.body;

  if (!settings || !Array.isArray(settings) || settings.length === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settings provided',
    });
  }

  for (const setting of settings) {
    if (!setting.hasOwnProperty('settingKey') || !setting.hasOwnProperty('settingValue')) {
      settingsHasError = true;
      break;
    }

    const { settingKey, settingValue } = setting;
    updateDataArray.push({
      updateOne: {
        filter: { settingKey },
        update: { settingValue },
      },
    });
  }

  if (settingsHasError) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'Settings provided has Error',
    });
  }

  const result = await Setting.bulkWrite(updateDataArray);

  if (!result || result.nMatched < 1) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No settings found to update',
    });
  } else {
    return res.status(200).json({
      success: true,
      result: [],
      message: 'We updated all settings',
    });
  }
};

module.exports = updateManySetting;
