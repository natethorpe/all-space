/*
 * File Path: backend/app.js
 * Purpose: Main Express server initialization for Allur Space Console.
 * How It Works:
 *   - Initializes Express with CORS, JSON parsing, and static file serving.
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
 *   - mongoose: MongoDB ORM (version 8.13.2).
 *   - socket.io: Real-time communication (version 4.8.1).
 *   - http: Creates HTTP server (Node.js built-in).
 *   - db.js: MongoDB connection and schemas.
 *   - socket.js: Socket.IO setup.
 *   - logUtils.js: MongoDB logging.
 *   - taskRoutes.js: Task management routes.
 *   - auth/index.js: Authentication routes.
 *   - systemRoutes.js: System utilities (sponsors, client errors, Repomix).
 *   - proposalRoutes.js: Backend proposal routes.
 *   - errorHandlers.js: notFound and errorHandler middleware.
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
 *     - Why: Fix server crash on startup (User, 04/30/2025).
 *     - How: Reverted to synchronous require(), validated models, streamlined error handler.
 * Test Instructions:
 *   - Run `npm start`: Verify console logs "Server running on port 8888", idurar_db.logs shows "MongoDB connected", "Routes mounted".
 *   - GET /api/health: Confirm 200 response with { success: true, status: 'Server is running' }.
 *   - POST /api/auth/login with { email: "admin@idurarapp.com", password: "admin123" }: Verify 200 response with JWT.
 *   - POST /api/grok/edit with { prompt: "Build CRM system" }: Confirm task created, green log in LiveFeed.jsx.
 *   - GET /api/grok/tasks: Verify 200 response, tasks returned.
 *   - Check idurar_db.logs: Confirm startup, route mounts, no TypeError or buffering timeouts.
 * Rollback Instructions:
 *   - Revert to app.js.bak (`mv backend/app.js.bak backend/app.js`) if startup fails.
 *   - Verify /api/health responds post-rollback.
 * Future Enhancements:
 *   - Add HTTPS with SSL (Sprint 3).
 *   - Implement clustering (Sprint 4).
 *   - Add rate limiting (Sprint 3).
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { initializeDB, getModel } = require('./src/db');
const { initSocket } = require('./src/socket');
const { logInfo, logDebug, logError } = require('./src/utils/logUtils');
const taskRoutes = require('./src/routes/taskRoutes');
const authRouter = require('./src/routes/auth/index');
const systemRoutes = require('./src/routes/systemRoutes');
const proposalRoutes = require('./src/routes/proposalRoutes');
const { notFound, errorHandler } = require('./src/handlers/errorHandlers');

const fileUpload = require('express-fileupload');

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
    console.log('app.js: Connecting to MongoDB');
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

    // Mount routes
    console.log('app.js: Mounting routes');
    app.use('/api/grok', taskRoutes);
    app.use('/api/auth', authRouter);
    app.use('/api', systemRoutes);
    app.use('/api/grok', proposalRoutes);
    await logInfo('Routes mounted', 'app.js', { timestamp: new Date().toISOString() });

    // Error handling
    app.use(notFound);
    app.use((err, req, res, next) => {
      const errorMessage = err.message || 'Unknown error';
      logError(errorMessage, 'app.js', { stack: err.stack || 'No stack trace', timestamp: new Date().toISOString() });
      errorHandler(err, req, res, next);
    });

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
    await logError('Server startup failed', 'app.js', { error: errorMessage, stack: err.stack || 'No stack trace', timestamp: new Date().toISOString() });
    process.exit(1);
  }
}

startServer();
module.exports = app;
