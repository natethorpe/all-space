/*
 * Purpose: Middleware to increment a numeric settingValue by settingKey in the Setting collection.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to log increment operations; update notes with success/failure (e.g., "Incremented settingKey: X to Y").
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add validation to ensure settingValue is numeric before incrementing.
 *     - Support custom increment values beyond +1.
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Settings' (Chat Line 5200).
 *   - 04/08/2025 (Tonight): Changed model name to 'Setting' (Chat Line 6300-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch after consolidating to db.js (User logs, 20:47 UTC).
 *     - How: Updated 'Settings' to 'Setting'.
 *     - Test: npm start, check increment works without schema errors.
 */

const mongoose = require('mongoose');
const Setting = mongoose.model('Setting'); // Changed from 'Settings'

const increaseBySettingKey = async ({ settingKey }) => {
  try {
    if (!settingKey) {
      return null;
    }

    const result = await Setting.findOneAndUpdate(
      { settingKey },
      { $inc: { settingValue: 1 } },
      { new: true, runValidators: true }
    ).exec();

    if (!result) {
      return null;
    } else {
      return result;
    }
  } catch {
    return null;
  }
};

module.exports = increaseBySettingKey;
