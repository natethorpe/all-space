/*
 * File Path: backend/src/controllers/coreControllers/settingController/listBySettingKey.js
 * Purpose: Retrieves settings by key from the Setting collection for IDURAR ERP/CRM backend.
 * How It Works:
 *   - Handles GET /api/settings/:key to fetch settings from the Setting model.
 *   - Queries the Setting model using the provided key.
 *   - Returns the setting value(s) or an empty array if not found.
 * Mechanics:
 *   - Uses async/await for MongoDB queries.
 *   - Logs query execution and errors to grok.log.
 * Dependencies:
 *   - winston: Logging (version 3.17.0).
 *   - ../db: MongoDB ORM via getModel (version 8.7.3).
 * Dependents:
 *   - coreApi.js: Mounts this controller in /api/settings routes.
 * Why It’s Here:
 *   - Supports configuration management for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Created to handle setting retrieval by key.
 *   - 04/08/2025: Fixed model name to 'Setting'.
 *     - Why: MissingSchemaError due to 'Settings' mismatch with db.js (User, 04/08/2025).
 *     - How: Changed 'Settings' to 'Setting' to align with db.js.
 *   - 04/30/2025: Fixed schema access and aligned with Setting schema.
 *     - Why: Potential MissingSchemaError due to direct mongoose.model usage; query used incorrect settingKey field (User, 04/30/2025).
 *     - How: Used getModel('Setting'), updated query to use key field, removed removed field check, adjusted status codes, enhanced logging.
 *     - Test: Run `npm start`, GET /api/settings/theme, verify 200 response with setting value or empty array, grok.log shows query execution.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, no MissingSchemaError.
 *   - GET http://localhost:8888/api/settings/theme: Confirm 200 response with setting value or empty array.
 *   - Check grok.log: Confirm query execution log, no schema errors.
 * Future Enhancements:
 *   - Add caching (e.g., Redis) for frequent key lookups (Sprint 4).
 *   - Add pagination for large setting lists (Sprint 5).
 * Self-Notes:
 *   - Nate: Created setting retrieval logic for Sprint 2 (04/07/2025).
 *   - Nate: Fixed model name to Setting (04/08/2025).
 *   - Nate: Fixed schema access with getModel, aligned query with schema (04/30/2025).
 */
const winston = require('winston');
const path = require('path');
const { getModel } = require('../../../db');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../../../grok.log'), maxsize: 1024 * 1024 * 50 }),
    new winston.transports.Console(),
  ],
});

const Setting = getModel('Setting');

const listBySettingKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { sort = 'desc' } = req.query;
    logger.info(`Fetching setting by key: ${key}`, { sort, timestamp: new Date().toISOString() });

    const result = await Setting.find({ key }).sort({ createdAt: sort });
    logger.debug(`Setting query result: ${JSON.stringify(result)}`, { key, timestamp: new Date().toISOString() });

    return res.status(200).json({
      success: true,
      result,
      message: result.length > 0 ? 'Successfully found settings by key' : 'No settings found for this key',
    });
  } catch (error) {
    logger.error(`Error fetching setting: ${error.message}`, { key: req.params.key, stack: error.stack, timestamp: new Date().toISOString() });
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = listBySettingKey;
