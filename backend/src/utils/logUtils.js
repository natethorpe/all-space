/*
 * File Path: backend/src/utils/logUtils.js
 * Purpose: Centralizes MongoDB logging for Allur Space Console, storing logs in idurar_db.logs.
 * How It Works:
 *   - Provides functions (logInfo, logDebug, logWarn, logError) to log to idurar_db.logs using Log model.
 *   - Validates Log model, falls back to console if invalid or unavailable.
 *   - Implements retry logic with exponential backoff to handle buffering timeouts.
 * Mechanics:
 *   - Uses db.js getModel to access Log model, avoiding circular dependencies.
 *   - Retries failed writes up to 3 times with 500ms, 1s, 2s delays.
 *   - Validates inputs (message, context) to prevent invalid logs.
 * Dependencies:
 *   - db.js: getModel for Log model access.
 * Why It's Here:
 *   - Unifies MongoDB logging for Sprint 2, fixing buffering timeout errors (User, 04/30/2025).
 * Change Log:
 *   - 05/01/2025: Created to unify logging across backend files (Nate).
 *   - 05/02/2025: Added Log model validation and console fallback (Nate).
 *   - 04/29/2025: Fixed circular dependency with db.js (Nate).
 *   - 04/29/2025: Fixed OverwriteModelError for Log model (Nate).
 *   - 04/30/2025: Aligned with provided version, optimized retry logic (Grok).
 *     - Why: Fix operation logs.insertOne() buffering timed out (User, 04/30/2025).
 *     - How: Simplified retry logic, ensured console fallback, aligned with provided code.
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

let LogModel = null;

async function initializeLogModel() {
  if (!LogModel) {
    try {
      const { getModel } = require('../db'); // Deferred import to avoid circular dependency
      LogModel = await getModel('Log');
      if (typeof LogModel.create !== 'function') {
        throw new Error('Log model invalid: Missing create method');
      }
      console.info('logUtils.js: Log model initialized', { timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('logUtils.js: Failed to initialize Log model:', err.message, { timestamp: new Date().toISOString() });
      LogModel = null;
    }
  }
  return LogModel;
}

async function logInfo(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          await Log.create({
            level: 'info',
            message,
            context,
            details,
            timestamp: new Date().toISOString(),
          });
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to log after ${maxAttempts} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    } else {
      console.info('logUtils.js: [INFO]', { message, context, details, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logInfo failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

async function logDebug(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          await Log.create({
            level: 'debug',
            message,
            context,
            details,
            timestamp: new Date().toISOString(),
          });
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to log after ${maxAttempts} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    } else {
      console.debug('logUtils.js: [DEBUG]', { message, context, details, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logDebug failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

async function logWarn(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          await Log.create({
            level: 'warn',
            message,
            context,
            details,
            timestamp: new Date().toISOString(),
          });
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to log after ${maxAttempts} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    } else {
      console.warn('logUtils.js: [WARN]', { message, context, details, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logWarn failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

async function logError(message, context, details = {}) {
  try {
    if (!message || typeof message !== 'string' || !context || typeof context !== 'string') {
      throw new Error('Invalid log message or context');
    }
    const Log = await initializeLogModel();
    if (Log) {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          await Log.create({
            level: 'error',
            message,
            context,
            details: { ...details, stack: details.stack || new Error().stack },
            timestamp: new Date().toISOString(),
          });
          break;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to log after ${maxAttempts} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    } else {
      console.error('logUtils.js: [ERROR]', { message, context, details: { ...details, stack: details.stack || new Error().stack }, timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('logUtils.js: logError failed:', err.message, { message, context, details, timestamp: new Date().toISOString() });
  }
}

module.exports = { logInfo, logDebug, logWarn, logError };
