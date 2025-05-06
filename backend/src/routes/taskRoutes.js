/*
 * File Path: backend/src/routes/taskRoutes.js
 * Purpose: Defines API routes for task management in Allur Space Console.
 * How It Works:
 *   - Provides endpoints for task creation, deletion, fetching, testing, token refresh, and rollback.
 *   - Integrates with taskManager.js, taskTesterV18.js, and socket.js.
 *   - Handles file uploads in /edit with FormData.
 *   - Supports wristband tasks via programManager.js.
 * Mechanics:
 *   - Validates inputs and uses catchErrors for error handling.
 *   - Emits taskUpdate events via Socket.IO with unique eventId.
 *   - Deduplicates POST /edit requests and taskUpdate emissions using requestId and event cache.
 * Dependencies:
 *   - express@5.1.0, uuid@11.1.0, taskManager.js, socket.js, logUtils.js, errorHandlers.js, taskTesterV18.js, db.js, programManager.js, jwt.
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
 *   - 05/08/2025: Fixed debounceEmit is not defined error (Grok).
 *   - 05/08/2025: Added detailed error logging for POST /edit to debug 500 errors (Grok).
 *   - 05/08/2025: Fixed TypeError: argument handler is required (Grok).
 *   - 05/08/2025: Added debug logging for GET /tasks (Grok).
 *   - 05/05/2025: Fixed 500 error by passing req.user to getTasks and processTask (Grok).
 *   - 05/05/2025: Relaxed taskId validation in DELETE /tasks/:taskId to fix 400 error (Grok).
 *   - 05/08/2025: Enhanced error responses for test failures and aligned with taskManager.js (Grok).
 *   - 05/08/2025: Handled undefined user field in delete operations (Grok).
 *   - 05/08/2025: Added /refresh-token endpoint and fixed /test/:taskId 404 (Grok).
 *   - 05/08/2025: Added /rollback endpoint and fixed /refresh-token 401 errors (Grok).
 *     - Why: 500 error on /rollback, 401 on /refresh-token (User, 05/08/2025).
 *     - How: Added POST /rollback to call taskManager.rollbackChanges, fixed token validation in /refresh-token, ensured consistent userEmail handling.
 *     - Test: POST /api/grok/rollback with { proposalId: "681927c8f7e4fda3f32f5ec1" }, POST /api/grok/refresh-token, verify 200 responses, no 500 or 401 errors.
 * Test Instructions:
 *   - Apply updated taskRoutes.js, ensure backend/.env includes DATABASE_URI=mongodb://localhost:27017/idurar_db and JWT_SECRET=secret.
 *   - Run `npm start` in backend/, `npm run dev` in frontend/.
 *   - Verify server starts without TypeError in console.
 *   - POST /api/grok/edit with { prompt: "Create an inventory system", taskId: "test-uuid-1234-5678-9012-345678901234" }: Verify 200 or 400 response.
 *   - GET /api/grok/tasks: Verify 200 response with tasks.
 *   - DELETE /api/grok/tasks/test-uuid-1234-5678-9012-345678901234: Verify 200 response, task removed.
 *   - DELETE /api/grok/clear-tasks: Verify 200 response, all tasks removed.
 *   - POST /api/grok/test/<taskId>: Verify 200 response, test runs.
 *   - POST /api/grok/refresh-token: Verify 200 response, new token returned.
 *   - POST /api/grok/rollback with { proposalId: "681927c8f7e4fda3f32f5ec1" }: Verify 200 response, task status updates to "denied".
 *   - Check grok.log: Confirm deletion, test, refresh, and rollback logs, no 500 or 401 errors.
 * Rollback Instructions:
 *   - If errors persist: Revert to taskRoutes.js.bak (`copy backend\src\routes\taskRoutes.js.bak backend\src\routes\taskRoutes.js`).
 *   - Verify /api/grok/edit processes tasks post-rollback (may have 500 on rollback or 401 on refresh-token).
 * Future Enhancements:
 *   - Add task prioritization endpoint (Sprint 3).
 *   - Support task versioning (Sprint 4).
 *   - Integrate with ALL Token rewards for task actions (Sprint 3).
 * Self-Notes:
 *   - Nate: Added robust task management with deduplication and wristband support (04/07/2025).
 *   - Grok: Added rollback endpoint and fixed refresh-token issues (05/08/2025).
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { processTask, deleteTask, getTasks, clearTasks, rollbackChanges } = require('../utils/taskManager');
const { processWristbandTask } = require('../utils/programManager');
const { getIO } = require('../socket');
const { logInfo, logError, logDebug } = require('../utils/logUtils');
const { catchErrors, verifyToken } = require('../handlers/errorHandlers');
const { runTests } = require('../utils/taskTesterV18');
const { getModel } = require('../db');

const router = express.Router();
const seenRequests = new Map(); // Cache for requestId deduplication
const seenEvents = new Map(); // Cache for taskUpdate deduplication

// Log middleware loading
console.log('taskRoutes: Loading verifyToken middleware', {
  verifyTokenType: typeof verifyToken,
  timestamp: new Date().toISOString(),
});

// Apply JWT authentication to all routes
if (typeof verifyToken === 'function') {
  router.use(verifyToken);
} else {
  console.error('taskRoutes: verifyToken is not a function', {
    verifyToken: verifyToken,
    timestamp: new Date().toISOString(),
  });
  throw new Error('verifyToken middleware is not defined or not a function');
}

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

// POST /grok/refresh-token - Refresh JWT token
router.post(
  '/refresh-token',
  catchErrors(async (req, res) => {
    const userEmail = req.user?.email;
    console.log('taskRoutes: POST /refresh-token received', {
      user: userEmail || 'undefined',
      timestamp: new Date().toISOString(),
    });

    if (!userEmail) {
      await logError('No user email found for token refresh', 'taskRoutes', {
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    try {
      const newToken = jwt.sign({ email: userEmail }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
      await logInfo('Token refreshed successfully', 'taskRoutes', {
        user: userEmail,
        token: newToken.slice(0, 10) + '...',
        timestamp: new Date().toISOString(),
      });
      res.status(200).json({ success: true, token: newToken });
    } catch (err) {
      await logError(`Token refresh failed: ${err.message}`, 'taskRoutes', {
        user: userEmail,
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({ success: false, message: `Failed to refresh token: ${err.message}` });
    }
  })
);

// POST /grok/edit - Create or update a task with optional file uploads
router.post(
  '/edit',
  catchErrors(async (req, res) => {
    const contentType = req.headers['content-type'];
    let prompt, files = [], requestId, taskId, userEmail;

    console.log('taskRoutes: POST /edit received', {
      contentType,
      body: req.body,
      files: req.files?.length || 0,
      user: req.user?.email,
      timestamp: new Date().toISOString(),
    });

    try {
      if (contentType && contentType.includes('multipart/form-data')) {
        prompt = req.body.prompt;
        files = req.files || [];
        requestId = req.body.requestId;
        taskId = req.body.taskId;
        userEmail = req.body.userEmail || req.user.email;
      } else {
        prompt = req.body.prompt;
        requestId = req.body.requestId;
        taskId = req.body.taskId;
        userEmail = req.body.userEmail || req.user.email;
      }

      if (requestId && seenRequests.has(requestId)) {
        await logInfo('Duplicate request rejected', 'taskRoutes', {
          requestId,
          prompt,
          taskId,
          user: userEmail,
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
          taskId,
          user: userEmail,
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

      taskId = taskId || uuidv4(); // Use provided taskId or generate new

      // Handle wristband tasks
      if (prompt.toLowerCase().includes('wristband')) {
        try {
          await processWristbandTask(taskId, '0xTestWalletAddress', 10); // Replace with actual wallet address
          const Task = await getModel('Task');
          const task = await Task.findOne({ taskId });
          if (!task) {
            throw new Error('Wristband task creation failed: Task not found');
          }
          await logInfo('Wristband task created successfully', 'taskRoutes', {
            taskId,
            prompt,
            user: userEmail,
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
        } catch (wristbandErr) {
          await logError(`Wristband task processing failed: ${wristbandErr.message}`, 'taskRoutes', {
            taskId,
            prompt,
            stack: wristbandErr.stack || 'No stack trace',
            user: userEmail,
            timestamp: new Date().toISOString(),
          });
          if (deduplicateTaskUpdate(taskId || 'unknown', `Wristband task processing failed: ${wristbandErr.message}`)) {
            getIO().emit('taskUpdate', {
              taskId: taskId || 'unknown',
              status: 'failed',
              error: `Wristband task processing failed: ${wristbandErr.message}`,
              logColor: 'red',
              timestamp: new Date().toISOString(),
              eventId: uuidv4(),
            });
          }
          return res.status(400).json({ success: false, message: `Wristband task processing failed: ${wristbandErr.message}` });
        }
      }

      // Handle regular tasks
      try {
        const task = await processTask({
          taskId,
          prompt,
          action: 'create',
          target: 'crm',
          features: [],
          isMultiFile: false,
          backendChanges: [],
          uploadedFiles: files,
          user: userEmail ? { email: userEmail } : undefined,
        });
        await logInfo('Task created successfully', 'taskRoutes', {
          taskId,
          prompt,
          files: files.map(f => f.originalname || 'unknown'),
          user: userEmail,
          status: task.status,
          timestamp: new Date().toISOString(),
        });
        if (task.status === 'completed' && deduplicateTaskUpdate(taskId, 'Task completed')) {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'completed',
            message: `Task completed successfully`,
            logColor: 'green',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        } else if (task.status === 'failed' && deduplicateTaskUpdate(taskId, 'Task failed')) {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'failed',
            error: task.error || 'Task processing failed',
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        }
        if (task.status === 'failed' && task.error?.includes('test failed')) {
          return res.status(400).json({ success: false, message: `Task processing failed due to test error: ${task.error}` });
        }
        res.json({ success: true, task });
      } catch (taskErr) {
        await logError(`Task processing failed: ${taskErr.message}`, 'taskRoutes', {
          taskId,
          prompt,
          files: files.map(f => f.originalname || 'unknown'),
          stack: taskErr.stack || 'No stack trace',
          user: userEmail,
          timestamp: new Date().toISOString(),
        });
        if (deduplicateTaskUpdate(taskId || 'unknown', `Task processing failed: ${taskErr.message}`)) {
          getIO().emit('taskUpdate', {
            taskId: taskId || 'unknown',
            status: 'failed',
            error: `Task processing failed: ${taskErr.message}`,
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
            errorDetails: { reason: taskErr.message, context: 'edit' },
          });
        }
        const status = taskErr.message.includes('test failed') ? 400 : 500;
        res.status(status).json({ success: false, message: `Failed to process task: ${taskErr.message}` });
      }
    } catch (err) {
      await logError(`Unexpected error in /edit: ${err.message}`, 'taskRoutes', {
        taskId,
        prompt,
        stack: err.stack || 'No stack trace',
        user: userEmail,
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId || 'unknown', `Unexpected error: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId: taskId || 'unknown',
          status: 'failed',
          error: `Unexpected error: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'edit' },
        });
      }
      res.status(500).json({ success: false, message: `Unexpected error: ${err.message}` });
    }
  })
);

// DELETE /grok/tasks/:taskId - Delete a specific task
router.delete(
  '/tasks/:taskId',
  catchErrors(async (req, res) => {
    const { taskId } = req.params;
    const userEmail = req.body.userEmail || req.user.email;
    if (!taskId || typeof taskId !== 'string') {
      await logError('Invalid taskId provided', 'taskRoutes', {
        taskId: taskId || 'missing',
        user: userEmail,
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
      const user = userEmail ? { email: userEmail } : undefined;
      await deleteTask(taskId, { user });
      await logInfo('Task deleted successfully', 'taskRoutes', {
        taskId,
        user: userEmail || 'undefined',
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
        user: userEmail || 'undefined',
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
    const userEmail = req.body.userEmail || req.user.email;
    try {
      const user = userEmail ? { email: userEmail } : undefined;
      await clearTasks({ user });
      await logInfo('All tasks cleared successfully', 'taskRoutes', {
        user: userEmail || 'undefined',
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
        user: userEmail || 'undefined',
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
    const userEmail = req.user.email;
    try {
      const user = userEmail ? { email: userEmail } : undefined;
      const tasks = await getTasks({ taskId, user });
      console.log('taskRoutes: Fetching tasks', {
        query: { taskId: taskId || 'all' },
        count: tasks.length,
        taskIds: tasks.map(t => t.taskId),
        user: userEmail || 'undefined',
        timestamp: new Date().toISOString(),
      });
      await logInfo('Fetched tasks successfully', 'taskRoutes', {
        count: tasks.length,
        taskId: taskId || 'all',
        taskIds: tasks.map(t => t.taskId),
        user: userEmail || 'undefined',
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
      console.error('taskRoutes: Fetch tasks failed', {
        query: { taskId: taskId || 'all' },
        error: err.message,
        stack: err.stack,
        user: userEmail || 'undefined',
        timestamp: new Date().toISOString(),
      });
      await logError(`Fetch tasks failed: ${err.message}`, 'taskRoutes', {
        taskId: taskId || 'all',
        stack: err.stack || 'No stack trace',
        user: userEmail || 'undefined',
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

// POST /grok/test/:taskId - Run tests for a task
router.post(
  '/test/:taskId',
  catchErrors(async (req, res) => {
    const { taskId } = req.params;
    const { manual = false } = req.body;
    const userEmail = req.user.email;
    console.log('taskRoutes: POST /test/:taskId received', {
      taskId,
      manual,
      user: userEmail,
      timestamp: new Date().toISOString(),
    });

    if (!taskId || typeof taskId !== 'string') {
      await logError('Invalid taskId for test', 'taskRoutes', {
        taskId: taskId || 'missing',
        user: userEmail,
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
      const task = await Task.findOne({
        taskId,
        user: { $in: [userEmail, null, undefined, 'admin@idurarapp.com'] },
      });
      if (!task) {
        await logError('Task not found', 'taskRoutes', {
          taskId,
          user: userEmail,
          timestamp: new Date().toISOString(),
        });
        if (deduplicateTaskUpdate(taskId, 'Task not found')) {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'failed',
            error: 'Task not found',
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        }
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      if (!task.stagedFiles || task.stagedFiles.length === 0) {
        await logError('No staged files to test', 'taskRoutes', {
          taskId,
          user: userEmail,
          timestamp: new Date().toISOString(),
        });
        if (deduplicateTaskUpdate(taskId, 'No staged files to test')) {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'failed',
            error: 'No staged files to test',
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        }
        return res.status(400).json({ success: false, message: 'No staged files to test' });
      }

      const result = await runTests(null, task.stagedFiles, taskId, manual);
      await logInfo('Task tested successfully', 'taskRoutes', {
        taskId,
        testUrl: result.testUrl || 'N/A',
        manual,
        user: userEmail,
        success: result.success,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      const updatedTask = await Task.findOne({ taskId });
      if (deduplicateTaskUpdate(taskId, 'Task tested')) {
        getIO().emit('taskUpdate', {
          taskId,
          status: result.success ? 'tested' : 'failed',
          files: updatedTask.files,
          stagedFilesCount: updatedTask.stagedFiles.length,
          error: result.error,
          logColor: manual ? 'blue' : (result.success ? 'green' : 'red'),
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          testUrl: result.testUrl,
        });
      }
      if (!result.success) {
        return res.status(400).json({ success: false, message: `Test failed: ${result.error || 'Unknown error'}`, testUrl: result.testUrl });
      }
      res.json({ success: true, task: updatedTask, testUrl: result.testUrl });
    } catch (err) {
      await logError(`Task test failed: ${err.message}`, 'taskRoutes', {
        taskId,
        stack: err.stack || 'No stack trace',
        user: userEmail,
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
      res.status(500).json({ success: false, message: `Failed to run test: ${err.message}` });
    }
  })
);

// GET /grok/test/:taskId/:testId - Serve test results
router.get(
  '/test/:taskId/:testId',
  catchErrors(async (req, res) => {
    const { taskId, testId } = req.params;
    const userEmail = req.user.email;
    if (!taskId || !testId || typeof taskId !== 'string' || typeof testId !== 'string') {
      await logError('Invalid taskId or testId for test results', 'taskRoutes', {
        taskId: taskId || 'missing',
        testId: testId || 'missing',
        user: userEmail,
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
          user: userEmail,
          timestamp: new Date().toISOString(),
        });
        if (deduplicateTaskUpdate(taskId, 'Test results not found')) {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'failed',
            error: 'Test results not found',
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        }
        return res.status(404).json({ success: false, message: 'Test results not found' });
      }

      await logInfo('Served test results', 'taskRoutes', {
        taskId,
        testId,
        testUrl: log.details.testUrl,
        user: userEmail,
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
            <p><strong>Status:</strong> ${log.details.success ? 'Completed' : 'Failed'}</p>
            <a href="/grok">Return to Grok</a>
          </body>
        </html>
      `);
    } catch (err) {
      await logError(`Failed to serve test results: ${err.message}`, 'taskRoutes', {
        taskId,
        testId,
        stack: err.stack || 'No stack trace',
        user: userEmail,
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
    const userEmail = req.user.email;
    if (!taskId || typeof taskId !== 'string') {
      await logError('Invalid taskId for file content', 'taskRoutes', {
        taskId: taskId || 'missing',
        user: userEmail,
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
      const task = await Task.findOne({
        taskId,
        user: { $in: [userEmail, null, undefined, 'admin@idurarapp.com'] },
      });
      if (!task) {
        await logError('Task not found for file content', 'taskRoutes', {
          taskId,
          user: userEmail,
          timestamp: new Date().toISOString(),
        });
        if (deduplicateTaskUpdate(taskId, 'Task not found')) {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'failed',
            error: 'Task not found',
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        }
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      await logInfo('Fetched file content', 'taskRoutes', {
        taskId,
        stagedFilesCount: task.stagedFiles?.length || 0,
        user: userEmail,
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
        user: userEmail,
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

// POST /grok/rollback - Rollback changes for a task
router.post(
  '/rollback',
  catchErrors(async (req, res) => {
    const { proposalId } = req.body;
    const userEmail = req.user.email;
    console.log('taskRoutes: POST /rollback received', {
      proposalId,
      user: userEmail,
      timestamp: new Date().toISOString(),
    });

    if (!proposalId || typeof proposalId !== 'string') {
      await logError('Invalid proposalId provided', 'taskRoutes', {
        proposalId: proposalId || 'missing',
        user: userEmail,
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', 'Invalid proposalId')) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: 'Valid proposal ID is required',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      return res.status(400).json({ success: false, message: 'Valid proposal ID is required' });
    }

    try {
      const BackendProposal = await getModel('BackendProposal');
      const proposal = await BackendProposal.findOne({
        _id: proposalId,
        user: { $in: [userEmail, null, undefined, 'admin@idurarapp.com'] },
      });
      if (!proposal) {
        await logError('Proposal not found', 'taskRoutes', {
          proposalId,
          user: userEmail,
          timestamp: new Date().toISOString(),
        });
        if (deduplicateTaskUpdate(proposal.taskId || 'unknown', 'Proposal not found')) {
          getIO().emit('taskUpdate', {
            taskId: proposal.taskId || 'unknown',
            status: 'failed',
            error: 'Proposal not found',
            logColor: 'red',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        }
        return res.status(404).json({ success: false, message: 'Proposal not found' });
      }

      const taskId = proposal.taskId;
      await rollbackChanges(taskId, { user: userEmail ? { email: userEmail } : undefined });
      await logInfo('Task changes rolled back successfully', 'taskRoutes', {
        taskId,
        proposalId,
        user: userEmail,
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate(taskId, 'Task changes rolled back')) {
        getIO().emit('taskUpdate', {
          taskId,
          status: 'denied',
          message: `Task changes rolled back`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
        });
      }
      res.json({ success: true });
    } catch (err) {
      await logError(`Task rollback failed: ${err.message}`, 'taskRoutes', {
        proposalId,
        stack: err.stack || 'No stack trace',
        user: userEmail,
        timestamp: new Date().toISOString(),
      });
      if (deduplicateTaskUpdate('unknown', `Task rollback failed: ${err.message}`)) {
        getIO().emit('taskUpdate', {
          taskId: 'unknown',
          status: 'failed',
          error: `Task rollback failed: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          errorDetails: { reason: err.message, context: 'rollback' },
        });
      }
      res.status(500).json({ success: false, message: err.message });
    }
  })
);

module.exports = router;
