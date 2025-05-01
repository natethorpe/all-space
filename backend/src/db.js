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
 *   - Logs schema registration to idurar_db.logs for debugging.
 * Dependencies:
 *   - mongoose: MongoDB ORM (version 8.13.2).
 *   - logUtils.js: MongoDB logging (deferred import to avoid circular dependency).
 * Why It's Here:
 *   - Centralizes database setup for Sprint 2, fixing OverwriteModelError and circular dependencies (User, 04/29/2025).
 * Change Log:
 *   - 04/07/2025: Initialized MongoDB connection and schemas (Nate).
 *   - 04/23/2025: Added retry logic for connection (Nate).
 *   - 04/29/2025: Fixed Task.find is not a function error (Nate).
 *   - 04/29/2025: Fixed circular dependency with logUtils.js (Nate).
 *   - 04/29/2025: Fixed OverwriteModelError for Log model (Nate).
 *   - 04/30/2025: Corrected truncated code, ensured complete functions (Grok).
 *     - Why: Fix incomplete initializeDB, align with provided schemas (User, 04/30/2025).
 *     - How: Restored full functions, added logging, preserved retry logic.
 * Test Instructions:
 *   - Run `npm start`: Verify console shows "MongoDB connected", "Task schema registered", no OverwriteModelError.
 *   - GET /api/grok/tasks: Confirm 200 response, tasks in idurar_db.tasks.
 *   - POST /api/grok/edit with "Build CRM system": Verify task in idurar_db.tasks, logs in idurar_db.logs.
 *   - Check idurar_db.logs: Confirm schema registration, no buffering timeouts.
 * Rollback Instructions:
 *   - Revert to db.js.bak (`mv backend/src/db.js.bak backend/src/db.js`).
 *   - Verify MongoDB connects and models are accessible post-rollback.
 * Future Enhancements:
 *   - Add connection pooling (Sprint 4).
 *   - Support sharding (Sprint 5).
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/idurar_db';
const registeredModels = new Map();

const schemas = {
  Task: new mongoose.Schema({
    taskId: { type: String, required: true, unique: true },
    prompt: { type: String, required: true },
    status: { type: String, default: 'pending' },
    files: [{ type: String }],
    stagedFiles: [{ path: String, content: String }],
    error: { type: String },
    createdAt: { type: Date, default: Date.now },
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
    console.info('db.js: Initializing MongoDB connection', { timestamp: new Date().toISOString() });
    let attempt = 0;
    const maxAttempts = 5;
    while (attempt < maxAttempts) {
      try {
        await mongoose.connect(MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
        });
        console.info('db.js: MongoDB connected', { timestamp: new Date().toISOString() });
        const { logInfo } = require('./utils/logUtils'); // Deferred import
        await logInfo('MongoDB connected', 'db.js', { timestamp: new Date().toISOString() });
        break;
      } catch (err) {
        attempt++;
        console.error(`db.js: MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`, {
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
        const { logInfo } = require('./utils/logUtils'); // Deferred import
        await logInfo(`${modelName} schema registered`, 'db.js', { timestamp: new Date().toISOString() });
      }
    }

    console.info('db.js: Schema registration completed', { timestamp: new Date().toISOString() });
  } catch (err) {
    console.error(`db.js: Database initialization failed: ${err.message}`, {
      stack: err.stack,
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
      throw new Error(`Model ${modelName} not defined`);
    }
    try {
      const model = mongoose.models[modelName] || mongoose.model(modelName, schemas[modelName]);
      registeredModels.set(modelName, model);
      console.info(`db.js: ${modelName} schema registered`, { timestamp: new Date().toISOString() });
      const { logInfo } = require('./utils/logUtils'); // Deferred import
      await logInfo(`${modelName} schema registered`, 'db.js', { timestamp: new Date().toISOString() });
    } catch (err) {
      console.error(`db.js: Failed to register model ${modelName}: ${err.message}`, {
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  const model = registeredModels.get(modelName);
  if (typeof model.create !== 'function' || typeof model.findOne !== 'function') {
    console.error(`db.js: Model ${modelName} invalid: Missing required methods`, { timestamp: new Date().toISOString() });
    throw new Error(`Model ${modelName} invalid: Missing create or findOne method`);
  }

  console.info(`db.js: ${modelName} model retrieved`, {
    hasCreate: typeof model.create === 'function',
    hasFindOne: typeof model.findOne === 'function',
    timestamp: new Date().toISOString(),
  });
  return model;
}

module.exports = { initializeDB, getModel };
