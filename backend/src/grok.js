/*
 * File Path: backend/src/grok.js
 * Purpose: Initializes Express router for /api/grok routes in Allur Space Console, mounting task, proposal, and system routes.
 * How It Works:
 *   - Sets up an Express router to handle /grok endpoints.
 *   - Mounts taskRoutes.js, proposalRoutes.js, and systemRoutes.js from backend/src/routes/ for task, proposal, and system operations.
 *   - Uses getIO from socket.js for Socket.IO event emission, avoiding direct initialization.
 *   - Logs router mounting to grok.log for debugging.
 * Mechanics:
 *   - Uses Express Router to delegate endpoints to specific route files.
 *   - Routes are mounted directly (e.g., /tasks, /proposals, /system) to avoid nested /grok paths.
 *   - Relies on taskManager.js via taskRoutes.js for task operations.
 * Dependencies:
 *   - express: Router for API endpoints (version 5.1.0).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - ./routes/taskRoutes.js: Task-related endpoints (/grok/tasks, /grok/edit).
 *   - ./routes/proposalRoutes.js: Proposal-related endpoints (/grok/backend-proposals).
 *   - ./routes/systemRoutes.js: System-related endpoints (/grok/logs, /grok/files).
 * Dependents:
 *   - app.js: Mounts grok.js at /api/grok.
 *   - GrokUI.jsx: Interacts with /grok endpoints via apiClient.
 *   - useTasks.js, useProposals.js: Call /grok/tasks, /grok/backend-proposals.
 * Why It’s Here:
 *   - Centralizes /grok routing for Sprint 2, replacing legacy taskProcessorV18.js dependencies (04/23/2025).
 *   - Supports task, proposal, and system operations for Allur Space Console (04/23/2025).
 * Change Log:
 *   - 04/07/2025: Initialized with taskProcessorV18.js for task operations.
 *   - 04/21/2025: Modularized routes to taskRoutes.js, proposalRoutes.js, systemRoutes.js.
 *     - Why: Cleanup for Sprint 2, reduce grok.js size to ~50 lines (User, 04/21/2025).
 *     - How: Mounted route files, removed legacy endpoints (/logs, /files, /file-content).
 *     - Test: Run `npm start`, GET /grok/tasks, POST /grok/edit, verify responses.
 *   - 04/23/2025: Fixed MODULE_NOT_FOUND for taskRoutes, proposalRoutes, systemRoutes.
 *     - Why: Incorrect imports assumed routes in backend/src/ (User, 04/23/2025).
 *     - How: Updated imports to ./routes/taskRoutes, ./routes/proposalRoutes, ./routes/systemRoutes.
 *     - Test: Run `npm start`, verify server starts, grok.log shows “Mounted /api/grok successfully”, no MODULE_NOT_FOUND.
 *   - 04/27/2025: Fixed multiple handleUpgrade error and incorrect route paths.
 *     - Why: Duplicate Socket.IO initialization in grok.js and nested /grok paths caused server.handleUpgrade() conflict and endpoint errors (User, 04/27/2025).
 *     - How: Removed initSocket from grok.js, mounted routes directly (/tasks, /proposals, /system), added logging for route initialization.
 *   - 04/27/2025: Added guard for DB initialization.
 *     - Why: MissingSchemaError due to premature taskRoutes.js import before initializeDB (User, 04/27/2025).
 *     - How: Added isSchemaRegistered check from db.js, logs error if DB not initialized.
 *     - Test: Run `npm start`, verify server starts without MissingSchemaError, grok.log shows “Mounted /api/grok successfully” after DB init, GET /api/grok/tasks responds correctly.
 * Test Instructions:
 *   - Apply grok.js, run `npm start`: Verify server starts, grok.log logs “Mounted /api/grok successfully” after “Model imports completed”, no MissingSchemaError or handleUpgrade errors.
 *   - GET http://localhost:8888/api/grok/tasks: Confirm 200 response with task list, LiveFeed.jsx shows tasks_fetched event.
 *   - POST http://localhost:8888/api/grok/edit with { prompt: "Build CRM system" }: Confirm 200 response, task created, LiveFeed.jsx shows blue log.
 *   - GET http://localhost:8888/api/grok/proposals: Confirm 200 response with proposal list, LiveFeed.jsx shows backendProposal event.
 *   - GET http://localhost:8888/api/grok/system/logs: Confirm 200 response with log data from systemRoutes.js.
 *   - Check browser console: Confirm no endpoint errors (e.g., 404 for /api/grok/grok/tasks).
 *   - Check grok.log: Confirm single router initialization after DB init, no errors.
 * Future Enhancements:
 *   - Add rate limiting for /grok endpoints (Sprint 4).
 *   - Support WebSocket-only endpoints for high-frequency updates (Sprint 5).
 * Self-Notes:
 *   - Nate: Modularized routes for Sprint 2 cleanup, reduced grok.js size (04/21/2025).
 *   - Nate: Fixed MODULE_NOT_FOUND by updating route imports to ./routes/ (04/23/2025).
 *   - Nate: Fixed handleUpgrade error and route paths by removing initSocket and correcting mounts (04/27/2025).
 *   - Nate: Added DB initialization guard to prevent MissingSchemaError (04/27/2025).
 * Rollback Instructions:
 *   - If /grok endpoints fail or server crashes: Copy grok.js.bak to grok.js (`mv backend/src/grok.js.bak backend/src/grok.js`).
 *   - Verify GET /api/grok/tasks returns data and grok.log shows no errors after rollback.
 */
const express = require('express');
const winston = require('winston');
const path = require('path');
const taskRoutes = require('./routes/taskRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { isSchemaRegistered } = require('./db');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../grok.log'), maxsize: 1024 * 1024 * 50 }),
    new winston.transports.Console(),
  ],
});

module.exports = () => {
  logger.debug('grok.js: Initializing /api/grok router', { timestamp: new Date().toISOString() });

  // Guard against premature route mounting
  if (!isSchemaRegistered) {
    logger.error('grok.js: Database schemas not registered. Ensure initializeDB is called before mounting routes', {
      timestamp: new Date().toISOString(),
    });
    throw new Error('Database schemas not registered. Ensure initializeDB is called first.');
  }

  const router = express.Router();

  // Mount routes directly
  router.use('/tasks', taskRoutes);
  router.use('/proposals', proposalRoutes);
  router.use('/system', systemRoutes);

  logger.info('Mounted /api/grok successfully', { timestamp: new Date().toISOString() });
  return router;
};
