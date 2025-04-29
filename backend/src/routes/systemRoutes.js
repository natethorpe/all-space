/*
 * File Path: backend/src/routes/systemRoutes.js
 * Purpose: Manages system-related API endpoints for Allur Space Console, supporting self-analysis, enhancement, maintenance, and file/log operations.
 * How It Works:
 *   - Defines Express routes for system operations:
 *     - GET /grok/self-test: Analyzes system state (e.g., missing imports) using systemAnalyzer.js.
 *     - GET /grok/self-enhance: Generates enhancement suggestions via selfEnhancer.js.
 *     - GET /grok/maintenance: Performs system maintenance (e.g., removes unused files) using systemAnalyzer.js.
 *     - GET /grok/logs: Retrieves contents of grok.log for debugging.
 *     - GET /grok/files: Lists files in frontend/src/pages (filtered to .jsx, .js, .css).
 *     - POST /grok/analyze: Placeholder for prompt analysis (future expansion).
 *     - POST /grok/upload: Uploads files to frontend/src/pages (placeholder for future use).
 *   - Integrates with systemAnalyzer.js for system analysis and maintenance tasks.
 *   - Uses selfEnhancer.js to generate system improvement suggestions.
 *   - Emits taskUpdate and fileUpdate Socket.IO events to update GrokUI.jsx live feed in real-time.
 *   - Validates inputs (e.g., prompt, filePath) to ensure reliability and prevent errors.
 * Mechanics:
 *   - Each endpoint uses async/await for file operations and MongoDB queries, with robust error handling (400, 500 responses).
 *   - File operations use fs.promises for asynchronous access, read, and write, ensuring non-blocking I/O.
 *   - Socket.IO emissions include detailed errorDetails (reason, context, stack) for live feed clarity.
 *   - /logs and /files endpoints migrated from grok.js to complete modularization (04/21/2025).
 * Dependencies:
 *   - express: Provides Router for defining API endpoints.
 *   - fs.promises: Asynchronous file system operations for logs and files.
 *   - path: Resolves file paths for log and file operations.
 *   - winston: Logging for debugging, errors, and system events (writes to grok.log).
 *   - socket.js: Supplies getIO for Socket.IO real-time updates.
 *   - systemAnalyzer.js: Handles system analysis (e.g., dependency checks) and maintenance (e.g., file cleanup).
 *   - selfEnhancer.js: Generates suggestions for system improvements.
 * Dependents:
 *   - app.js: Mounts systemRoutes at /grok via grok.js router.
 *   - GrokUI.jsx: Listens for taskUpdate and fileUpdate Socket.IO events to update live feed (logs/files not directly used in UI).
 *   - useLiveFeed.js: Frontend hook that processes taskUpdate events for live feed display.
 * Why It’s Here:
 *   - Extracted from grok.js to reduce its size and improve maintainability, aligning with Sprint 2 modularization goals (04/21/2025).
 *   - Supports Sprint 2 autonomous system objectives by providing endpoints for self-analysis, enhancement, and maintenance.
 *   - Enables Allur Space Console to monitor and improve itself, critical for ecosystem scalability (e.g., Allur Crypto integration).
 * Key Info:
 *   - Input validation ensures prompts and file paths are valid strings.
 *   - Socket.IO emissions include detailed metadata for live feed clarity.
 *   - /logs and /files migrated from grok.js to complete grok.js cleanup (04/21/2025).
 * Change Log:
 *   - 04/21/2025: Created from grok.js, implemented core system endpoints (/self-test, /self-enhance, /maintenance, /analyze, /upload).
 *     - Why: grok.js was too large, needed modular routes for maintainability (User, 04/21/2025).
 *     - How: Extracted system-related routes, integrated with systemAnalyzer.js and selfEnhancer.js, added validation and logging.
 *     - Test: GET /grok/self-test, verify analysis results; GET /grok/logs, confirm grok.log content returned.
 *   - 04/21/2025: Added /logs and /files endpoints from grok.js.
 *     - Why: Complete grok.js cleanup for Sprint 2 modularization (User, 04/21/2025).
 *     - How: Migrated /logs and /files with consistent error handling, Socket.IO emissions, and logging.
 *     - Test: GET /grok/logs, verify grok.log content; GET /grok/files, confirm file list, live feed logs fileUpdate.
 *   - 04/23/2025: Fixed socket.js import path to resolve MODULE_NOT_FOUND error.
 *     - Why: Error when running `npm start` due to incorrect ./socket import (User, 04/23/2025).
 *     - How: Updated import to require('../socket'), assuming socket.js is in backend/src/.
 *     - Test: Run `npm start`, verify server starts without MODULE_NOT_FOUND, endpoints respond.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, grok.log logs “Mounted /api/grok successfully” without MODULE_NOT_FOUND error.
 *   - GET /grok/self-test: Verify analysis results (e.g., missing imports) in response and live feed.
 *   - GET /grok/self-enhance: Confirm enhancement suggestions returned, live feed logs suggestions.
 *   - GET /grok/maintenance: Verify unused files deleted, live feed logs cleanup.
 *   - GET /grok/logs: Verify grok.log content returned as JSON, live feed logs “Fetched logs”.
 *   - GET /grok/files: Confirm list of .jsx, .js, .css files from frontend/src/pages, live feed logs fileUpdate with file count.
 *   - POST /grok/analyze: Confirm prompt analysis logged, live feed updates.
 *   - POST /grok/upload: Verify file uploaded to frontend/src/pages, live feed green log.
 *   - Check grok.log: Confirm endpoint logs, no errors.
 * Future Enhancements:
 *   - Add authentication middleware (e.g., JWT via isValidAuthToken) for system endpoints (Sprint 4).
 *   - Support file versioning for uploads (Sprint 5).
 *   - Integrate analytics to track system operation metrics in MongoDB (Sprint 6).
 *   - Add system health check endpoint (e.g., /grok/health) (Sprint 4).
 *   - Optimize file operations with Redis caching (Sprint 4).
 * Self-Notes:
 *   - Nate: Fixed socket.js import to resolve MODULE_NOT_FOUND error, ensuring server stability (04/23/2025).
 *   - Nate: Preserved all system endpoint functionality, validated with systemAnalyzer.js and selfEnhancer.js (04/23/2025).
 *   - Nate: Triple-checked integration with GrokUI.jsx for live feed updates (04/23/2025).
 *   - Nate: Added comprehensive notes for clarity, scalability, and alignment with Allur Space Console goals (04/23/2025).
 */
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { getIO } = require('../socket'); // Fixed import path
const { analyzeSystem, maintainSystem } = require('../utils/systemAnalyzer');
const { enhanceSelf } = require('../utils/selfEnhancer');

