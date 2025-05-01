/*
 * File Path: backend/src/utils/taskValidator.js
 * Purpose: Centralizes task and stagedFiles validation for Allur Space Console.
 * How It Works:
 *   - Provides isValidTaskId, isValidStagedFiles, isValidTask, and isValidFiles functions to ensure valid taskId, task data, and stagedFiles.
 *   - Logs validation failures to grok.log for debugging.
 * Mechanics:
 *   - isValidTaskId: Checks taskId is a string and matches UUID regex.
 *   - isValidStagedFiles: Verifies stagedFiles is a non-empty array of objects with path and content.
 *   - isValidTask: Validates taskId, prompt, and stagedFiles integrity.
 *   - isValidFiles: Alias for isValidStagedFiles for compatibility.
 * Dependencies:
 *   - winston: Logging to grok.log (version 3.17.0).
 * Dependents:
 *   - taskProcessorV18.js, taskManager.js, taskRoutes.js: Use for validation.
 * Why It’s Here:
 *   - Created for Sprint 2 to reduce validation duplication and fix stagedFiles errors (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Created to centralize validation logic.
 *   - 04/30/2025: Added isValidTask and isValidFiles to fix 500 error (Grok).
 *     - Why: TypeError: isValidTask is not a function in taskManager.js (User, 04/30/2025).
 *     - How: Added isValidTask to validate taskId, prompt, and stagedFiles; added isValidFiles as alias for isValidStagedFiles.
 *     - Test: POST /api/grok/edit with "Build CRM system", verify no 500 error, task created in idurar_db.tasks.
 * Test Instructions:
 *   - Run `npm start`, POST /api/grok/edit with "Build CRM system": Confirm no 500 error, task created in idurar_db.tasks.
 *   - Submit invalid taskId or empty stagedFiles: Verify error logs in grok.log.
 * Rollback Instructions:
 *   - Revert to taskValidator.js.bak (`mv backend/src/utils/taskValidator.js.bak backend/src/utils/taskValidator.js`).
 *   - Verify /api/grok/edit works post-rollback.
 * Future Enhancements:
 *   - Add schema validation for task fields (Sprint 4).
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

function isValidTask(taskId, prompt, stagedFiles) {
  const isValid = isValidTaskId(taskId) && 
                  typeof prompt === 'string' && prompt.trim().length > 0 && 
                  isValidStagedFiles(stagedFiles);
  if (!isValid) {
    logger.warn(`Invalid task: taskId=${taskId}, prompt=${prompt}, stagedFiles=${JSON.stringify(stagedFiles)}`, { stack: new Error().stack });
  }
  return isValid;
}

function isValidFiles(stagedFiles) {
  return isValidStagedFiles(stagedFiles);
}

module.exports = { isValidTaskId, isValidStagedFiles, isValidTask, isValidFiles };
