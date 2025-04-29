/*
 * File Path: backend/src/db.js
 * Purpose: Initializes MongoDB connection and defines schemas for Allur Space Console.
 * How It Works:
 *   - Connects to MongoDB using Mongoose with environment-based URI.
 *   - Defines schemas for Task, Admin, AdminPassword, Sponsor, Memory, BackendProposal, Setting, and Log with indexing and validation.
 * Mechanics:
 *   - Uses Mongoose to enforce schema validation and indexing.
 *   - Implements singleton pattern for schema registration to prevent duplicates.
 *   - Exports models via getModel with validation to prevent invalid model access.
 *   - Logs schema, index creation, and model access to console (pre-Log model) or MongoDB Log model.
 * Dependencies:
 *   - mongoose: MongoDB ORM (version 8.7.3).
 *   - dotenv: Environment variable management (version 16.4.5).
 * Dependents:
 *   - app.js: Initializes MongoDB connection before routes.
 *   - taskManager.js, systemAnalyzer.js, selfEnhancer.js: Interact with Task, BackendProposal schemas.
 *   - settingController.js: Interacts with Setting schema.
 *   - auth/index.js: Interacts with Admin, AdminPassword schemas.
 *   - socket.js, logUtils.js: Rely on Log model for logging.
 * Why It’s Here:
 *   - Provides centralized DB connection and schema management for Sprint 2 persistence (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized MongoDB connection with Task, Admin schemas.
 *   - 04/23/2025: Added BackendProposal, Memory schemas.
 *   - 04/25/2025: Fixed duplicate schema index warning.
 *   - 04/27/2025: Fixed MissingSchemaError for Task model.
 *   - 04/28/2025: Fixed duplicate index warning and deprecated Mongoose options.
 *   - 04/29/2025: Added Setting schema for coreApiRouter.
 *   - 04/30/2025: Added Log schema, updated Memory schema.
 *   - 05/01/2025: Deferred Log model access to fix Model not registered error.
 *   - 05/02/2025: Fixed Log.create is not a function error.
 *   - 05/03/2025: Fixed Admin.findOne is not a function error in auth/index.js.
 *   - 05/XX/2025: Added testResults field to Task schema for Sprint 2.
 *     - Why: Store automated test outcomes for task validation (User, 05/XX/2025).
 *     - How: Added testResults as Mixed type, updated validation.
 *     - Test: Submit task, verify testResults in idurar_db.tasks.
 * Test Instructions:
 *   - Run `npm start`: Verify idurar_db.logs shows “Connected to MongoDB: idurar_db”, schema/index creation, no Admin.findOne errors.
 *   - Run `mongo idurar_db` and check indexes: Confirm `db.tasks.getIndexes()` shows unique index on `taskId`, `db.logs.getIndexes()` shows index on `timestamp`.
 *   - POST http://localhost:8888/api/auth/login with { email: "admin@idurarapp.com", password: "admin123" }: Confirm 200 response with JWT.
 *   - POST http://localhost:8888/api/grok/edit with "Build CRM system": Verify task stored with testResults, WebSocket events emitted, no errors.
 *   - Check idurar_db.logs: Confirm schema registration, model access, login attempts, no filesystem writes.
 * Future Enhancements:
 *   - Add schema versioning for migrations (Sprint 4).
 *   - Support sharding for scalability (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed schema errors and added Log schema (04/25/2025–04/30/2025).
 *   - Nate: Fixed Model not registered, Log.create, and Admin.findOne errors (05/01/2025–05/03/2025).
 *   - Nate: Added testResults field for Sprint 2 testing (05/XX/2025).
 * Rollback Instructions:
 *   - If DB issues persist: Copy db.js.bak to db.js (`mv backend/src/db.js.bak backend/src/db.js`), restart server (`npm start`).
 *   - Verify server starts and connects to MongoDB.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const { Schema } = mongoose;
let isSchemaRegistered = false;
const models = {};

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/idurar_db';
    await mongoose.connect(mongoURI);
    if (isSchemaRegistered && models.Log && typeof models.Log.create === 'function') {
      await models.Log.create({
        level: 'info',
        message: 'Connected to MongoDB: idurar_db',
        context: 'db',
        timestamp: new Date().toISOString(),
      });
    } else {
      console.info('db.js: MongoDB connected, awaiting schema registration', { timestamp: new Date().toISOString() });
    }
  } catch (err) {
    console.error('db.js: MongoDB connection error:', err.message, { stack: err.stack, timestamp: new Date().toISOString() });
    if (isSchemaRegistered && models.Log && typeof models.Log.create === 'function') {
      await models.Log.create({
        level: 'error',
        message: `MongoDB connection error: ${err.message}`,
        context: 'db',
        details: { stack: err.stack },
        timestamp: new Date().toISOString(),
      });
    }
    process.exit(1);
  }
};

// Schema definitions
const registerSchemas = () => {
  if (isSchemaRegistered) {
    console.warn('db.js: Schemas already registered, skipping re-registration', { timestamp: new Date().toISOString() });
    return;
  }

  console.info('db.js: Starting schema registration', { timestamp: new Date().toISOString() });

  const TaskSchema = new Schema({
    taskId: { type: String, required: true },
    prompt: { type: String, required: true, default: 'Untitled' },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'denied', 'pending_approval', 'applied'], default: 'pending' },
    priority: { type: Number, default: 0 },
    stagedFiles: [{ path: String, content: String }],
    generatedFiles: [String],
    proposedChanges: [String],
    originalContent: Schema.Types.Mixed,
    newContent: Schema.Types.Mixed,
    testResults: Schema.Types.Mixed, // Added for Sprint 2 to store test outcomes
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  TaskSchema.index({ taskId: 1 }, { unique: true });
  console.info('db.js: Task schema registered with unique index on taskId', { timestamp: new Date().toISOString() });

  const AdminSchema = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    name: { type: String, default: '' },
    tierAccess: { type: [String], default: [] },
    removed: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    created: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  });
  console.info('db.js: Admin schema registered', { timestamp: new Date().toISOString() });

  const AdminPasswordSchema = new Schema({
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    email: { type: String, required: true },
    password: { type: String },
    token: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  console.info('db.js: AdminPassword schema registered', { timestamp: new Date().toISOString() });

  const SponsorSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
  });
  console.info('db.js: Sponsor schema registered', { timestamp: new Date().toISOString() });

  const MemorySchema = new Schema({
    taskId: { type: String, required: true },
    prompt: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'denied', 'pending_approval', 'applied'] },
    stagedFiles: [{ path: String, content: String }],
    generatedFiles: [String],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  console.info('db.js: Memory schema registered', { timestamp: new Date().toISOString() });

  const BackendProposalSchema = new Schema({
    taskId: { type: String, required: true },
    file: { type: String, required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'denied', 'tested'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  });
  BackendProposalSchema.index({ taskId: 1 });
  console.info('db.js: BackendProposal schema registered with index on taskId', { timestamp: new Date().toISOString() });

  const SettingSchema = new Schema({
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  SettingSchema.index({ key: 1 }, { unique: true });
  console.info('db.js: Setting schema registered with unique index on key', { timestamp: new Date().toISOString() });

  const LogSchema = new Schema({
    level: { type: String, required: true, enum: ['info', 'debug', 'warn', 'error'] },
    message: { type: String, required: true },
    context: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  });
  LogSchema.index({ timestamp: -1 });
  console.info('db.js: Log schema registered with index on timestamp', { timestamp: new Date().toISOString() });

  // Register models
  models.Task = mongoose.model('Task', TaskSchema);
  models.Admin = mongoose.model('Admin', AdminSchema);
  models.AdminPassword = mongoose.model('AdminPassword', AdminPasswordSchema);
  models.Sponsor = mongoose.model('Sponsor', SponsorSchema);
  models.Memory = mongoose.model('Memory', MemorySchema);
  models.BackendProposal = mongoose.model('BackendProposal', BackendProposalSchema);
  models.Setting = mongoose.model('Setting', SettingSchema);
  models.Log = mongoose.model('Log', LogSchema);

  // Validate model registration
  const modelNames = ['Task', 'Admin', 'AdminPassword', 'Sponsor', 'Memory', 'BackendProposal', 'Setting', 'Log'];
  for (const name of modelNames) {
    if (!models[name] || typeof models[name].create !== 'function' || typeof models[name].findOne !== 'function') {
      console.error(`db.js: Failed to register model ${name}: Invalid model object`, { timestamp: new Date().toISOString() });
      throw new Error(`Model ${name} registration failed: Missing create or findOne method`);
    }
    console.info(`db.js: Model ${name} registered successfully`, {
      hasCreate: typeof models[name].create === 'function',
      hasFindOne: typeof models[name].findOne === 'function',
      timestamp: new Date().toISOString(),
    });
  }

  isSchemaRegistered = true;
  console.info('db.js: Model imports completed', { timestamp: new Date().toISOString() });
};

// Initialize DB and schemas
const initializeDB = async () => {
  await connectDB();
  registerSchemas();
  console.info('db.js: initializeDB completed', { timestamp: new Date().toISOString() });
};

// Get model with availability check and retry
const getModel = async (name, retries = 5, attempt = 1) => {
  if (!isSchemaRegistered) {
    console.warn(`db.js: Model ${name} access before schemas registered, initializing DB`, { timestamp: new Date().toISOString() });
    await initializeDB();
  }
  if (!models[name] || typeof models[name].create !== 'function' || typeof models[name].findOne !== 'function') {
    if (attempt >= retries) {
      console.error(`db.js: Model ${name} invalid or not registered after ${retries} attempts`, { timestamp: new Date().toISOString() });
      throw new Error(`Model ${name} not registered or invalid: Missing create or findOne method`);
    }
    console.warn(`db.js: Model ${name} invalid, retrying registration (attempt ${attempt}/${retries})`, { timestamp: new Date().toISOString() });
    isSchemaRegistered = false; // Force re-registration
    await initializeDB();
    return getModel(name, retries, attempt + 1);
  }
  console.debug(`db.js: Accessing model ${name}`, { timestamp: new Date().toISOString() });
  return models[name];
};

module.exports = { initializeDB, getModel, mongoose };