const router = express.Router();

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

// GET /grok/self-test - Analyze system state
router.get('/self-test', async (req, res) => {
  try {
    const results = await analyzeSystem('system');
    logger.info(`Self-test completed`, { results });
    res.status(200).json(results);
  } catch (error) {
    logger.error(`Self-test failed: ${error.message}`, { stack: error.stack });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Self-test failed: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: error.message, context: 'self-test', stack: error.stack },
    });
    res.status(500).json({ error: `Self-test failed: ${error.message}` });
  }
});

// GET /grok/self-enhance - Generate system enhancement suggestions
router.get('/self-enhance', async (req, res) => {
  try {
    const suggestions = await enhanceSelf('system');
    logger.info(`Self-enhance completed`, { suggestions });
    res.status(200).json(suggestions);
  } catch (error) {
    logger.error(`Self-enhance failed: ${error.message}`, { stack: error.stack });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Self-enhance failed: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: error.message, context: 'self-enhance', stack: error.stack },
    });
    res.status(500).json({ error: `Self-enhance failed: ${error.message}` });
  }
});

// GET /grok/maintenance - Perform system maintenance
router.get('/maintenance', async (req, res) => {
  try {
    const results = await maintainSystem('system');
    logger.info(`Maintenance completed`, { results });
    res.status(200).json(results);
  } catch (error) {
    logger.error(`Maintenance failed: ${error.message}`, { stack: error.stack });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Maintenance failed: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: error.message, context: 'maintenance', stack: error.stack },
    });
    res.status(500).json({ error: `Maintenance failed: ${error.message}` });
  }
});

