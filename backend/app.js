/*
 * File Path: backend/app.js
 * Purpose: Main Express server initialization for Allur Space Console.
 * How It Works:
 *   - Initializes Express with CORS, JSON parsing, and static file serving.
 *   - Loads environment variables using dotenv.
 *   - Connects to MongoDB via db.js before mounting routes.
 *   - Sets up Socket.IO for real-time updates using socket.js.
 *   - Mounts routes for tasks, authentication, system, and proposals.
 *   - Logs server startup, requests, and errors to idurar_db.logs.
 *   - Uses synchronous require() and model validation for stability.
 * Mechanics:
 *   - Async startServer ensures MongoDB connection before route mounting.
 *   - Validates model methods (create, findOne) to prevent errors.
 *   - Logs requests for debugging via middleware.
 *   - Provides /api/health endpoint for status checks.
 *   - Handles unmatched routes with 404 responses using errorHandlers.js.
 * Dependencies:
 *   - express: Web framework (version 5.1.0).
 *   - cors: Cross-origin resource sharing (version 2.8.5).
 *   - dotenv: Environment variable loading (version 16.4.5).
 *   - express-fileupload: File upload middleware (version 1.5.1).
 *   - socket.io: Real-time communication (version 4.8.1).
 *   - ./src/db: MongoDB connection and schemas.
 *   - ./src/socket: Socket.IO setup.
 *   - ./src/utils/logUtils: MongoDB logging.
 *   - ./src/routes/taskRoutes: Task management routes.
 *   - ./src/routes/auth/index: Authentication routes.
 *   - ./src/routes/systemRoutes: System utilities (sponsors, client errors, Repomix).
 *   - ./src/routes/proposalRoutes: Backend proposal routes.
 *   - ./src/handlers/errorHandlers: notFound and errorHandler middleware.
 * Dependents:
 *   - None (entry point for the backend).
 * Why It's Here:
 *   - Core server setup for Sprint 2, addressing TypeError: Cannot read properties of undefined (reading 'stack') (User, 04/30/2025).
 * Change Log:
 *   - 04/07/2025: Initialized Express app with basic routes (Nate).
 *   - 04/23/2025: Added async MongoDB initialization (Nate).
 *   - 04/29/2025: Enhanced request logging for 404 issues (Nate).
 *   - 05/03/2025: Fixed Admin.findOne is not a function error (Nate).
 *   - 04/30/2025: Used require(), added model checks, simplified error handling (Grok).
 *   - 05/01/2025: Fixed TypeError: connectDB is not a function (issue #43) (Grok).
 *   - 05/08/2025: Fixed MODULE_NOT_FOUND for ./db (Grok).
 *   - 05/08/2025: Enhanced middleware debugging for app.use() error (Grok).
 *   - 05/08/2025: Added MongoDB URI logging for debugging (Grok).
 *     - Why: MongoDB connection failed due to invalid writeConcern (User, 05/08/2025).
 *     - How: Added URI logging, ensured dotenv and correct module paths.
 *     - Test: Run `npm start`, verify "MongoDB connected" and URI in grok.log.
 * Test Instructions:
 *   - Apply updated app.js, ensure backend/.env includes DATABASE_URI=mongodb://localhost:27017/idurar_db.
 *   - Run `npm start`, check grok.log for “MongoDB connected” and correct URI.
 *   - POST /api/auth/login, verify 200 response, no 500 errors.
 * Rollback Instructions:
 *   - Revert to app.js.bak (`copy backend\app.js.bak backend\app.js`).
 *   - Verify server starts (may fail if URI incorrect).
 * Future Enhancements:
 *   - Add HTTPS with SSL (Sprint 3).
 *   - Implement clustering (Sprint 4).
 *   - Add rate limiting (Sprint 3).
 * Self-Notes:
 *   - Nate: Enhanced server stability with model validation and async initialization (04/23/2025).
 *   - Grok: Added URI logging for MongoDB debugging (05/08/2025).
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { initializeDB, getModel } = require('./src/db');
const { initSocket } = require('./src/socket');
const { logInfo, logDebug, logError } = require('./src/utils/logUtils');
const fileUpload = require('express-fileupload');

// Load routes with error handling
let taskRoutes, authRouter, systemRoutes, proposalRoutes, errorHandlers;
try {
  taskRoutes = require('./src/routes/taskRoutes');
  console.log('app.js: taskRoutes loaded', { timestamp: new Date().toISOString() });
} catch (err) {
  console.error('app.js: Failed to load taskRoutes', { error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
  throw err;
}
try {
  authRouter = require('./src/routes/auth/index');
  console.log('app.js: authRouter loaded', { timestamp: new Date().toISOString() });
} catch (err) {
  console.error('app.js: Failed to load authRouter', { error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
  throw err;
}
try {
  systemRoutes = require('./src/routes/systemRoutes');
  console.log('app.js: systemRoutes loaded', { timestamp: new Date().toISOString() });
} catch (err) {
  console.error('app.js: Failed to load systemRoutes', { error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
  throw err;
}
try {
  proposalRoutes = require('./src/routes/proposalRoutes');
  console.log('app.js: proposalRoutes loaded', { timestamp: new Date().toISOString() });
} catch (err) {
  console.error('app.js: Failed to load proposalRoutes', { error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
  throw err;
}
try {
  errorHandlers = require('./src/handlers/errorHandlers');
  console.log('app.js: errorHandlers loaded', { timestamp: new Date().toISOString() });
} catch (err) {
  console.error('app.js: Failed to load errorHandlers', { error: err.message, stack: err.stack, timestamp: new Date().toISOString() });
  throw err;
}

const { notFound, errorHandler } = errorHandlers;

// Log environment variables
logInfo('Environment variables loaded', 'app', {
  JWT_SECRET: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 5) + '...' : 'undefined',
  DATABASE_URI: process.env.DATABASE_URI,
  PORT: process.env.PORT,
  timestamp: new Date().toISOString(),
});

// Log module loading
console.log('app.js: Loading modules', {
  express: !!express,
  cors: !!cors,
  http: !!http,
  path: !!path,
  db: !!require('./src/db'),
  socket: !!require('./src/socket'),
  logUtils: !!require('./src/utils/logUtils'),
  taskRoutes: !!taskRoutes,
  authRouter: !!authRouter,
  systemRoutes: !!systemRoutes,
  proposalRoutes: !!proposalRoutes,
  errorHandlers: !!errorHandlers,
  fileUpload: !!fileUpload,
  timestamp: new Date().toISOString(),
});

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8888;

app.use(fileUpload());

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  logDebug(`Received request: ${req.method} ${req.originalUrl}`, 'app.js', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString(),
  }).catch(err => console.error('app.js: Failed to log request:', err.message));
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'Server is running' });
});

// Start server
async function startServer() {
  try {
    // Initialize MongoDB
    console.log('app.js: Connecting to MongoDB', { uri: process.env.DATABASE_URI });
    await initializeDB();
    await logInfo('MongoDB connected', 'app.js', { timestamp: new Date().toISOString() });

    // Validate models
    console.log('app.js: Validating models');
    const models = ['Task', 'Admin', 'Sponsor', 'Memory', 'BackendProposal', 'Setting', 'Log'];
    for (const modelName of models) {
      const model = await getModel(modelName);
      if (typeof model.create !== 'function' || typeof model.findOne !== 'function') {
        throw new Error(`Model ${modelName} invalid: Missing create or findOne`);
      }
      await logDebug(`Model ${modelName} validated`, 'app.js', { timestamp: new Date().toISOString() });
    }

    // Mount routes with detailed error handling
    console.log('app.js: Mounting routes');
    const routes = [
      { path: '/api/grok', router: taskRoutes, name: 'taskRoutes' },
      { path: '/api/auth', router: authRouter, name: 'authRouter' },
      { path: '/api', router: systemRoutes, name: 'systemRoutes' },
      { path: '/api/grok', router: proposalRoutes, name: 'proposalRoutes' },
    ];

    for (const { path, router, name } of routes) {
      try {
        console.log(`app.js: Inspecting ${name} middleware stack`, {
          routerType: typeof router,
          hasStack: !!router?.stack,
          stackLength: router?.stack?.length || 0,
          middlewareLayers: router?.stack?.map((layer, index) => ({
            index,
            route: layer.route?.path || 'middleware',
            methods: layer.route?.methods || { middleware: true },
            handleType: typeof layer.handle,
            handleName: layer.handle.name || 'anonymous',
          })) || [],
          timestamp: new Date().toISOString(),
        });

        if (typeof router === 'function' && router.stack && Array.isArray(router.stack)) {
          // Validate each middleware layer
          for (const [index, layer] of router.stack.entries()) {
            if (typeof layer.handle !== 'function') {
              throw new Error(`Invalid middleware in ${name} at index ${index}: handle is not a function for layer ${JSON.stringify(layer.route || layer.regexp)}`);
            }
          }
          app.use(path, router);
          await logInfo(`Mounted ${name} at ${path}`, 'app.js', { timestamp: new Date().toISOString() });
        } else {
          console.warn(`app.js: Skipping invalid router for ${name}`, { timestamp: new Date().toISOString() });
          continue;
        }
      } catch (err) {
        console.error(`app.js: Failed to mount ${name} at ${path}`, {
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
        await logError(`Failed to mount ${name}: ${err.message}`, 'app.js', {
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Error handling
    console.log('app.js: Mounting error handlers', {
      notFoundType: typeof notFound,
      errorHandlerType: typeof errorHandler,
      timestamp: new Date().toISOString(),
    });
    if (typeof notFound !== 'function' || typeof errorHandler !== 'function') {
      throw new Error('Invalid error handlers: notFound or errorHandler is not a function');
    }
    app.use(notFound);
    app.use(errorHandler);

    // Initialize Socket.IO
    console.log('app.js: Initializing Socket.IO');
    await initSocket(server);
    await logInfo('Socket.IO initialized', 'app.js', { timestamp: new Date().toISOString() });

    // Start server
    server.listen(port, () => {
      console.log(`app.js: Server running on port ${port}`);
      logInfo(`Server running on port ${port}`, 'app.js', { timestamp: new Date().toISOString() });
    });
  } catch (err) {
    const errorMessage = err.message || 'Unknown error';
    console.error('app.js: Server startup failed:', errorMessage);
    await logError('Server startup failed', 'app.js', {
      error: errorMessage,
      stack: err.stack || 'No stack trace',
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }
}

startServer();
module.exports = app;
