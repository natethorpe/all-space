/*
 * File Path: backend/src/utils/taskDedupeUtils.js
 * Purpose: Provides deduplication logic for task-related operations in Allur Space Console.
 * How It Works:
 *   - Tracks generated files to prevent redundant generateFiles calls in fileGeneratorV18.js.
 *   - Uses an in-memory Set to store deduplication keys based on taskId and target.
 * Mechanics:
 *   - Generates unique keys for each taskId and target combination.
 *   - Provides methods to check and record generated files.
 * Dependencies:
 *   - ./logUtils: MongoDB logging utilities.
 * Dependents:
 *   - fileGeneratorV18.js: Uses hasGeneratedFile to deduplicate generateFiles calls.
 * Why It’s Here:
 *   - Modularizes deduplication logic for Sprint 2 maintainability (05/XX/2025).
 * Change Log:
 *   - 05/XX/2025: Created to handle deduplication for generateFiles calls.
 *     - Why: Prevent repeated generateFiles calls for the same taskId and target (User, 05/XX/2025).
 *     - How: Implemented in-memory Set for tracking generated files, added logging for deduplication events.
 *   - 05/XX/2025: Enhanced deduplication reliability.
 *     - Why: Ensure deduplication prevents redundant calls and persists across retries (User, 05/XX/2025).
 *     - How: Added clearGeneratedFile method, enhanced logging with attempt details, ensured dedupeKey uniqueness.
 *     - Test: Submit "Build CRM system" 5 times, verify single generateFiles call per target in idurar_db.logs, no redundant calls.
 * Test Instructions:
 *   - Run `npm start`, POST /grok/edit with "Build CRM system" (5 times): Verify idurar_db.logs shows single generateFiles call per target (e.g., Login, Dashboard), no redundant calls.
 *   - Check idurar_db.logs: Confirm deduplication logs with dedupeKey, no redundant generation logs.
 * Future Enhancements:
 *   - Persist deduplication state to MongoDB for scalability (Sprint 5).
 * Self-Notes:
 *   - Nate: Created to modularize deduplication logic for generateFiles (05/XX/2025).
 *   - Nate: Enhanced deduplication reliability with clearGeneratedFile and detailed logging (05/XX/2025).
 * Rollback Instructions:
 *   - If deduplication fails: Remove taskDedupeUtils.js (`rm backend/src/utils/taskDedupeUtils.js`), revert fileGeneratorV18.js to previous version.
 *   - Verify /grok/edit generates files without deduplication after rollback.
 */
const { logDebug, logWarn } = require('./logUtils');

// In-memory store for deduplication keys
const generatedFiles = new Set();

/**
 * Checks if a file has already been generated for the given taskId and target.
 * @param {string} dedupeKey - The deduplication key (taskId_target).
 * @returns {Promise<boolean>} True if file has been generated, false otherwise.
 */
async function hasGeneratedFile(dedupeKey) {
  const hasFile = generatedFiles.has(dedupeKey);
  await logDebug('Checked deduplication for file generation', 'taskDedupeUtils', {
    dedupeKey,
    hasFile,
    totalRecords: generatedFiles.size,
    timestamp: new Date().toISOString(),
  });
  return hasFile;
}

/**
 * Records a generated file for deduplication.
 * @param {string} dedupeKey - The deduplication key (taskId_target).
 */
async function recordGeneratedFile(dedupeKey) {
  generatedFiles.add(dedupeKey);
  await logDebug('Recorded generated file for deduplication', 'taskDedupeUtils', {
    dedupeKey,
    totalRecords: generatedFiles.size,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clears a deduplication record for a given taskId and target.
 * @param {string} dedupeKey - The deduplication key (taskId_target).
 */
async function clearGeneratedFile(dedupeKey) {
  const hadFile = generatedFiles.delete(dedupeKey);
  await logDebug('Cleared deduplication record', 'taskDedupeUtils', {
    dedupeKey,
    hadFile,
    totalRecords: generatedFiles.size,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { hasGeneratedFile, recordGeneratedFile, clearGeneratedFile };