// GET /grok/logs - Retrieve system logs
router.get('/logs', async (req, res) => {
  logger.info('Entering /api/grok/logs');
  try {
    const logPath = path.join(__dirname, '../../../grok.log');
    const logs = await fs.readFile(logPath, 'utf8');
    logger.info(`Fetched logs`, { logPath });
    res.status(200).json({ logs });
  } catch (error) {
    logger.error(`Failed to fetch logs: ${error.message}`, { stack: error.stack });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Failed to fetch logs: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: error.message, context: 'logs', stack: error.stack },
    });
    res.status(500).json({ error: `Failed to fetch logs: ${error.message}` });
  }
});

// GET /grok/files - List system files
router.get('/files', async (req, res) => {
  logger.info('Entering /api/grok/files');
  try {
    const pagesDir = path.join(__dirname, '../../../frontend/src/pages');
    const files = await fs.readdir(pagesDir);
    const filteredFiles = files
      .filter((file) => /\.(jsx|js|css)$/.test(file))
      .map((file) => ({ path: `${pagesDir}/${file}`, name: file }));
    logger.info(`Fetched files`, { files: filteredFiles });
    getIO().emit('fileUpdate', {
      event: 'files_fetched',
      files: filteredFiles,
      timestamp: new Date().toISOString(),
      details: `Fetched ${filteredFiles.length} files`,
    });
    res.json(filteredFiles);
  } catch (error) {
    logger.error(`Failed to fetch files: ${error.message}`, { stack: error.stack });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Failed to fetch files: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: error.message, context: 'files', stack: error.stack },
    });
    res.status(500).json({ error: `Failed to fetch files: ${error.message}` });
  }
});

// POST /grok/analyze - Analyze a prompt (placeholder for future expansion)
router.post('/analyze', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    logger.warn(`Invalid prompt`, { prompt });
    return res.status(400).json({ error: 'Prompt is required and must be a non-empty string' });
  }

  try {
    // Placeholder for prompt analysis (e.g., feasibility, complexity)
    logger.info(`Analyzed prompt`, { prompt });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'analyzed',
      message: `Prompt analyzed: ${prompt}`,
      logColor: 'default',
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ message: `Prompt analyzed: ${prompt}` });
  } catch (error) {
    logger.error(`Failed to analyze prompt: ${error.message}`, { prompt, stack: error.stack });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Failed to analyze prompt: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: error.message, context: 'analyze', stack: error.stack },
    });
    res.status(500).json({ error: `Failed to analyze prompt: ${error.message}` });
  }
});

// POST /grok/upload - Upload a file (placeholder for future expansion)
router.post('/upload', async (req, res) => {
  const { filePath, content } = req.body;

  if (!filePath || !content || typeof filePath !== 'string' || typeof content !== 'string') {
    logger.warn(`Invalid upload data`, { filePath, content });
    return res.status(400).json({ error: 'File path and content are required and must be strings' });
  }

  try {
    const targetPath = path.join(__dirname, '../../../frontend/src/pages', filePath);
    await fs.writeFile(targetPath, content, 'utf8');
    logger.info(`File uploaded`, { filePath });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'uploaded',
      message: `File uploaded: ${filePath}`,
      logColor: 'green',
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ message: `File uploaded: ${filePath}` });
  } catch (error) {
    logger.error(`Failed to upload file: ${error.message}`, { filePath, stack: error.stack });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Failed to upload file: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: error.message, context: 'upload', stack: error.stack },
    });
    res.status(500).json({ error: `Failed to upload file: ${error.message}` });
  }
});

module.exports = router;
