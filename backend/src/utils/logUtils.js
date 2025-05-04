/*
 * File Path: backend/src/utils/logUtils.js
 * Purpose: Centralizes MongoDB logging for Allur Space Console, storing logs in idurar_db.logs.
 * How It Works:
 *   - Provides functions (logInfo, logDebug, logWarn, logError) to log to idurar_db.logs using Log model.
 *   - Validates Log model, falls back to console if invalid or unavailable.
 *   - Implements retry logic with exponential backoff to handle buffering timeouts.
 * Mechanics:
 *   - Uses mongoose.model to access Log model, avoiding circular dependencies.
 *   - Retries failed writes up to 3 times with 1s, 2s, 4s delays.
 *   - Validates inputs (message, context) to prevent invalid logs.
 * Dependencies:
 *   - mongoose: MongoDB ORM (version 8.13.2).
 * Why It's Here:
 *   - Unifies MongoDB logging for Sprint 2, fixing buffering timeout errors (User, 04/30/2025).
 * Change Log:
 *   - 05/01/2025: Created to unify logging across backend files (Nate).
 *   - 05/02/2025: Added Log model validation and console fallback (Nate).
 *   - 04/29/2025: Fixed circular dependency with db.js (Nate).
 *   - 04/29/2025: Fixed OverwriteModelError for Log model (Nate).
 *   - 04/30/2025: Optimized retry logic, added console fallback (Grok).
 *   - 05/04/2025: Increased timeout to 30s, improved retry delays (Grok).
 *     - Why: Persistent logs.insertOne() buffering timeout errors (User, 05/04/2025).
 *     - How: Set maxTimeMS to 30s, adjusted retry delays to 1s, 2s, 4s, added detailed error logging.
 *     - Test: Run `npm start`, submit task, verify idurar_db.logs, no timeout errors.
 * Test Instructions:
 *   - Run `npm start`: Confirm idurar_db.logs shows startup logs (e.g., "Server running on port 8888"), no buffering timeout errors.
 *   - POST /api/grok/edit with "Build CRM system": Verify task creation logs in idurar_db.logs, no timeouts.
 *   - Simulate MongoDB delay: Confirm console fallback logs, no crashes.
 *   - Check idurar_db.logs: Verify all log levels (info, debug, warn, error).
 * Rollback Instructions:
 *   - Revert to logUtils.js.bak (`mv backend/src/utils/logUtils.js.bak backend/src/utils/logUtils.js`).
 *   - Verify logs appear in idurar_db.logs post-rollback.
 * Future Enhancements:
 *   - Add log filtering endpoint (Sprint 4).
 *   - Support log analytics (Sprint 5).
 */

const mongoose = require('mongoose');

let Log = null;

async function initializeLogModel() {
  if (!Log) {
    try {
      const logSchema = new mongoose.Schema({
        level: String,
        message: String,
        context: String,
        details: Object,
        timestamp: { type: Date, default: Date.now },
      });
      Log = mongoose.model('Log', logSchema, 'logs');
      console.log('logUtils.js: Log model initialized', { timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('logUtils.js: Failed to initialize Log model', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      Log = null;
    }
  }
  return Log;
}

async function log(level, message, context, details) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const LogModel = await initializeLogModel();
    if (LogModel) {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          await LogModel.create(
            {
              level,
              message,
              context,
              details,
              timestamp: new Date(),
            },
            { maxTimeMS: 30000 } // 30s timeout
          );
          return;
        } catch (err) {
          attempt++;
          console.warn('logUtils.js: Log attempt failed', {
            attempt,
            maxAttempts,
            error: err.message,
            message,
            context,
            timestamp: new Date().toISOString(),
          });
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to log after ${maxAttempts} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // 1s, 2s, 4s
        }
      }
    } else {
      console.log(`logUtils.js: [${level.toUpperCase()}]`, { message, context, details, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: Log failed', {
      level,
      message,
      context,
      details,
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }
}

async function logInfo(message, context, details = {}) {
  await log('info', message, context, details);
}

async function logWarn(message, context, details = {}) {
  await log('warn', message, context, details);
}

async function logError(message, context, details = {}) {
  await log('error', message, context, { ...details, stack: details.stack || new Error().stack });
}

async function logDebug(message, context, details = {}) {
  if (process.env.NODE_ENV === 'development') {
    await log('debug', message, context, details);
  }
}

module.exports = { logInfo, logWarn, logError, logDebug };
