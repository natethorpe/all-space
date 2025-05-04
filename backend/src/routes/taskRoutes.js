/*
 * File Path: backend/src/routes/taskRoutes.js
 * Purpose: Defines API routes for task management in Allur Space Console.
 * How It Works:
 *   - Provides endpoints for task creation, deletion, fetching, and testing.
 *   - Integrates with taskManager.js, playwrightUtils.js, and socket.js.
 *   - Handles file uploads in /edit with FormData.
 *   - Supports wristband tasks via programManager.js.
 * Mechanics:
 *   - Validates inputs and uses catchErrors for error handling.
 *   - Emits taskUpdate events via Socket.IO with unique eventId.
 *   - Deduplicates POST /edit requests and taskUpdate emissions using requestId and event cache.
 * Dependencies:
 *   - express@5.1.0, uuid@11.1.0, taskManager.js, socket.js, logUtils.js, errorHandlers.js, playwrightUtils.js, db.js, programManager.js.
 * Dependents:
 *   - app.js: Mounts routes at /api/grok.
 *   - GrokUI.jsx, useTasks.js, useTaskSocket.js, TaskList.jsx.
 * Why It’s Here:
 *   - Core task management API for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized routes (Nate).
 *   - 05/07/2025: Added requestId deduplication for POST /edit (Grok).
 *   - 05/01/2025: Added taskUpdate emission deduplication (Grok).
 *   - 05/08/2025: Fixed SyntaxError for processWristbandTask, integrated wristband tasks (Grok).
 *     - Why: SyntaxError: await outside async function (User, 05/08/2025).
 *     - How: Made /edit route async, properly awaited processWristbandTask, preserved deduplication.
 *     - Test: POST /api/grok/edit with "Purchase wristband", verify task in idurar_db.tasks.
 * Test Instructions:
 *   - Run `npm start`, POST /api/grok/edit with "Create an inventory system" multiple times.
 *   - Verify single task in idurar_db.tasks, single taskUpdate log in LiveFeed.jsx, 409 for duplicates.
 *   - POST /api/grok/edit with "Purchase wristband with ALL Token", verify task in idurar_db.tasks.
 *   - Check idurar_db.logs for deduplication logs, no duplicate emissions.
 * Rollback Instructions:
 *   - Revert to taskRoutes.js.bak (`mv backend/src/routes/taskRoutes.js.bak backend/src/routes/taskRoutes.js`).
 *   - Verify /api/grok/edit processes tasks post-rollback.
 * Future Enhancements:
 *   - Add task prioritization endpoint (Sprint 3).
 *   - Support task versioning (Sprint 4).
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { processTask, deleteTask, getTasks, clearTasks } = require('../utils/taskManager');
const { processWristbandTask } = require('../utils/programManager'); // Added programManager.js
const { getIO } = require('../socket');
const { logInfo, logError, logDebug } = require('../utils/logUtils');
const { catchErrors } = require('../handlers/errorHandlers');
const { runPlaywrightTests } = require('../utils/playwrightUtils');
const { getModel } = require('../db');

const router = express.Router();
const seenRequests = new Map(); // Cache for requestId deduplication
const seenEvents = new Map(); // Cache for taskUpdate deduplication

// Deduplicate taskUpdate emissions
function deduplicateTaskUpdate(taskId, message) {
  const eventKey = `${taskId}_${message}`;
  const now = Date.now();
  const entry = seenEvents.get(eventKey);
  if (entry && now - entry.timestamp < 60 * 1000) {
    logDebug('Skipped duplicate taskUpdate emission', 'taskRoutes', {
      eventKey,
      taskId,
      message,
      timestamp: new Date().toISOString(),
    });
    return false; // Duplicate within 60s
  }
  seenEvents.set(eventKey, { timestamp: now });
  setTimeout(() => seenEvents.delete(eventKey), 60 * 1000);
  return true;
}

// POST /grok/edit - Create or update a task with optional file uploads
router.post(
  '/edit',
  catchErrors(async (req, res) => {
    const contentType = req.headers['content-type'];
    let prompt, files = [], requestId;

    if (contentType && contentType.includes('multipart/form-data')) {
      prompt = req.body.prompt;
      files = req.files || [];
      requestId = req.body.requestId;
    } else {
      prompt = req.body.prompt;
      requestId = req.body.requestId;
    }

    if (requestId && seenRequests.has(requestId)) {
      await logInfo('Duplicate request rejected', 'taskRoutes', {
        requestId,
        prompt,
        timestamp: new Date().toISOString(),
      });
      return res.status(409).json({ success: false, message: 'Duplicate request detected' });
    }
    if (requestId) {
      seenRequests.set(requestId, Date.now());
      setTimeout(() => seenRequests.delete(requestId), 60 * 1000);
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      await logError('Invalid prompt provided', 'taskRoutes', {
        prompt: prompt || 'missing',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', 'Prompt is required')) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: 'Prompt is required and must be a non-empty string',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      return res.status(400).json({ success: false, message: 'Prompt is required and must be a non-empty string' });
    }

    try {
      const taskId = uuidv4();
      // Handle wristband tasks
      if (prompt.toLowerCase().includes('wristband')) {
        await processWristbandTask(taskId, '0xTestWalletAddress', 10); // Replace with actual wallet address
        const Task = await getModel('Task');
        const task = await Task.findOne({ taskId });
        if (!task) {
          throw new Error('Wristband task creation failed: Task not found');
        }
        await logInfo('Wristband task created successfully', 'taskRoutes', {
          taskId,
          prompt,
          timestamp: new Date().toISOString(),
        });
        if (deduplicateTaskUpdate(taskId, 'Wristband task created')) {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'created',
            message: `Wristband task created successfully`,
            logColor: 'green',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        }
        return res.json({ success: true, task });
      }

      // Handle regular tasks
      await processTask(taskId, prompt, 'create', 'crm', [], false, [], files);
      const Task = await getModel('Task');
      const task = await Task.findOne({ taskId });
      if (!task) {
        throw new Error('Task creation failed: Task not found in database');
      }
      await logInfo('Task created successfully', 'taskRoutes', {
        taskId,
        prompt,
        files: files.map(f => f.originalname),
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId, 'Task created')) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'created',
          message: `Task created successfully`,
          logColor: 'green',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      res.json({ success: true, task });
    } catch (err) {
      await logError(`Task processing failed: ${err.message}`, 'taskRoutes', {
        prompt,
        files: files.map(f => f.originalname),
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', `Task processing failed: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: `Task processing failed: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'edit' },
        });
      }
      res.status(500).json({ success: false, message: `Failed to process task: ${err.message}` });
    }
  })
);

// DELETE /grok/tasks/:taskId - Delete a specific task
router.delete(
  '/tasks/:taskId',
  catchErrors(async (req, res) => {
    const { taskId } = req.params;
    if (!taskId || typeof taskId !== 'string' || taskId.length !== 36) {
      await logError('Invalid taskId provided', 'taskRoutes', {
        taskId: taskId || 'missing',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', 'Invalid taskId')) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: 'Valid task ID is required',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      return res.status(400).json({ success: false, message: 'Valid task ID is required' });
    }

    try {
      await deleteTask(taskId);
      await logInfo('Task deleted successfully', 'taskRoutes', {
        taskId,
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId, 'Task deleted')) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'deleted',
          message: `Task deleted`,
          logColor: 'green',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      res.json({ success: true });
    } catch (err) {
      await logError(`Task deletion failed: ${err.message}`, 'taskRoutes', {
        taskId,
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId, `Task deletion failed: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          error: `Task deletion failed: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'delete' },
        });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  })
);

// DELETE /grok/clear-tasks - Clear all tasks
router.delete(
  '/clear-tasks',
  catchErrors(async (req, res) => {
    try {
      await clearTasks();
      await logInfo('All tasks cleared successfully', 'taskRoutes', {
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('all', 'All tasks cleared')) {
        getIO().emit('taskUpdate', {
          taskId: 'all',
          status: 'cleared',
          message: `All tasks cleared`,
          logColor: 'green',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      res.json({ success: true });
    } catch (err) {
      await logError(`Clear tasks failed: ${err.message}`, 'taskRoutes', {
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('all', `Clear tasks failed: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId: 'all',
          status: 'failed',
          error: `Clear tasks failed: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'clearTasks' },
        });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  })
);

// GET /grok/tasks - Fetch all tasks or a specific task
router.get(
  '/tasks',
  catchErrors(async (req, res) => {
    const { taskId } = req.query;
    try {
      const tasks = await getTasks({ taskId });
      await logInfo('Fetched tasks successfully', 'taskRoutes', {
        count: tasks.length,
        taskId: taskId || 'all',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId || 'all', `Fetched ${tasks.length} tasks`)) {
        getIO().emit('taskUpdate', {
          taskId: taskId || 'all',
          status: 'fetched',
          message: `Fetched ${tasks.length} tasks`,
          logColor: 'green',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      res.json({ success: true, tasks });
    } catch (err) {
      await logError(`Fetch tasks failed: ${err.message}`, 'taskRoutes', {
        taskId: taskId || 'all',
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId || 'all', `Fetch tasks failed: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId: taskId || 'all',
          status: 'failed',
          error: `Failed to fetch tasks: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'fetchTasks' },
        });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  })
);

// POST /grok/test/:taskId - Run Playwright tests for a task
router.post(
  '/test/:taskId',
  catchErrors(async (req, res) => {
    const { taskId } = req.params;
    const { manual = false } = req.body;
    if (!taskId || typeof taskId !== 'string' || taskId.length !== 36) {
      await logError('Invalid taskId for test', 'taskRoutes', {
        taskId: taskId || 'missing',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', 'Invalid taskId for test')) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: 'Valid task ID is required',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      return res.status(400).json({ success: false, message: 'Valid task ID is required' });
    }

    try {
      const Task = await getModel('Task');
      const task = await Task.findOne({ taskId });
      if (!task) {
        await logError('Task not found', 'taskRoutes', {
          taskId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('Task not found');
      }
      if (!task.stagedFiles || task.stagedFiles.length === 0) {
        await logError('No staged files to test', 'taskRoutes', {
          taskId,
          timestamp: new Date().toISOString(),
        });
        throw new Error('No staged files to test');
      }

      const result = await runPlaywrightTests(taskId, task.stagedFiles, task.prompt, manual);
      await logInfo('Task tested successfully', 'taskRoutes', {
        taskId,
        testUrl: result.testUrl || 'N/A',
        manual,
        timestamp: new Date().toISOString(),
      });
      const updatedTask = await Task.findOne({ taskId });
      if (deduplicateTaskUpdate(taskId, 'Task tested')) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'tested',
          files: updatedTask.files,
          stagedFilesCount: updatedTask.stagedFiles.length,
          error: null,
          logColor: manual ? 'blue' : 'green',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          testUrl: result.testUrl,
        });
      }
      res.json({ success: true, task: updatedTask, testUrl: result.testUrl });
    } catch (err) {
      await logError(`Task test failed: ${err.message}`, 'taskRoutes', {
        taskId,
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId, `Task test failed: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          files: [],
          stagedFilesCount: 0,
          error: err.message,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'test' },
        });
      }
      res.status(500).json({ success: false, message: `Failed to run Playwright test: ${err.message}` });
    }
  })
);

// GET /test/:taskId/:testId - Serve Playwright test results
router.get(
  '/test/:taskId/:testId',
  catchErrors(async (req, res) => {
    const { taskId, testId } = req.params;
    if (!taskId || !testId || typeof taskId !== 'string' || typeof testId !== 'string') {
      await logError('Invalid taskId or testId for test results', 'taskRoutes', {
        taskId: taskId || 'missing',
        testId: testId || 'missing',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', 'Invalid taskId or testId')) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: 'Valid task ID and test ID are required',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      return res.status(400).json({ success: false, message: 'Valid task ID and test ID are required' });
    }

    try {
      const Log = await getModel('Log');
      const log = await Log.findOne({
        'details.taskId': taskId,
        'details.testUrl': { $regex: testId, $options: 'i' },
      });
      if (!log) {
        await logError('Test results not found', 'taskRoutes', {
          taskId,
          testId,
          timestamp: new Date().toISOString(),
        });
        return res.status(404).json({ success: false, message: 'Test results not found' });
      }

      await logInfo('Served test results', 'taskRoutes', {
        taskId,
        testId,
        testUrl: log.details.testUrl,
        timestamp: new Date().toISOString(),
      });

      res.set('Content-Type', 'text/html');
      res.send(`
        <html>
          <head><title>Test Results for Task ${taskId}</title></head>
          <body>
            <h1>Test Results for Task ${taskId}</h1>
            <p><strong>Test URL:</strong> ${log.details.testUrl}</p>
            <p><strong>Test File:</strong> ${log.details.testFile || 'N/A'}</p>
            <p><strong>Timestamp:</strong> ${log.timestamp}</p>
            <p><strong>Status:</strong> Completed</p>
            <a href="/grok">Return to Grok</a>
          </body>
        </html>
      `);
    } catch (err) {
      await logError(`Failed to serve test results: ${err.message}`, 'taskRoutes', {
        taskId,
        testId,
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId, `Failed to serve test results: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          error: `Failed to serve test results: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'testResults' },
        });
      }
      res.status(500).json({ success: false, message: `Failed to serve test results: ${err.message}` });
    }
  })
);

// GET /grok/file-content - Fetch task content for diff viewer
router.get(
  '/file-content',
  catchErrors(async (req, res) => {
    const { taskId } = req.query;
    if (!taskId || typeof taskId !== 'string' || taskId.length !== 36) {
      await logError('Invalid taskId for file content', 'taskRoutes', {
        taskId: taskId || 'missing',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', 'Invalid taskId for file content')) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: 'Valid task ID is required',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      return res.status(400).json({ success: false, message: 'Valid task ID is required' });
    }

    try {
      const Task = await getModel('Task');
      const task = await Task.findOne({ taskId });
      if (!task) {
        await logError('Task not found for file content', 'taskRoutes', {
          taskId,
          timestamp: new Date().toISOString(),
        });
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      await logInfo('Fetched file content', 'taskRoutes', {
        taskId,
        stagedFilesCount: task.stagedFiles?.length || 0,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        originalContent: task.originalContent || {},
        newContent: task.newContent || {},
        stagedFiles: task.stagedFiles || [],
        generatedFiles: task.generatedFiles || [],
        proposedChanges: task.proposedChanges || [],
        testInstructions: task.testInstructions || 'No test instructions available',
        uploadedFiles: task.uploadedFiles || [],
      });
    } catch (err) {
      await logError(`Failed to fetch file content: ${err.message}`, 'taskRoutes', {
        taskId,
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId, `Failed to fetch file content: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          error: `Failed to fetch file content: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'fileContent' },
        });
      }
      res.status(500).json({ success: false, message: `Failed to fetch file content: ${err.message}` });
    }
  })
);

module.exports = router;
