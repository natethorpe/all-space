/*
 * File Path: backend/src/db.js
 * Purpose: Initializes MongoDB connection and registers Mongoose schemas for Allur Space Console.
 * How It Works:
 *   - Connects to MongoDB (idurar_db) with mongoose and retry logic.
 *   - Defines schemas for Task, Admin, AdminPassword, Sponsor, Memory, BackendProposal, Setting, Log.
 *   - Registers schemas with unique indexes and provides getModel for safe access.
 *   - Prevents model overwrite errors by checking existing models.
 * Mechanics:
 *   - Uses mongoose.connect with 5 retry attempts for connection stability.
 *   - Validates model methods (create, findOne) before returning.
 *   - Logs schema registration and database name to idurar_db.logs for debugging.
 * Dependencies:
 *   - mongoose: MongoDB ORM (version 8.13.2).
 *   - ./utils/logUtils: MongoDB logging (deferred import to avoid circular dependency).
 * Why It's Here:
 *   - Centralizes database setup for Sprint 2, fixing OverwriteModelError and circular dependencies (User, 04/29/2025).
 * Change Log:
 *   - 04/07/2025: Initialized MongoDB connection and schemas (Nate).
 *   - 04/23/2025: Added retry logic for connection (Nate).
 *   - 04/29/2025: Fixed Task.find is not a function error (Nate).
 *   - 04/29/2025: Fixed circular dependency with logUtils.js (Nate).
 *   - 04/29/2025: Fixed OverwriteModelError for Log model (Nate).
 *   - 04/30/2025: Corrected truncated code, ensured complete functions (Grok).
 *   - 05/08/2025: Added originalContent and newContent to Task schema (Grok).
 *   - 05/08/2025: Fixed Map casting error for originalContent and newContent (Grok).
 *   - 05/08/2025: Added database name logging, standardized on idurar_db (Grok).
 *   - 05/08/2025: Fixed invalid writeConcern in MongoDB URI (Grok).
 *   - 05/06/2025: Reapplied correct URI with enhanced validation (Grok).
 *   - 05/06/2025: Strengthened URI validation to catch malformed URIs (Grok).
 *   - 05/06/2025: Enhanced URI validation for spaces and invalid characters (Grok).
 *   - 05/06/2025: Further strengthened URI validation to reject spaces explicitly (Grok).
 *     - Why: Persistent MongoParseError due to malformed DATABASE_URI with .env content (User, 05/06/2025).
 *     - How: Added explicit space check first, clarified error message, preserved all functionality.
 *     - Test: Run `npm start`, verify "MongoDB connected to idurar_db" in grok.log, no MongoParseError.
 * Test Instructions:
 *   - Apply updated db.js, ensure backend/.env includes DATABASE_URI=mongodb://localhost:27017/idurar_db.
 *   - Run `npm start`: Verify console shows "MongoDB connected to idurar_db", "Task schema registered", no OverwriteModelError.
 *   - GET /api/grok/tasks: Confirm 200 response, tasks in idurar_db.tasks.
 *   - POST /api/grok/edit with "Build CRM system": Verify task in idurar_db.tasks, logs in idurar_db.logs.
 *   - Check idurar_db.logs: Confirm schema registration, database name, no buffering timeouts.
 * Rollback Instructions:
 *   - Revert to db.js.bak (`copy backend\src\db.js.bak backend\src\db.js`).
 *   - Verify MongoDB connects and models are accessible (may fail if URI incorrect).
 * Future Enhancements:
 *   - Add connection pooling (Sprint 4).
 *   - Support sharding (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed circular dependencies and model errors (04/29/2025).
 *   - Grok: Enhanced MongoDB URI validation for malformed inputs (05/06/2025).
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.DATABASE_URI || 'mongodb://localhost:27017/idurar_db?w=1&journal=true&wtimeoutMS=30000';
const registeredModels = new Map();

// Validate MongoDB URI
function validateMongoDBUri(uri) {
  try {
    // Check for spaces first
    if (uri.includes(' ')) {
      throw new Error('URI contains spaces: ensure DATABASE_URI in .env is correctly formatted (e.g., mongodb://localhost:27017/idurar_db)');
    }
    // Basic URI format check
    if (!uri.startsWith('mongodb://')) {
      throw new Error('URI must start with mongodb://');
    }
    // Check for invalid characters
    if (/[^a-zA-Z0-9:/?=&_-]/.test(uri)) {
      throw new Error('URI contains invalid characters');
    }
    // Check for invalid writeConcern-like patterns
    if (uri.includes('writeConcern={')) {
      throw new Error('Invalid writeConcern format in URI: use w=1&journal=true&wtimeoutMS=30000');
    }
    // Ensure database name is present
    const match = uri.match(/\/([^\?]+)(\?|$)/);
    if (!match || !match[1]) {
      throw new Error('Database name missing in URI');
    }
    // Check for valid query parameters
    const queryParams = uri.split('?')[1] || '';
    if (queryParams && !/^(w=\d+&journal=(true|false)&wtimeoutMS=\d+)?$/.test(queryParams)) {
      throw new Error('Invalid query parameters in URI');
    }
    console.info('db.js: MongoDB URI validated', { uri, timestamp: new Date().toISOString() });
    return true;
  } catch (err) {
    console.error(`db.js: Invalid MongoDB URI: ${err.message}`, {
      uri,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

const schemas = {
  Task: new mongoose.Schema({
    taskId: { type: String, required: true, unique: true },
    prompt: { type: String, required: true },
    status: { type: String, default: 'pending' },
    files: [{ type: String }],
    stagedFiles: [{ path: String, content: String }],
    error: { type: String },
    originalContent: { type: Object, default: {} },
    newContent: { type: Object, default: {} },
    testInstructions: { type: String, default: '' },
    testUrl: { type: String },
    uploadedFiles: [{ type: String }],
    proposedChanges: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
    geolocation: { latitude: Number, longitude: Number },
  }, { timestamps: true }),

  Admin: new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    name: { type: String },
    tierAccess: [{ type: String }],
    removed: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    created: { type: Date, default: Date.now },
  }, { timestamps: true }),

  AdminPassword: new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    token: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }, { timestamps: true }),

  Sponsor: new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    tier: { type: String },
    fit_score: { type: Number },
    est_cost: { type: Number },
    createdAt: { type: Date, default: Date.now },
  }, { timestamps: true }),

  Memory: new mongoose.Schema({
    taskId: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }, { timestamps: true }),

  BackendProposal: new mongoose.Schema({
    taskId: { type: String, required: true, index: true },
    file: { type: String, required: true },
    content: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  }, { timestamps: true }),

  Setting: new mongoose.Schema({
    settingCategory: { type: String, required: true },
    settingKey: { type: String, required: true, unique: true },
    settingValue: { type: String, required: true },
  }, { timestamps: true }),

  Log: new mongoose.Schema({
    level: { type: String, required: true },
    message: { type: String, required: true },
    context: { type: String },
    details: { type: Object },
    timestamp: { type: String, required: true, index: true },
  }, { timestamps: true }),
};

async function initializeDB() {
  try {
    console.info('db.js: Initializing MongoDB connection', {
      uri: MONGODB_URI,
      timestamp: new Date().toISOString(),
    });
    validateMongoDBUri(MONGODB_URI);
    let attempt = 0;
    const maxAttempts = 5;
    while (attempt < maxAttempts) {
      try {
        await mongoose.connect(MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
        });
        console.info('db.js: MongoDB connected', {
          database: mongoose.connection.name,
          uri: MONGODB_URI,
          timestamp: new Date().toISOString(),
        });
        const { logInfo } = require('./utils/logUtils');
        await logInfo('MongoDB connected', 'db.js', {
          database: mongoose.connection.name,
          uri: MONGODB_URI,
          timestamp: new Date().toISOString(),
        });
        break;
      } catch (err) {
        attempt++;
        console.error(`db.js: MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`, {
          stack: err.stack,
          uri: MONGODB_URI,
          timestamp: new Date().toISOString(),
        });
        const { logError } = require('./utils/logUtils');
        await logError(`MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'db.js', {
          stack: err.stack,
          uri: MONGODB_URI,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          throw new Error(`Failed to connect to MongoDB after ${maxAttempts} attempts: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    console.info('db.js: Registering schemas', { timestamp: new Date().toISOString() });
    for (const [modelName, schema] of Object.entries(schemas)) {
      if (!registeredModels.has(modelName)) {
        const model = mongoose.models[modelName] || mongoose.model(modelName, schema);
        registeredModels.set(modelName, model);
        console.info(`db.js: ${modelName} schema registered`, { timestamp: new Date().toISOString() });
        const { logInfo } = require('./utils/logUtils');
        await logInfo(`${modelName} schema registered`, 'db.js', { timestamp: new Date().toISOString() });
      }
    }

    console.info('db.js: Schema registration completed', { timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`db.js: Database initialization failed: ${err.message}`, {
      stack: err.stack,
      uri: MONGODB_URI,
      timestamp: new Date().toISOString(),
    });
    const { logError } = require('./utils/logUtils');
    await logError(`Database initialization failed: ${err.message}`, 'db.js', {
      stack: err.stack,
      uri: MONGODB_URI,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

async function getModel(modelName) {
  console.info('db.js: Accessing model', { modelName, timestamp: new Date().toISOString() });
  if (!registeredModels.has(modelName)) {
    if (!schemas[modelName]) {
      console.error(`db.js: Model ${modelName} not found in schemas`, { timestamp: new Date().toISOString() });
      const { logError } = require('./utils/logUtils');
      await logError(`Model ${modelName} not found in schemas`, 'db.js', { timestamp: new Date().toISOString() });
      throw new Error(`Model ${modelName} not defined`);
    }
    try {
      const model = mongoose.models[modelName] || mongoose.model(modelName, schemas[modelName]);
      registeredModels.set(modelName, model);
      console.info(`db.js: ${modelName} schema registered`, { timestamp: new Date().toISOString() });
      const { logInfo } = require('./utils/logUtils');
      await logInfo(`${modelName} schema registered`, 'db.js', { timestamp: new Date().toISOString() });
    } catch (err) {
      console.error(`db.js: Failed to register model ${modelName}: ${err.message}`, {
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      const { logError } = require('./utils/logUtils');
      await logError(`Failed to register model ${modelName}: ${err.message}`, 'db.js', {
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  const model = registeredModels.get(modelName);
  if (typeof model.create !== 'function' || typeof model.findOne !== 'function') {
    console.error(`db.js: Model ${modelName} invalid: Missing required methods`, { timestamp: new Date().toISOString() });
    const { logError } = require('./utils/logUtils');
    await logError(`Model ${modelName} invalid: Missing required methods`, 'db.js', { timestamp: new Date().toISOString() });
    throw new Error(`Model ${modelName} invalid: Missing create or findOne method`);
  }

  console.info(`db.js: ${modelName} model retrieved`, {
    hasCreate: typeof model.create === 'function',
    hasFindOne: typeof model.findOne === 'function',
    timestamp: new Date().toISOString(),
  });
  return model;
}

function isSchemaRegistered() {
  return registeredModels.size > 0;
}

module.exports = { initializeDB, getModel, isSchemaRegistered };
