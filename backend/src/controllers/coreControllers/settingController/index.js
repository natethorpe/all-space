/*
 * Purpose: Centralizes setting controller methods for CRUD and custom operations.
 * Dependencies: createCRUDController, custom method files
 * Notes:
 *   - Uses 'Setting' model (singular) from db.js.
 *   - Grok Programming Machine: Read this file to track controller methods; update notes with method usage stats.
 *   - Nate & Grok: Reevaluate for future updates:
 *     - Add bulk update endpoint for multiple settings.
 *     - Integrate with a settings cache for performance.
 * Change Log:
 *   - 04/08/2025: Updated to use 'Setting' model (Chat Line 4800-ish).
 *     - Why: Align with db.js to fix schema mismatch (User logs, 20:41 UTC).
 *     - How: Adjusted CRUD controller to 'Setting'.
 *     - Test: npm start, check /api/settings/listAll.
 */

const createCRUDController = require('../../../controllers/middlewaresControllers/createCRUDController');
const listBySettingKey = require('./listBySettingKey');
const readBySettingKey = require('./readBySettingKey');
const updateBySettingKey = require('./updateBySettingKey');
const updateManySetting = require('./updateManySetting');
const listAll = require('./listAll');

console.log('settingController loaded');

const crudController = createCRUDController('Setting'); // Changed from 'Settings'

const settingMethods = {
  read: crudController.read,
  create: crudController.create,
  update: crudController.update,
  list: crudController.list,
  filter: crudController.filter,
  search: crudController.search,
  listAll,
  listBySettingKey,
  readBySettingKey,
  updateBySettingKey,
  updateManySetting,
};

module.exports = settingMethods;
