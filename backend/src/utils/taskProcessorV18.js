/*
 * File Path: backend/src/utils/taskProcessorV18.js
 * Purpose: Minimal orchestrator for task processing in Allur Space Console, delegating to modular utilities.
 * How It Works:
 *   - Validates taskId and orchestrates task processing via taskManager.js, including prompt parsing, file generation, testing, and validation.
 *   - Delegates to modular utilities: promptParser.js, taskManager.js, testGenerator.js, selfEnhancer.js, systemAnalyzer.js.
 *   - Emits Socket.IO events (taskUpdate) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs all operations to grok.log using winston for debugging and traceability.
 * Mechanics:
 *   - processTask: Validates taskId, checks task existence, delegates to taskManager.js for processing, triggers tests, and updates task status.
 *   - applyApprovedChanges, rollbackChanges, deleteTask: Proxy calls to taskManager.js for consistency.
 *   - Uses UUID regex for taskId validation to prevent errors.
 * Dependencies:
 *   - mongoose: Task model for MongoDB operations (version 8.13.2).
 *   - socket.js: getIO for Socket.IO emissions (version 4.8.1).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - taskManager.js: processTask, applyApprovedChanges, rollbackChanges, deleteTask for task operations.
 *   - testGenerator.js: runTests for Playwright testing.
 *   - promptParser.js: parsePrompt for extracting action, target, features.
 *   - selfEnhancer.js: selfValidateTask for task validation.
 *   - systemAnalyzer.js: analyzeSystem for system state analysis.
 *   - fileUtils.js: appendLog, errorLogPath for error logging.
 * Dependents:
 *   - taskRoutes.js: Calls processTask for /grok/edit endpoint.
 *   - GrokUI.jsx: Receives taskUpdate events via useTasks.js for UI updates.
 * Why It’s Here:
 *   - Reduced from ~1000 lines to ~150 lines to act as a minimal orchestrator, improving maintainability (04/23/2025).
 *   - Supports Sprint 2 task workflow by delegating to modular utilities, ensuring scalability (04/23/2025).
 *   - Facilitates transition to taskManager.js, planned for deprecation in Sprint 3 (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Reduced to minimal orchestrator, removed redundant functions.
 *   - 04/23/2025: Fixed socket.js import path to resolve MODULE_NOT_FOUND error.
 *   - 05/01/2025: Added eventId to taskUpdate emissions (Grok).
 *     - Why: Duplicate taskUpdate events during task processing (User, 05/01/2025).
 *     - How: Added uuidv4 eventId to all emissions, enhanced logging.
 *     - Test: POST /api/grok/edit with "Build CRM system", verify single yellow log in LiveFeed.jsx.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, grok.log logs taskProcessorV18.js operations without MODULE_NOT_FOUND error.
 *   - Submit "Build CRM system" via /grok/edit: Verify task reaches pending_approval, stagedFiles (e.g., Login-vX.jsx) in TaskList.jsx, single yellow log.
 *   - Run /grok/test: Confirm Playwright test runs, live feed logs green (auto) or blue (manual).
 *   - Approve via /grok/approve: Verify status=applied, files renamed, live feed green log.
 *   - Check grok.log: Confirm no validation or DB errors.
 * Future Enhancements:
 *   - Deprecate in favor of taskManager.js (Sprint 3).
 *   - Add task dependency handling (Sprint 6).
 */

const mongoose = require('mongoose');
const { getIO } = require('../socket');
const { parsePrompt } = require('./promptParser');
const { processTask, applyApprovedChanges, rollbackChanges, deleteTask } = require('./taskManager');
const { runTests } = require('./testGenerator');
const { selfValidateTask } = require('./selfEnhancer');
const { analyzeSystem } = require('./systemAnalyzer');
const winston = require('winston');
const { appendLog, errorLogPath } = require('./fileUtils');
const { v4: uuidv4 } = require('uuid');

const Task = mongoose.model('Task');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

function isValidTaskId(taskId) {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) {
    logger.warn(`Invalid taskId: ${taskId}`, { timestamp: new Date().toISOString() });
    appendLog(errorLogPath, `Invalid taskId: ${taskId}`);
  }
  return isValid;
}

async function processTask(taskId) {
  if (!isValidTaskId(taskId)) {
    const eventId = uuidv4();
    getIO().emit('taskUpdate', { 
      taskId, 
      status: 'failed', 
      error: 'Invalid taskId', 
      logColor: 'red', 
      timestamp: new Date().toISOString(),
      eventId
    });
    throw new Error('Invalid taskId');
  }

  const task = await Task.findOne({ taskId });
  if (!task) {
    const eventId = uuidv4();
    getIO().emit('taskUpdate', { 
      taskId, 
      status: 'failed', 
      error: 'Task not found', 
      logColor: 'red', 
      timestamp: new Date().toISOString(),
      eventId
    });
    throw new Error('Task not found');
  }

  logger.info(`Processing task: ${taskId}, Prompt: ${task.prompt}`, { timestamp: new Date().toISOString() });
  const processingEventId = uuidv4();
  getIO().emit('taskUpdate', { 
    taskId, 
    status: 'processing', 
    logColor: 'blue', 
    timestamp: new Date().toISOString(),
    eventId: processingEventId
  });

  try {
    const analysis = await analyzeSystem(taskId);
    const { action, target, features, isMultiFile, backendChanges } = await parsePrompt(task.prompt, analysis.memory, analysis.fileNotes, analysis.logInsights);

    await processTask(taskId, task.prompt, action, target, features, isMultiFile, backendChanges);

    if (await selfValidateTask(taskId, task.prompt)) {
      await runTests(undefined, task.stagedFiles, taskId);
      task.status = 'pending_approval';
      await task.save();
      const pendingEventId = uuidv4();
      getIO().emit('taskUpdate', {
        taskId,
        status: 'pending_approval',
        stagedFiles: task.stagedFiles,
        logColor: 'yellow',
        timestamp: new Date().toISOString(),
        eventId: pendingEventId
      });
    } else {
      task.status = 'failed';
      await task.save();
      const errorEventId = uuidv4();
      getIO().emit('taskUpdate', {
        taskId,
        status: 'failed',
        error: 'Validation failed',
        logColor: 'red',
        timestamp: new Date().toISOString(),
        eventId: errorEventId
      });
    }
  } catch (err) {
    logger.error(`Task processing failed: ${err.message}`, { taskId, stack: err.stack, timestamp: new Date().toISOString() });
    task.status = 'failed';
    task.error = err.message;
    await task.save();
    const errorEventId = uuidv4();
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: `Task processing failed: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: errorEventId,
      errorDetails: { reason: err.message, context: 'processTask' }
    });
    throw err;
  }
}

module.exports = { processTask, applyApprovedChanges, rollbackChanges, deleteTask };
