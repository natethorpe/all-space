/*
 * File Path: backend/src/utils/taskValidator.js
 * Purpose: Centralizes task and stagedFiles validation for Allur Space Console.
 * How It Works:
 *   - Provides isValidTaskId and isValidStagedFiles functions to ensure valid taskId and stagedFiles data.
 *   - Logs validation failures to grok.log for debugging.
 * Mechanics:
 *   - isValidTaskId: Checks taskId is a string and matches UUID regex.
 *   - isValidStagedFiles: Verifies stagedFiles is a non-empty array of objects with path and content.
 * Dependencies:
 *   - winston: Logging to grok.log (version 3.17.0).
 * Dependents:
 *   - taskProcessorV18.js, taskManager.js, taskRoutes.js: Use for validation.
 * Why It’s Here:
 *   - Created for Sprint 2 to reduce validation duplication and fix stagedFiles errors (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Created to centralize validation logic.
 *     - Why: Fix stagedFiles undefined errors and improve modularity (User, 04/23/2025).
 *     - How: Implemented isValidTaskId, isValidStagedFiles with logging.
 *     - Test: Submit "Build CRM system", verify no invalid stagedFiles errors.
 * Test Instructions:
 *   - Run `npm start`, submit "Build CRM system": Confirm no validation errors in grok.log.
 *   - Submit invalid taskId or empty stagedFiles: Verify error logs in grok.log.
 * Future Enhancements:
 *   - Add schema validation for task fields (Sprint 4).
 * Self-Notes:
 *   - Nate: Created for Sprint 2 modularity and reliability (04/23/2025).
 */
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

function isValidTaskId(taskId) {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) {
    logger.warn(`Invalid taskId: ${taskId || 'missing'}`, { stack: new Error().stack });
  }
  return isValid;
}

function isValidStagedFiles(stagedFiles) {
  const isValid = Array.isArray(stagedFiles) && stagedFiles.length > 0 && stagedFiles.every(file => 
    file && typeof file === 'object' && typeof file.path === 'string' && typeof file.content === 'string'
  );
  if (!isValid) {
    logger.warn(`Invalid stagedFiles: ${JSON.stringify(stagedFiles)}`, { stack: new Error().stack });
  }
  return isValid;
}

module.exports = { isValidTaskId, isValidStagedFiles };