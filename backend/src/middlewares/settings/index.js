/*
 * Purpose: Exports settings middleware functions for use in routes.
 * Dependencies: Custom middleware files in src/middlewares/settings/
 * Notes:
 *   - Aggregates settings-related middleware; all use 'Setting' model from db.js.
 *   - Grok Programming Machine: Read this file to track middleware usage; update notes with call frequency or errors (e.g., "Loaded X times, Last Error: Y").
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add logging middleware to track settings access patterns for optimization.
 *     - Consider middleware composition for reusable validation or error handling logic.
 * Change Log:
 *   - 04/08/2025: Updated to export fixed middleware (Chat Line 5100).
 *   - 04/08/2025: Adjusted exports for new files (Chat Line 5200).
 *   - 04/08/2025: Finalized exports with updateManySetting (Chat Line 5300).
 *   - 04/08/2025 (Tonight): Updated notes to reflect 'Setting' model (Chat Line 6300-ish).
 *     - Why: Align with db.js after schema consolidation (User logs, 20:47 UTC).
 *     - How: Kept exports, updated comments.
 *     - Test: npm start, ensure no schema errors during startup.
 */

const listBySettingKey = require('./listBySettingKey');
const readBySettingKey = require('./readBySettingKey');
const listAllSettings = require('./listAllSettings');
const updateBySettingKey = require('./updateBySettingKey');
const increaseBySettingKey = require('./increaseBySettingKey');
const loadSettings = require('./loadSettings');
const updateManySetting = require('./updateManySetting');

module.exports = {
  loadSettings,
  listAllSettings,
  listBySettingKey,
  readBySettingKey,
  updateBySettingKey,
  increaseBySettingKey,
  updateManySetting,
};
