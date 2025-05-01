/*
 * File Path: backend/src/utils/testGenerator.js
 * Purpose: Orchestrates Playwright test generation and execution for tasks in Allur Space Console.
 * How It Works:
 *   - Validates taskId and stagedFiles, generates test files via testUtils.js.
 *   - Delegates test execution to testExecutionUtils.js.
 *   - Logs results to MongoDB Log model and emits taskUpdate events via Socket.IO.
 * Mechanics:
 *   - Supports automated headless tests during task processing and manual headed tests via /grok/test.
 * Dependencies:
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - testUtils.js: Generates test files.
 *   - testExecutionUtils.js: Executes tests.
 *   - fileUtils.js: appendLog, errorLogPath.
 *   - socket.js: getIO for Socket.IO.
 *   - mongoose: Task, Log models for logging.
 *   - db.js: getModel for model access.
 *   - uuid: Generates eventId (version 11.1.0).
 * Dependents:
 *   - taskRoutes.js: Uses for /grok/test endpoint.
 *   - taskProcessorV18.js: Calls runTestsWrapper for task validation.
 * Why It’s Here:
 *   - Modularizes test orchestration for Sprint 2 (04/21/2025).
 * Change Log:
 *   - 04/21/2025: Created for test execution (Nate).
 *   - 04/23/2025: Moved generatePlaywrightTest to testUtils.js to fix circular dependency (Nate).
 *   - 04/30/2025: Aligned with provided version, enhanced logging (Grok).
 *     - Why: Ensure compatibility, improve traceability (User, 04/30/2025).
 *     - How: Incorporated provided logic, added MongoDB logging via logUtils.js.
 * Test Instructions:
 *   - Run `npm start`, POST /grok/edit with "Build CRM system": Confirm test file generated in tests/, headless test runs, testResults in idurar_db.tasks.
 *   - POST /grok/test with { taskId, manual: true }: Verify browser opens, blue log in LiveFeed.jsx.
 *   - GET /grok/test/:taskId: Confirm test URL returned, headed test runs, blue log in LiveFeed.jsx.
 *   - Check idurar_db.logs: Confirm test execution logs, no filesystem writes.
 * Rollback Instructions:
 *   - Revert to testGenerator.js.bak (`mv backend/src/utils/testGenerator.js.bak backend/src/utils/testGenerator.js`).
 *   - Verify /grok/test works post-rollback.
 * Future Enhancements:
 *   - Add test suite generation (Sprint 4).
 *   - Support custom assertions (Sprint 6).
 */

const winston = require('winston');
const path = require('path');
const { generatePlaywrightTest } = require('./testUtils');
const { runTests } = require('./testExecutionUtils');
const { appendLog, errorLogPath } = require('./fileUtils');
const { getIO } = require('../socket');
const { getModel } = require('../db');
const { logInfo, logDebug, logError } = require('./logUtils');
const { v4: uuidv4 } = require('uuid');

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
  if (!isValid) logger.warn(`Invalid taskId detected`, { taskId: taskId || 'missing', stack: new Error().stack });
  return isValid;
}

async function runTestsWrapper(testFile, stagedFiles, taskId, manual = false) {
  console.log('testGenerator: runTestsWrapper called with taskId:', taskId, 'manual:', manual, 'stagedFiles:', stagedFiles.length);
  const Log = await getModel('Log');
  const Task = await getModel('Task');

  if (!isValidTaskId(taskId)) {
    await logError(`Test execution skipped: Invalid taskId`, 'testGenerator', { taskId: taskId || 'unknown', timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId: taskId || 'unknown',
      status: 'failed',
      error: `Invalid taskId: ${taskId || 'missing'}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
    });
    throw new Error('Invalid taskId');
  }

  if (!stagedFiles || !Array.isArray(stagedFiles) || stagedFiles.length === 0 || !stagedFiles.every(f => f.path && f.content)) {
    await logError('Invalid stagedFiles', 'testGenerator', { taskId, stagedFiles, timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: 'Invalid or missing stagedFiles',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
    });
    throw new Error('Invalid or missing stagedFiles');
  }

  try {
    const task = await Task.findOne({ taskId });
    if (!task) {
      await logError('Task not found', 'testGenerator', { taskId, timestamp: new Date().toISOString() });
      throw new Error('Task not found');
    }

    const generatedTestFile = testFile || await generatePlaywrightTest(taskId, stagedFiles, task.prompt);
    const testResult = await runTests(generatedTestFile, stagedFiles, taskId, manual);

    await logInfo(`Tests completed successfully`, 'testGenerator', {
      taskId,
      testFile: generatedTestFile,
      mode: manual ? 'manual' : 'auto',
      testedFiles: stagedFiles.length,
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'tested',
      message: `Tests completed for ${stagedFiles.length} files`,
      logColor: manual ? 'blue' : 'green',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      testResult,
    });
    return testResult;
  } catch (err) {
    const testResult = { success: false, error: err.message, timestamp: new Date().toISOString() };
    await logError(`Test execution failed: ${err.message}`, 'testGenerator', {
      taskId,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: `Test execution failed: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      errorDetails: { reason: err.message, context: 'runTestsWrapper', stack: err.stack },
    });
    await appendLog(errorLogPath, `# Test Execution Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}`);
    throw err;
  }
}

module.exports = { runTests: runTestsWrapper };
