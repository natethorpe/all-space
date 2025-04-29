/*
 * File Path: backend/app.js
 * Purpose: Main entry point for IDURAR ERP/CRM backend, initializing Express app, middleware, routes, and Socket.IO.
 * How It Works:
 *   - Sets up Express with JSON parsing, URL encoding, CORS, and static file serving.
 *   - Mounts routes: /api/grok (taskRoutes.js), /api/auth (auth/index.js), /api (coreApi.js), /public (static files).
 *   - Initializes Socket.IO via socket.js and MongoDB via db.js.
 *   - Applies error-handling middleware (notFound, errorHandler).
 * Mechanics:
 *   - Uses express.json, express.urlencoded for request parsing.
 *   - Serves static files from ./public.
 *   - CORS allows frontend requests from http://localhost:3000.
 *   - Socket.IO integrates with HTTP server for real-time updates.
 * Dependencies:
 *   - express: HTTP server (version 5.1.0).
 *   - socket.io: Real-time communication (version 4.8.1).
 *   - cors: Cross-origin resource sharing (version 2.8.5).
 *   - http, path, events: Node.js built-ins for server, file paths, and event handling.
 *   - ./src/db: MongoDB connection and schemas.
 *   - ./src/socket: Socket.IO initialization.
 *   - ./src/routes/taskRoutes: Task management routes.
 *   - ./src/routes/auth/index: Authentication routes.
 *   - ./src/routes/coreRoutes/coreApi: Admin/settings/sponsor routes.
 *   - ./src/handlers/errorHandlers: Error middleware.
 *   - ./src/utils/logUtils: MongoDB logging utilities.
 * Dependents:
 *   - All backend routes (taskRoutes.js, auth/index.js, coreApi.js).
 *   - GrokUI.jsx, useTasks.js, useProposals.js, useLiveFeed.js: Interact with /api endpoints.
 * Why It’s Here:
 *   - Centralizes backend setup for Sprint 2, supporting Allur Space Console (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized Express app with grok.js, auth.js, middleware.
 *   - 04/21/2025: Added coreApi.js routes for admin/settings/sponsors.
 *   - 04/23/2025: Fixed MODULE_NOT_FOUND for errorHandlers.js, grok.js; fixed TypeError in initGrok.
 *   - 04/27/2025: Fixed handleUpgrade error in Socket.IO, improved logging, fixed MissingSchemaError for Task.
 *   - 04/28/2025: Fixed auth.js module error, enhanced MissingSchemaError fix.
 *   - 04/29/2025: Fixed MissingSchemaError for Setting model.
 *   - 05/01/2025: Fixed Model Log not registered error.
 *   - 05/02/2025: Fixed Log.create is not a function error.
 *   - 05/03/2025: Fixed Admin.findOne is not a function error in auth/index.js.
 *     - Why: Admin model lacked findOne method, causing login failure (User, 05/03/2025).
 *     - How: Added model validation before route mounting, enhanced error logging.
 *     - Test: Run `npm start`, POST /api/auth/login, verify 200 response, idurar_db.logs shows login attempt, no Admin.findOne errors.
 * Test Instructions:
 *   - Update app.js, run `npm start`: Verify server starts, idurar_db.logs shows “Server running on port 8888”, “Connected to MongoDB: idurar_db”, “Mounted /api/grok successfully”, no Admin.findOne errors.
 *   - GET http://localhost:8888/api/grok/tasks: Confirm 200 response with task list, LiveFeed.jsx shows tasks_fetched event.
 *   - POST http://localhost:8888/api/grok/edit with { prompt: "Build CRM system" }: Confirm 200 response, task created, LiveFeed.jsx shows blue taskUpdate log.
 *   - POST http://localhost:8888/api/auth/login with { email: "admin@idurarapp.com", password: "admin123" }: Confirm 200 response with JWT.
 *   - GET http://localhost:8888/api/sponsors: Confirm 200 response with sponsor list.
 *   - GET http://localhost:8888/api/unknown: Confirm 404 response from notFound middleware.
 *   - Stop/restart server: Verify LiveFeed.jsx resumes updates, no WebSocket errors in console.
 *   - Check idurar_db.logs: Confirm startup sequence (DB connection, schema registration, route imports, Socket.IO init, login attempts), no filesystem writes.
 * Future Enhancements:
 *   - Add environment variables for port, MongoDB URI (Sprint 4).
 *   - Implement rate limiting with express-rate-limit (Sprint 4).
 * Self-Notes:
 *   - Nate: Fixed various import and schema errors for Sprint 2 stability (04/23/2025–04/29/2025).
 *   - Nate: Fixed Model not registered, Log.create, and Admin.findOne errors (05/01/2025–05/03/2025).
 * Rollback Instructions:
 *   - If server fails to start: Copy app.js.bak to app.js (`mv backend/app.js.bak backend/app.js`), restart server (`npm start`).
 *   - Verify server starts and /api/grok/tasks responds after rollback.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const events = require('events');
const { initializeDB, getModel } = require('./src/db');
const { initSocket } = require('./src/socket');
const { logInfo, logDebug, logError } = require('./src/utils/logUtils');

const app = express();
const server = http.createServer(app);

// Increase EventEmitter limit to suppress MaxListenersExceededWarning
events.EventEmitter.defaultMaxListeners = 15;

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './public')));

// Initialize DB and server
const startServer = async () => {
  try {
    // Initialize MongoDB connection and schemas
    await logInfo('Initializing MongoDB connection', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Initializing MongoDB connection (fallback)', { timestamp: new Date().toISOString() })
    );
    await initializeDB();
    await logInfo('MongoDB initialized', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: MongoDB initialized (fallback)', { timestamp: new Date().toISOString() })
    );

    // Validate registered models
    const registeredModels = ['Task', 'Admin', 'AdminPassword', 'Sponsor', 'Memory', 'BackendProposal', 'Setting', 'Log'];
    for (const modelName of registeredModels) {
      try {
        const model = await getModel(modelName);
        if (typeof model.create !== 'function' || typeof model.findOne !== 'function') {
          throw new Error(`Model ${modelName} invalid: Missing create or findOne method`);
        }
        await logDebug(`Model ${modelName} registered`, 'app', { timestamp: new Date().toISOString() }).catch(() =>
          console.debug(`app.js: Model ${modelName} registered (fallback)`, { timestamp: new Date().toISOString() })
        );
      } catch (err) {
        await logError(`Model ${modelName} not registered or invalid`, 'app', {
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        }).catch(() =>
          console.error(`app.js: Model ${modelName} not registered or invalid (fallback)`, {
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
          })
        );
        // Continue to allow server startup, but routes may fail if models are invalid
      }
    }

    // Dynamically import routes after DB initialization
    await logInfo('Importing routes', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Importing routes (fallback)', { timestamp: new Date().toISOString() })
    );
    const { default: taskRoutes } = await import('./src/routes/taskRoutes.js');
    const { default: authRouter } = await import('./src/routes/auth/index.js');
    const { default: coreApiRouter } = await import('./src/routes/coreRoutes/coreApi.js');
    const { notFound, errorHandler } = await import('./src/handlers/errorHandlers.js');

    // Mount routes
    await logInfo('Mounting API routes', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Mounting API routes (fallback)', { timestamp: new Date().toISOString() })
    );
    app.use('/api/grok', taskRoutes);
    await logInfo('Mounted /api/grok successfully', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Mounted /api/grok successfully (fallback)', { timestamp: new Date().toISOString() })
    );
    app.use('/api/auth', authRouter);
    await logInfo('Mounted /api/auth successfully', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Mounted /api/auth successfully (fallback)', { timestamp: new Date().toISOString() })
    );
    app.use('/api', coreApiRouter);
    await logInfo('Mounted /api successfully', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Mounted /api successfully (fallback)', { timestamp: new Date().toISOString() })
    );
    app.use('/public', express.static(path.join(__dirname, './public')));
    await logInfo('Mounted /public successfully', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Mounted /public successfully (fallback)', { timestamp: new Date().toISOString() })
    );

    // Error-handling middleware
    app.use(notFound);
    app.use(errorHandler);

    // Initialize Socket.IO after routes
    await logInfo('Initializing Socket.IO', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Initializing Socket.IO (fallback)', { timestamp: new Date().toISOString() })
    );
    await initSocket(server);
    await logInfo('Socket.IO initialized successfully', 'app', { timestamp: new Date().toISOString() }).catch(() =>
      console.info('app.js: Socket.IO initialized successfully (fallback)', { timestamp: new Date().toISOString() })
    );

    // Start server
    const PORT = process.env.PORT || 8888;
    server.listen(PORT, () => {
      logInfo(`Server running on port ${PORT}`, 'app', { timestamp: new Date().toISOString() }).catch(() =>
        console.info(`app.js: Server running on port ${PORT} (fallback)`, { timestamp: new Date().toISOString() })
      );
    });
  } catch (err) {
    await logError('Server startup error', 'app', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    }).catch(() =>
      console.error('app.js: Server startup error (fallback)', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      })
    );
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
