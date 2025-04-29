/*
 * File Path: backend/src/utils/logUtils.js
 * Purpose: Centralizes MongoDB logging for Allur Space Console, replacing filesystem logging (grok.log, ERROR_LOG.md, etc.).
 * How It Works:
 *   - Provides functions (logInfo, logDebug, logWarn, logError) to log to idurar_db.logs using Log model.
 *   - Validates Log model, falls back to console if invalid.
 * Mechanics:
 *   - Uses Mongoose Log model for database logging.
 *   - Supports log levels (info, debug, warn, error) with context and details.
 * Dependencies:
 *   - mongoose: Log model for MongoDB operations (version 8.7.3).
 *   - db.js: getModel for Log model access.
 * Why It’s Here:
 *   - Created to unify MongoDB logging for Sprint 2, replacing winston and fileUtils.js logging (05/01/2025).
 * Change Log:
 *   - 05/01/2025: Created to unify logging across backend files.
 *   - 05/02/2025: Added Log model validation and console fallback.
 *     - Why: Log.create is not a function error during startup (User, 05/02/2025).
 *     - How: Validated Log model, added console fallback, cached Log model.
 *     - Test: Run `npm start`, verify idurar_db.logs shows startup logs, no Log.create errors.
 * Test Instructions:
 *   - Run `npm start`: Verify idurar_db.logs shows startup logs, no Log.create errors.
 *   - Call logError from taskManager.js: Confirm error logged with stack, context, timestamp.
 *   - Check idurar_db.logs: Confirm info, debug, warn, error logs with correct fields.
 * Future Enhancements:
 *   - Add log filtering endpoint (Sprint 4).
 *   - Support log analytics (e.g., error trends) (Sprint 5).
 * Self-Notes:
 *   - Nate: Created for MongoDB logging transition (05/01/2025).
 *   - Nate: Fixed Log.create error with validation and fallback (05/02/2025).
 */

const { getModel } = require('../db');

let LogModel = null;

async function initializeLogModel() {
  if (!LogModel) {
    try {
      LogModel = await getModel('Log');
      if (typeof LogModel.create !== 'function') {
        throw new Error('Log model invalid: Missing create method');
      }
    } catch (err) {
      console.error('logUtils.js: Failed to initialize Log model:', err.message, { timestamp: new Date().toISOString() });
      LogModel = null;
    }
  }
  return LogModel;
}

/**
 * Logs an info-level message to idurar_db.logs or console.
 * @param {string} message - The log message.
 * @param {string} context - The module or function context.
 * @param {Object} [details] - Additional details.
 * @returns {Promise<void>}
 */
async function logInfo(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      await Log.create({
        level: 'info',
        message,
        context,
        details,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.info('logUtils.js: [INFO]', { message, context, details, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logInfo failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

/**
 * Logs a debug-level message to idurar_db.logs or console.
 * @param {string} message - The log message.
 * @param {string} context - The module or function context.
 * @param {Object} [details] - Additional details.
 * @returns {Promise<void>}
 */
async function logDebug(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      await Log.create({
        level: 'debug',
        message,
        context,
        details,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.debug('logUtils.js: [DEBUG]', { message, context, details, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logDebug failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

/**
 * Logs a warn-level message to idurar_db.logs or console.
 * @param {string} message - The log message.
 * @param {string} context - The module or function context.
 * @param {Object} [details] - Additional details.
 * @returns {Promise<void>}
 */
async function logWarn(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      await Log.create({
        level: 'warn',
        message,
        context,
        details,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn('logUtils.js: [WARN]', { message, context, details, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logWarn failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

/**
 * Logs an error-level message to idurar_db.logs or console.
 * @param {string} message - The log message.
 * @param {string} context - The module or function context.
 * @param {Object} [details] - Additional details, including stack.
 * @returns {Promise<void>}
 */
async function logError(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      await Log.create({
        level: 'error',
        message,
        context,
        details: { ...details, stack: details.stack || new Error().stack },
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('logUtils.js: [ERROR]', { message, context, details: { ...details, stack: details.stack || new Error().stack }, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logError failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

module.exports = { logInfo, logDebug, logWarn, logError };
