/*
 * Purpose: Lists all non-private, non-removed settings from the Setting collection.
 * Dependencies: mongoose
 * Notes:
 *   - Uses 'Setting' model (singular) as defined in db.js.
 *   - Grok Programming Machine: Read this file to log query results; update notes with fetch success rates.
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add filtering by category for better UX.
 *     - Consider indexing settingKey for faster queries.
 * Change Log:
 *   - 04/08/2025: Fixed model name to 'Setting' (Chat Line 4800-ish).
 *     - Why: MissingSchemaError due to 'Settings' mismatch (User logs, 20:41 UTC).
 *     - How: Changed to 'Setting' to match db.js.
 *     - Test: npm start, hit /api/settings/listAll.
 */

const mongoose = require('mongoose');
const Setting = mongoose.model('Setting'); // Changed from 'Settings'

const listAll = async (req, res) => {
  console.log('listAll executed');
  try {
    const sort = parseInt(req.query.sort) || 'desc';
    const result = await Setting.find({
      removed: false,
      isPrivate: false,
    }).sort({ created: sort });

    console.log('listAll result:', result.length);

    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        message: 'Collection is Empty',
      });
    }
  } catch (error) {
    console.error('listAll error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = listAll;
