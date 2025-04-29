/*
 * File Path: backend/src/controllers/middlewaresControllers/createCRUDController/index.js
 * Purpose: Middleware generator for creating standardized CRUD controllers for models in IDURAR ERP CRM.
 * How It Works:
 *   - Generates a controller object with CRUD methods (create, read, update, delete, list, listAll, search, filter, summary) tailored to a specified model (e.g., Setting).
 *   - Validates the modelName against available models in modelsFiles to ensure the model exists.
 *   - Delegates to specific CRUD method implementations (create.js, read.js, update.js, remove.js, etc.).
 *   - Logs controller initialization and errors to grok.log for debugging and traceability.
 * Mechanics:
 *   - Takes a modelName parameter (e.g., 'Setting') and returns an object with CRUD methods.
 *   - Checks if modelName exists in modelsFiles from utils.js to prevent invalid model usage.
 *   - Methods are bound to the Mongoose Model instance for the specified modelName.
 * Dependencies:
 *   - mongoose: For model access and MongoDB operations (version 8.7.0).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - path: File path manipulation for log file (version built-in).
 *   - utils: Provides modelsFiles array for model validation (src/models/utils.js).
 *   - create.js, read.js, update.js, remove.js, search.js, filter.js, summary.js, listAll.js, paginatedList.js: Individual CRUD method implementations.
 * Dependents:
 *   - settingController/index.js: Uses createCRUDController to generate Setting controller methods.
 *   - coreApi.js: Indirectly uses controller methods via settingController for /api/settings routes.
 *   - app.js: Indirectly uses controller via coreApi.js for /api routes.
 * Why It’s Here:
 *   - Centralizes CRUD controller logic for models like Setting, reducing code duplication (04/08/2025).
 *   - Supports Sprint 2 settings management for Woodkey Festival and Hi-Way Drive-In use cases.
 *   - Resolves MODULE_NOT_FOUND error for @/models/utils by using correct relative path (04/23/2025).
 * Key Info:
 *   - Validates model existence using modelsFiles to ensure robust operation.
 *   - Provides standardized CRUD methods for settings routes (/api/settings/*).
 *   - Logs initialization and errors to grok.log for traceability.
 * Change Log:
 *   - 04/08/2025: Created to centralize CRUD controller logic for settings.
 *     - Why: Support settings management for CRM (User, 04/08/2025).
 *     - How: Implemented with individual CRUD method files, validated modelName.
 *     - Test: GET /api/settings/listAll, verify settings data; POST /api/settings/create, confirm creation.
 *   - 04/23/2025: Fixed import path for utils.
 *     - Why: Resolve MODULE_NOT_FOUND error for @/models/utils (User, 04/23/2025).
 *     - How: Changed import to relative path ../../../models/utils.
 *     - Test: Run `npm start`, verify server starts, no MODULE_NOT_FOUND, settings routes respond.
 * Test Instructions:
 *   - Run `npm start`: Confirm server starts, grok.log logs “Mounted /api successfully”, no MODULE_NOT_FOUND errors.
 *   - POST /api/settings/create: Verify 200 response with created setting (uses create.js).
 *   - GET /api/settings/listAll: Confirm 200 response with settings list (uses listAll.js).
 *   - GET /api/settings/list?page=1&items=10: Confirm 200 response with paginated list (uses paginatedList.js).
 *   - GET /api/settings/read/:id: Verify 200 response with setting data (uses read.js).
 *   - PATCH /api/settings/update/:id: Confirm 200 response, update success (uses update.js).
 *   - DELETE /api/settings/:id: Verify 200 response, mock removal (uses remove.js).
 *   - GET /api/settings/search?q=test: Confirm 200 response with mock search results (uses search.js).
 *   - GET /api/settings/filter?field=test: Confirm 200 response with mock filter results (uses filter.js).
 *   - GET /api/settings/summary: Confirm 200 response with mock summary data (uses summary.js).
 *   - Check grok.log: Confirm controller initialization, request logs, no import errors.
 * Future Enhancements:
 *   - Add caching for listAll and paginatedList with Redis (Sprint 4).
 *   - Support advanced filtering for search and filter methods (Sprint 4).
 *   - Integrate audit logging for CRUD actions (Sprint 5).
 *   - Add bulk CRUD operations (e.g., bulk create, update) (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed import path for utils, resolving MODULE_NOT_FOUND error (04/23/2025).
 *   - Nate: Integrated mock implementations for all CRUD methods to ensure server startup (04/23/2025).
 *   - Nate: Ensured compatibility with settingController and coreApi.js routes (04/23/2025).
 *   - Nate: Added comprehensive notes for clarity, scalability, and alignment with IDURAR ERP CRM goals (04/23/2025).
 */
const mongoose = require('mongoose');
const winston = require('winston');
const path = require('path');
const { modelsFiles } = require('../../../models/utils'); // Corrected relative path

const create = require('./create');
const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const search = require('./search');
const filter = require('./filter');
const summary = require('./summary');
const listAll = require('./listAll');
const paginatedList = require('./paginatedList');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

const createCRUDController = (modelName) => {
  logger.info(`Initializing CRUD controller for ${modelName}`);
  
  if (!modelsFiles.includes(modelName)) {
    logger.error(`Model ${modelName} does not exist`, { modelName });
    throw new Error(`Model ${modelName} does not exist`);
  }

  const Model = mongoose.model(modelName);
  let crudMethods = {
    create: (req, res) => create(Model, req, res),
    read: (req, res) => read(Model, req, res),
    update: (req, res) => update(Model, req, res),
    delete: (req, res) => remove(Model, req, res),
    list: (req, res) => paginatedList(Model, req, res),
    listAll: (req, res) => listAll(Model, req, res),
    search: (req, res) => search(Model, req, res),
    filter: (req, res) => filter(Model, req, res),
    summary: (req, res) => summary(Model, req, res),
  };
  return crudMethods;
};

module.exports = createCRUDController;
