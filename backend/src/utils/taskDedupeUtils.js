/*
 * File Path: backend/src/utils/taskDedupeUtils.js
 * Purpose: Provides deduplication logic for task-related operations in Allur Space Console, preventing redundant file generation.
 * How It Works:
 *   - Uses an in-memory Map to track deduplication keys (taskId_target) with timestamps for expiry.
 *   - Supports hasGeneratedFile, recordGeneratedFile, clearGeneratedFile for deduplication lifecycle.
 *   - Logs deduplication events to idurar_db.logs for traceability.
 * Mechanics:
 *   - Dedupe keys combine taskId and target to ensure uniqueness per task and component.
 *   - Entries expire after 1 hour to prevent stale locks.
 *   - Validates inputs to prevent errors during deduplication.
 * Dependencies:
 *   - ./logUtils.js: MongoDB logging utilities for tracking deduplication events.
 * Dependents:
 *   - fileGeneratorV18.js: Uses deduplication to prevent repeated generateFiles calls.
 * Why It’s Here:
 *   - Modularizes deduplication logic for Sprint 2, addressing repeated generateFiles calls (05/01/2025).
 * Change Log:
 *   - 05/01/2025: Initialized deduplication with in-memory Set (Nate).
 *   - 05/03/2025: Enhanced with Map, expiry, and detailed logging (Nate).
 *     - Why: Prevent redundant generateFiles calls (User, 04/29/2025, taskId: cead1610-725b-4eb2-907e-4a23439edd6c).
 *     - How: Replaced Set with Map for timestamp tracking, added 1-hour expiry, improved logging.
 *     - Test: Submit "Build CRM system" 5 times, verify single generateFiles call per target in idurar_db.logs.
 * Test Instructions:
 *   - Run `npm start`, POST /api/grok/edit with "Build CRM system" 5 times.
 *   - Verify idurar_db.logs shows one generateFiles call per target (e.g., Login, Dashboard).
 *   - Check deduplication logs for dedupeKey, no redundant calls.
 * Future Enhancements:
 *   - Persist deduplication state to MongoDB for scalability (Sprint 5).
 * Self-Notes:
 *   - Nate: Enhanced deduplication with Map and expiry to ensure reliability (05/03/2025).
 * Rollback Instructions:
 *   - If deduplication fails, revert to previous Set-based version from backup.
 *   - Verify /api/grok/edit generates files without deduplication issues.
 */
const { logDebug, logWarn } = require('./logUtils');

// In-memory store for deduplication keys with timestamps
const generatedFiles = new Map(); // { dedupeKey: { timestamp } }
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour expiry

/**
 * Checks if a file has already been generated for the given taskId and target.
 * @param {string} dedupeKey - The deduplication key (taskId_target).
 * @returns {Promise<boolean>} True if file has been generated and not expired, false otherwise.
 */
async function hasGeneratedFile(dedupeKey) {
  if (!dedupeKey || typeof dedupeKey !== 'string') {
    await logWarn('Invalid dedupeKey provided', 'taskDedupeUtils', {
      dedupeKey: dedupeKey || 'missing',
      timestamp: new Date().toISOString(),
    });
    return false;
  }

  const entry = generatedFiles.get(dedupeKey);
  const now = Date.now();
  if (entry && now - entry.timestamp < EXPIRY_MS) {
    await logDebug('Deduped file generation', 'taskDedupeUtils', {
      dedupeKey,
      hasFile: true,
      ageSeconds: (now - entry.timestamp) / 1000,
      totalRecords: generatedFiles.size,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  if (entry) {
    generatedFiles.delete(dedupeKey); // Remove expired entry
    await logDebug('Removed expired dedupe entry', 'taskDedupeUtils', {
      dedupeKey,
      totalRecords: generatedFiles.size,
      timestamp: new Date().toISOString(),
    });
  }

  await logDebug('No dedupe entry found', 'taskDedupeUtils', {
    dedupeKey,
    hasFile: false,
    totalRecords: generatedFiles.size,
    timestamp: new Date().toISOString(),
  });
  return false;
}

/**
 * Records a generated file for deduplication.
 * @param {string} dedupeKey - The deduplication key (taskId_target).
 * @returns {Promise<void>}
 */
async function recordGeneratedFile(dedupeKey) {
  if (!dedupeKey || typeof dedupeKey !== 'string') {
    await logWarn('Invalid dedupeKey for recording', 'taskDedupeUtils', {
      dedupeKey: dedupeKey || 'missing',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  generatedFiles.set(dedupeKey, { timestamp: Date.now() });
  await logDebug('Recorded generated file for deduplication', 'taskDedupeUtils', {
    dedupeKey,
    totalRecords: generatedFiles.size,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clears a deduplication record for a given taskId and target.
 * @param {string} dedupeKey - The deduplication key (taskId_target).
 * @returns {Promise<void>}
 */
async function clearGeneratedFile(dedupeKey) {
  if (!dedupeKey || typeof dedupeKey !== 'string') {
    await logWarn('Invalid dedupeKey for clearing', 'taskDedupeUtils', {
      dedupeKey: dedupeKey || 'missing',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const hadFile = generatedFiles.delete(dedupeKey);
  await logDebug('Cleared deduplication record', 'taskDedupeUtils', {
    dedupeKey,
    hadFile,
    totalRecords: generatedFiles.size,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { hasGeneratedFile, recordGeneratedFile, clearGeneratedFile };
