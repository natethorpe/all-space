/*
 * Purpose: Middleware to fetch all non-removed settings from the Setting collection.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to log fetch results; update notes with success rates (e.g., "Fetched X settings on Y date").
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add filtering options (e.g., by category) for more specific queries.
 *     - Cache results in memory for faster repeated calls.
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Settings' (Chat Line 5200).
 *   - 04/08/2025 (Tonight): Changed model name to 'Setting' (Chat Line 6300-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch after consolidating to db.js (User logs, 20:47 UTC).
 *     - How: Updated 'Settings' to 'Setting'.
 *     - Test: npm start, check loadSettings usage or direct call if exposed.
 */

const mongoose = require('mongoose');
const Setting = mongoose.model('Setting'); // Changed from 'Settings'

const listAllSettings = async () => {
  try {
    const result = await Setting.find({
      removed: false,
    }).exec();

    if (result.length > 0) {
      return result;
    } else {
      return [];
    }
  } catch {
    return [];
  }
};

module.exports = listAllSettings;
