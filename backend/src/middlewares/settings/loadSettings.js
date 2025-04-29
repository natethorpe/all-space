// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\middlewares\settings\loadSettings.js
/*
 * Purpose: Middleware to load all settings into a key-value object from the Setting collection.
 * Dependencies: listAllSettings
 * Notes:
 *   - Relies on listAllSettings, which uses 'Setting' model from db.js.
 *   - Grok Programming Machine: Read this file to track settings object creation; update notes with load success (e.g., "Loaded X settings, Keys: [Y, Z]").
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add memoization to avoid repeated DB calls within a session.
 *     - Support selective key loading based on a filter parameter.
 * Change Log:
 *   - 04/08/2025: Updated to use fixed listAllSettings (Chat Line 5200).
 *   - 04/08/2025 (Tonight): Updated notes to reflect 'Setting' model (Chat Line 6300-ish).
 *     - Why: Align with db.js after schema consolidation (User logs, 20:47 UTC).
 *     - How: No code change, updated comments.
 *     - Test: npm start, check if settings load without schema errors.
 */

const listAllSettings = require('./listAllSettings');

const loadSettings = async () => {
  const allSettings = {};
  const datas = await listAllSettings();
  datas.forEach(({ settingKey, settingValue }) => {
    allSettings[settingKey] = settingValue;
  });
  return allSettings;
};

module.exports = loadSettings;