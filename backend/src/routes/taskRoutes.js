/*
 * File Path: backend/src/routes/taskRoutes.js
 * Purpose: Defines Express routes for managing tasks in Allur Space Console, supporting task creation, deletion, and testing.
 * How It Works:
 *   - Provides endpoints: /grok/edit (POST), /grok/tasks (GET, DELETE), /grok/tasks/:taskId (DELETE), /grok/approve (POST), /grok/deny (POST), /grok/test (POST), /grok/test/:taskId (GET).
 *   - Uses Task model from db.js for MongoDB operations.
 *   - Validates taskId and prompt to prevent errors.
 *   - Integrates taskManager.js for task processing, approval, denial, and deletion.
 *   - Integrates testGenerator.js for running Playwright tests.
 *   - Emits Socket.IO events (taskUpdate, tasks_cleared) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs all requests, responses, and errors to MongoDB Log model (idurar_db.logs).
 * Dependencies:
 *   - express: Router for defining endpoints (version 5.1.0).
 *   - mongoose: Task, Log models for MongoDB operations (version 8.13.2).
 *   - socket.js: getIO for Socket.IO emissions (version 4.8.1).
 *   - taskManager.js: processTask, applyApprovedChanges, rollbackChanges, deleteTask.
 *   - testGenerator.js: runTests for task testing.
 *   - logUtils.js: MongoDB logging utilities.
 * Why It’s Here:
 *   - Supports Sprint 2 task management workflow by providing robust endpoints (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Created to handle task CRUD operations and integrate taskManager.js.
 *   - 04/28/2025: Fixed ReferenceError: mongoose is not defined.
 *   - 04/28/2025: Transitioned logging to MongoDB Log model.
 *   - 05/01/2025: Enhanced /grok/delete-task and /grok/clear-tasks with verification and retries.
 *   - 05/03/2025: Fixed getIO(...).emit is not a function error.
 *   - 05/XX/2025: Added /grok/test/:taskId endpoint for manual test links.
 *   - 05/XX/2025: Fixed 500 Internal Server Error on /grok/edit.
 *     - Why: Address POST /api/grok/edit 500 error (User, 05/XX/2025).
 *     - How: Enhanced error handling, added detailed logging, ensured processTask errors are caught.
 *     - Test: POST /grok/edit with "Build CRM system", verify 200 response, no 500 errors.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, idurar_db.logs logs “Mounted /api/grok successfully”.
 *   - POST /grok/edit with { prompt: "Build CRM system", taskId: "<uuid>" }: Confirm 200 response, task created, taskUpdate event with blue log.
 *   - GET /grok/tasks: Confirm 200 response with task list, log in idurar_db.logs.
 *   - DELETE /grok/tasks/:taskId: Confirm 200 response, task deleted, single green log in LiveFeed.jsx.
 *   - DELETE /grok/tasks: Confirm 200 response, all tasks cleared, green log in LiveFeed.jsx.
 *   - POST /grok/test with { taskId, manual: true }: Confirm test runs, blue log in LiveFeed.jsx.
 *   - GET /grok/test/:taskId: Confirm 200 response with test URL, blue log in LiveFeed.jsx.
 *   - Invalid taskId: Verify 400 response, error in idurar_db.logs, red log in LiveFeed.jsx.
 *   - Check idurar_db.logs: Confirm task route logs, no filesystem writes.
 * Future Enhancements:
 *   - Add task prioritization endpoints (Sprint 4).
 *   - Support task scheduling (Sprint 6).
 * Self-Notes:
 *   - Nate: Created for Sprint 2 task management (04/23/2025).
 *   - Nate: Fixed mongoose error and transitioned to MongoDB logging (04/28/2025).
 *   - Nate: Enhanced deletion endpoints for Playwright button fix and MongoDB logging (05/01/2025).
 *   - Nate: Fixed getIO error with fallback and enhanced logging (05/03/2025).
 *   - Nate: Fixed 500 error with robust error handling (05/XX/2025).
 * Rollback Instructions:
 *   - If routes fail: Copy taskRoutes.js.bak to taskRoutes.js (`mv backend/src/routes/taskRoutes.js.bak backend/src/routes/taskRoutes.js`).
 *   - Verify /grok/edit works after rollback.
 */
const express = require('express');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../socket');
const { processTask, applyApprovedChanges, rollbackChanges, deleteTask } = require('../utils/taskManager');
const { runTests } = require('../utils/testGenerator');
const { logInfo, logDebug, logWarn, logError } = require('../utils/logUtils');

const router = express.Router();
const Task = mongoose.model('Task');

function isValidTaskId(taskId) {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) logWarn('Invalid taskId detected', 'taskRoutes', { taskId: taskId || 'missing', timestamp: new Date().toISOString() });
  return isValid;
}

// POST /grok/edit - Create and process a new task
router.post('/edit', async (req, res) => {
  const { prompt, taskId = uuidv4() } = req.body;
  await logInfo('Task edit request', 'taskRoutes', { taskId, prompt, timestamp: new Date().toISOString() });

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    await logWarn('Invalid prompt', 'taskRoutes', { prompt, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: 'Invalid prompt' });
  }
  if (!isValidTaskId(taskId)) {
    await logWarn('Invalid taskId', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
  }

  try {
    await processTask(taskId, prompt, 'create', 'crm', ['crm']);
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'processing',
        message: `Task submitted: ${prompt}`,
        logColor: 'blue',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskRoutes', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    const task = await Task.findOne({ taskId });
    await logInfo('Task processed', 'taskRoutes', {
      taskId,
      prompt,
      stagedFiles: task?.stagedFiles?.length || 0,
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ message: 'Task processed successfully', taskId });
  } catch (err) {
    await logError(`Task processing error: ${err.message}`, 'taskRoutes', {
      taskId,
      prompt,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    if (err.message.includes('Socket.IO not initialized')) {
      return res.status(503).json({ error: 'Task service temporarily unavailable', details: err.message });
    }
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /grok/tasks - Fetch tasks
router.get('/tasks', async (req, res) => {
  const { taskId } = req.query;
  await logInfo('Fetch tasks request', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });

  try {
    let tasks;
    if (taskId) {
      if (!isValidTaskId(taskId)) {
        await logWarn('Invalid taskId', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
        return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
      }
      tasks = await Task.find({ taskId });
    } else {
      tasks = await Task.find({});
    }
    await logDebug(`Returning ${tasks.length} tasks`, 'taskRoutes', {
      taskIds: tasks.map(t => t.taskId),
      stagedFiles: tasks.map(t => t.stagedFiles?.length || 0),
      timestamp: new Date().toISOString(),
    });
    try {
      getIO().emit('tasks_fetched', { tasks, eventId: uuidv4() });
    } catch (emitErr) {
      await logError('Failed to emit tasks_fetched event', 'taskRoutes', {
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    res.status(200).json(tasks);
  } catch (error) {
    await logError(`Failed to fetch tasks: ${error.message}`, 'taskRoutes', { stack: error.stack, timestamp: new Date().toISOString() });
    res.status(500).json({ error: `Failed to fetch tasks: ${error.message}` });
  }
});

// DELETE /grok/tasks - Clear all tasks
router.delete('/tasks', async (req, res) => {
  await logInfo('Clear all tasks request', 'taskRoutes', { timestamp: new Date().toISOString() });

  try {
    let attempt = 0;
    const maxAttempts = 10;
    while (attempt < maxAttempts) {
      try {
        const tasks = await Task.find({});
        for (const task of tasks) {
          await deleteTask(task.taskId);
        }
        const remainingTasks = await Task.find({});
        if (remainingTasks.length > 0) {
          throw new Error(`Tasks still exist: ${remainingTasks.length} remaining`);
        }
        await logInfo(`Cleared ${tasks.length} tasks`, 'taskRoutes', {
          taskIds: tasks.map(t => t.taskId),
          timestamp: new Date().toISOString(),
        });
        try {
          getIO().emit('tasks_cleared', { eventId: uuidv4() });
        } catch (emitErr) {
          await logError('Failed to emit tasks_cleared event', 'taskRoutes', {
            error: emitErr.message,
            stack: emitErr.stack,
            timestamp: new Date().toISOString(),
          });
        }
        res.status(200).json({ message: 'All tasks cleared' });
        return;
      } catch (error) {
        attempt++;
        await logWarn(`Clear tasks attempt ${attempt}/${maxAttempts} failed: ${error.message}`, 'taskRoutes', {
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  } catch (error) {
    await logError(`Failed to clear tasks: ${error.message}`, 'taskRoutes', { stack: error.stack, timestamp: new Date().toISOString() });
    res.status(500).json({ error: `Failed to clear tasks: ${error.message}` });
  }
});

// DELETE /grok/tasks/:taskId - Delete a specific task
router.delete('/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  await logInfo('Task delete request', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });

  if (!isValidTaskId(taskId)) {
    await logWarn('Invalid taskId', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
  }

  try {
    let attempt = 0;
    const maxAttempts = 10;
    while (attempt < maxAttempts) {
      try {
        await deleteTask(taskId);
        const task = await Task.findOne({ taskId });
        if (task) {
          throw new Error('Task still exists after deletion');
        }
        await logInfo('Task deleted', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
        try {
          getIO().emit('taskUpdate', {
            taskId,
            status: 'deleted',
            message: 'Task deleted',
            logColor: 'green',
            timestamp: new Date().toISOString(),
            eventId: uuidv4(),
          });
        } catch (emitErr) {
          await logError('Failed to emit taskUpdate event', 'taskRoutes', {
            taskId,
            error: emitErr.message,
            stack: emitErr.stack,
            timestamp: new Date().toISOString(),
          });
        }
        res.status(200).json({ message: 'Task deleted' });
        return;
      } catch (error) {
        attempt++;
        await logWarn(`Delete task attempt ${attempt}/${maxAttempts} failed: ${error.message}`, 'taskRoutes', {
          taskId,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  } catch (error) {
    await logError(`Failed to delete task: ${error.message}`, 'taskRoutes', {
      taskId,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: `Failed to delete task: ${error.message}` });
  }
});

// POST /grok/approve - Approve a task
router.post('/approve', async (req, res) => {
  const { taskId } = req.body;
  await logInfo('Task approve request', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });

  if (!isValidTaskId(taskId)) {
    await logWarn('Invalid taskId', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
  }

  try {
    await applyApprovedChanges(taskId);
    await logInfo('Task approved', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'applied',
        message: 'Task approved and applied',
        logColor: 'green',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskRoutes', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    res.status(200).json({ message: 'Task approved' });
  } catch (error) {
    await logError(`Failed to approve task: ${error.message}`, 'taskRoutes', {
      taskId,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: `Failed to approve task: ${error.message}` });
  }
});

// POST /grok/deny - Deny a task
router.post('/deny', async (req, res) => {
  const { taskId } = req.body;
  await logInfo('Task deny request', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });

  if (!isValidTaskId(taskId)) {
    await logWarn('Invalid taskId', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
  }

  try {
    await rollbackChanges(taskId);
    await logInfo('Task denied', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'denied',
        message: 'Task denied and changes rolled back',
        logColor: 'red',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskRoutes', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    res.status(200).json({ message: 'Task denied' });
  } catch (error) {
    await logError(`Failed to deny task: ${error.message}`, 'taskRoutes', {
      taskId,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: `Failed to deny task: ${error.message}` });
  }
});

// POST /grok/test - Run Playwright tests for a task
router.post('/test', async (req, res) => {
  const { taskId, manual = false } = req.body;
  await logInfo('Task test request', 'taskRoutes', { taskId, manual, timestamp: new Date().toISOString() });

  if (!isValidTaskId(taskId)) {
    await logWarn('Invalid taskId', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
  }

  try {
    const task = await Task.findOne({ taskId });
    if (!task) {
      await logWarn('Task not found', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
      return res.status(404).json({ error: 'Task not found' });
    }

    const stagedFiles = task.stagedFiles.map(f => ({ path: f.path, content: f.content }));
    await runTests(null, stagedFiles, taskId, manual);
    await logDebug('Ran test for task', 'taskRoutes', {
      taskId,
      manual,
      stagedFiles: stagedFiles.length,
      timestamp: new Date().toISOString(),
    });
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'tested',
        message: `Test ${manual ? 'manual' : 'auto'} completed`,
        logColor: manual ? 'blue' : 'green',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskRoutes', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    res.status(200).json({ message: 'Test executed successfully' });
  } catch (error) {
    await logError(`Failed to run test: ${error.message}`, 'taskRoutes', {
      taskId,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: `Failed to run test: ${error.message}` });
  }
});

// GET /grok/test/:taskId - Provide manual test URL for headed Playwright tests
router.get('/test/:taskId', async (req, res) => {
  const { taskId } = req.params;
  await logInfo('Manual test URL request', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });

  if (!isValidTaskId(taskId)) {
    await logWarn('Invalid taskId', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
    return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
  }

  try {
    const task = await Task.findOne({ taskId });
    if (!task) {
      await logWarn('Task not found', 'taskRoutes', { taskId, timestamp: new Date().toISOString() });
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!Array.isArray(task.stagedFiles) || task.stagedFiles.length === 0 || !task.stagedFiles.every(f => f.path && f.content)) {
      await logWarn('Invalid stagedFiles for manual test', 'taskRoutes', { taskId, stagedFiles: task.stagedFiles, timestamp: new Date().toISOString() });
      return res.status(400).json({ error: 'No valid staged files for testing' });
    }

    const testUrl = `http://localhost:8888/test/${taskId}`;
    await logDebug('Generated manual test URL', 'taskRoutes', { taskId, testUrl, timestamp: new Date().toISOString() });
    try {
      getIO().emit('taskUpdate', {
        taskId,
        status: 'test_url_generated',
        message: `Manual test URL generated: ${testUrl}`,
        logColor: 'blue',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
    } catch (emitErr) {
      await logError('Failed to emit taskUpdate event', 'taskRoutes', {
        taskId,
        error: emitErr.message,
        stack: emitErr.stack,
        timestamp: new Date().toISOString(),
      });
    }
    res.status(200).json({ message: 'Manual test URL generated', testUrl });
  } catch (error) {
    await logError(`Failed to generate manual test URL: ${error.message}`, 'taskRoutes', {
      taskId,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ error: `Failed to generate manual test URL: ${error.message}` });
  }
});

module.exports = router;
