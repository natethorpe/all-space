/*
 * File Path: backend/src/utils/taskManager.js
 * Purpose: Orchestrates task processing, file generation, and proposal creation in Allur Space Console.
 * How It Works:
 *   - Manages task lifecycle: validation, prompt parsing, file generation, automated testing, proposal creation, and status updates.
 *   - Processes tasks via processTask, generating stagedFiles using fileGeneratorV18.js.
 *   - Runs headless automated tests before presenting tasks to users.
 *   - Creates BackendProposal entries for backend changes, storing them in MongoDB via db.js.
 *   - Applies approved changes (applyApprovedChanges) or rolls back (rollbackChanges) using fileUtils.js.
 *   - Deletes tasks and associated data (deleteTask) with cleanup.
 *   - Emits Socket.IO events (taskUpdate, backendProposal) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs all operations to grok.log using winston for debugging and traceability.
 * Dependencies:
 *   - mongoose: Task, BackendProposal, Memory models (version 8.7.0).
 *   - socket.js: getIO for Socket.IO (version 4.8.1).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - path, fs.promises: File operations.
 *   - fileGeneratorV18.js, fileUtils.js, promptParser.js, taskValidator.js, taskTesterV18.js: Task utilities.
 *   - lodash.debounce: Debounces event emissions (version 4.17.21).
 * Dependents:
 *   - taskRoutes.js, proposalRoutes.js, taskProcessorV18.js, GrokUI.jsx.
 * Why It’s Here:
 *   - Replaces core taskProcessorV18.js functionality for Sprint 2 modularity (04/23/2025).
 * Change Log:
 *   - 04/21/2025: Created to modularize taskProcessorV18.js (Nate).
 *   - 04/23/2025: Enhanced BackendProposal creation (Nate).
 *   - 04/25/2025: Strengthened stagedFiles initialization, increased retries to 7 (Nate).
 *   - 05/01/2025: Fixed Memory validation error, enhanced error handling (Grok).
 *   - 05/02/2025: Added automated testing, fixed backendChanges (Grok).
 *   - 05/07/2025: Fixed ReferenceError: logInfo is not defined (Grok).
 *     - Why: Error at line 360 during automated testing (User, 05/01/2025).
 *     - How: Replaced logInfo/logError with winston logger, added try-catch for runTests.
 *     - Test: Submit "Create an inventory system", verify task completes, logs in grok.log.
 * Test Instructions:
 *   - Run `npm start`, POST /api/grok/edit with "Create an inventory system".
 *   - Verify task in idurar_db.tasks, no logInfo errors in grok.log.
 *   - Check LiveFeed.jsx for single yellow log, automated test results.
 * Future Enhancements:
 *   - Add task dependency handling (Sprint 6).
 *   - Support proposal versioning (Sprint 5).
 */

const mongoose = require('mongoose');
const { getIO } = require('../socket');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;
const { generateFiles } = require('./fileGeneratorV18');
const { runTests } = require('./taskTesterV18');
const { readSystemFiles, appendLog, errorLogPath } = require('./fileUtils');
const { parsePrompt } = require('./promptParser');
const { isValidTaskId, isValidTask, isValidFiles } = require('./taskValidator');
const { v4: uuidv4 } = require('uuid');
const debounce = require('lodash').debounce;

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

/**
 * Debounces taskUpdate emissions to prevent duplicates.
 * @param {string} taskId - The task ID.
 * @param {Object} data - The event data.
 */
const debounceEmit = debounce((taskId, data) => {
  const eventId = uuidv4();
  logger.debug(`Emitting taskUpdate`, { taskId, eventId, status: data.status, timestamp: new Date().toISOString() });
  getIO().emit('taskUpdate', { ...data, eventId });
}, 500, { leading: true, trailing: false });

async function createProposals(taskId, backendChanges) {
  console.log('taskManager: createProposals called with taskId:', taskId, 'backendChanges:', backendChanges?.length || 0);
  if (!backendChanges || !Array.isArray(backendChanges)) {
    logger.warn('Invalid backendChanges: not an array', { taskId, backendChanges, timestamp: new Date().toISOString() });
    return [];
  }

  const proposals = [];
  for (const change of backendChanges) {
    let { file, change: changeText, reason, description } = change;
    if (!changeText || typeof changeText !== 'string') {
      changeText = `
        // Mock change for ${description || 'backend enhancement'}
        const express = require('express');
        const router = express.Router();
        router.get('/${file.split('.')[0]}', (req, res) => res.json({ status: '${description || 'Endpoint active'}' }));
        module.exports = router;
      `;
      logger.debug(`Generated mock changeText for backend change`, {
        taskId,
        file,
        description,
        timestamp: new Date().toISOString(),
      });
    }
    if (changeText.toLowerCase().includes('crypto wallet')) {
      file = 'backend/src/routes/crypto.js';
      changeText = `
        // Mock Allur Crypto API endpoint
        router.get('/wallet/balance', async (req, res) => {
          try {
            const balance = await getWalletBalance(req.user.id);
            res.json({ balance });
          } catch (err) {
            res.status(500).json({ error: 'Failed to fetch balance' });
          }
        });
      `;
      reason = 'Add initial crypto wallet balance endpoint for Allur Crypto integration';
      description = reason;
    }
    if (!file || !changeText || !reason) {
      logger.warn(`Skipping invalid backend change: missing required fields`, {
        taskId,
        change,
        timestamp: new Date().toISOString(),
      });
      continue;
    }
    try {
      const proposal = new mongoose.model('BackendProposal')({
        taskId,
        file,
        content: changeText,
        status: 'pending',
        createdAt: new Date(),
        description: description || reason,
      });
      await proposal.save();
      proposals.push(proposal);
      logger.debug(`Created BackendProposal`, {
        taskId,
        proposalId: proposal._id,
        file,
        description: proposal.description,
        timestamp: new Date().toISOString(),
      });
      await appendLog(errorLogPath, `# BackendProposal Created\nTask ID: ${taskId}\nProposal ID: ${proposal._id}\nFile: ${file}\nDescription: ${description || reason}`);
      const eventId = uuidv4();
      logger.debug(`Emitting backendProposal`, { taskId, eventId, timestamp: new Date().toISOString() });
      getIO().emit('backendProposal', {
        taskId,
        proposal: { id: proposal._id, file, content: changeText, status: 'pending', description: description || reason },
        eventId,
      });
    } catch (err) {
      logger.error(`Failed to create BackendProposal: ${err.message}`, {
        taskId,
        change,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      await appendLog(errorLogPath, `# BackendProposal Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}`);
    }
  }
  if (proposals.length > 0) {
    const eventId = uuidv4();
    logger.debug(`Emitting backendProposal for multiple proposals`, { taskId, eventId, timestamp: new Date().toISOString() });
    getIO().emit('backendProposal', { taskId, proposals, eventId });
  }
  return proposals;
}

async function processTask(taskId, prompt, action = 'create', target = 'crm', features = [], isMultiFile = false, backendChanges = [], uploadedFiles = []) {
  console.log('taskManager: processTask called with taskId:', taskId, 'prompt:', prompt, 'uploadedFiles:', uploadedFiles?.length || 0);
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId`, { taskId, timestamp: new Date().toISOString() });
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: 'Invalid taskId',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'processTask' },
    });
    throw new Error('Invalid taskId');
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    logger.error(`Invalid prompt`, { taskId, prompt, timestamp: new Date().toISOString() });
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: 'Invalid prompt',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid prompt', context: 'processTask' },
    });
    throw new Error('Invalid prompt');
  }

  let task;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      task = await mongoose.model('Task').findOne({ taskId });
      if (!task) {
        task = await mongoose.model('Task').findOneAndUpdate(
          { taskId },
          {
            $set: {
              taskId,
              prompt,
              status: 'pending',
              stagedFiles: [],
              generatedFiles: [],
              proposedChanges: [],
              originalContent: {},
              newContent: {},
              testInstructions: '',
              uploadedFiles: uploadedFiles || [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { new: true, upsert: true }
        );
        logger.debug(`Task created in idurar_db.tasks`, { taskId, status: task.status, timestamp: new Date().toISOString() });
      } else if (!Array.isArray(task.stagedFiles)) {
        task = await mongoose.model('Task').findOneAndUpdate(
          { taskId },
          { $set: { stagedFiles: [], uploadedFiles: uploadedFiles || [] } },
          { new: true }
        );
        logger.debug(`Initialized stagedFiles for existing task`, { taskId, timestamp: new Date().toISOString() });
      }
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Task creation attempt ${attempt}/${maxAttempts} failed: ${err.message}`, {
        taskId,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      if (attempt >= maxAttempts) {
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: `Failed to create task: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          errorDetails: { reason: err.message, context: 'processTask' },
        });
        throw new Error(`Failed to create task: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  try {
    task.status = 'processing';
    await task.save();
    debounceEmit(taskId, {
      taskId,
      status: 'processing',
      message: `Processing task: ${prompt}`,
      logColor: 'blue',
      timestamp: new Date().toISOString(),
    });

    const memory = new mongoose.model('Memory')({
      taskId,
      content: prompt || 'Default content',
      status: 'pending',
      stagedFiles: [],
      generatedFiles: [],
      uploadedFiles: uploadedFiles || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    try {
      await memory.save();
      logger.debug(`Memory entry created`, { taskId, content: prompt, uploadedFiles: uploadedFiles?.length || 0, timestamp: new Date().toISOString() });
    } catch (memoryErr) {
      logger.error(`Failed to save Memory document: ${memoryErr.message}`, {
        taskId,
        stack: memoryErr.stack,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Memory validation failed: ${memoryErr.message}`);
    }

    const systemFiles = await readSystemFiles();
    const originalContent = {};
    for (const file of Object.keys(systemFiles)) {
      originalContent[file] = systemFiles[file];
    }

    const parsedData = backendChanges.length ? { action, target, features, isMultiFile, backendChanges } : await parsePrompt(prompt, taskId);
    const { action: parsedAction, target: parsedTarget = 'crm', features: parsedFeatures, isMultiFile: parsedIsMultiFile, backendChanges: parsedBackendChanges } = parsedData;

    const stagedFiles = await generateFiles(taskId, { ...parsedData, target: parsedTarget });
    if (!stagedFiles || stagedFiles.length === 0) {
      throw new Error('No staged files generated');
    }

    if (!isValidTask(taskId, prompt, stagedFiles)) {
      throw new Error('Task validation failed');
    }
    if (!isValidFiles(stagedFiles)) {
      throw new Error('File validation failed');
    }

    let retries = 0;
    const maxRetries = 7;
    while (retries < maxRetries) {
      try {
        task.stagedFiles = stagedFiles;
        task.generatedFiles = stagedFiles.map(f => f.path);
        task.testInstructions = stagedFiles.map(f => f.testInstructions).join('\n\n');
        await task.save();

        const savedTask = await mongoose.model('Task').findOne({ taskId });
        if (!savedTask || !savedTask.stagedFiles || savedTask.stagedFiles.length !== stagedFiles.length) {
          throw new Error('Staged files verification failed');
        }
        logger.debug(`Verified stagedFiles in MongoDB`, {
          taskId,
          files: stagedFiles.map(f => f.path),
          testInstructions: savedTask.testInstructions,
          attempt: retries + 1,
          timestamp: new Date().toISOString(),
        });
        break;
      } catch (err) {
        retries++;
        logger.warn(`Staged files save attempt ${retries}/${maxRetries} failed: ${err.message}`, {
          taskId,
          timestamp: new Date().toISOString(),
        });
        if (retries >= maxRetries) {
          throw new Error(`Failed to persist stagedFiles after ${maxRetries} attempts: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 500 * retries));
      }
    }

    // Run automated headless test
    try {
      const testResult = await runTests(null, stagedFiles, taskId, false); // Headless auto test
      logger.info('Automated test passed', {
        taskId,
        stagedFilesCount: stagedFiles.length,
        testResult,
        timestamp: new Date().toISOString(),
      });
      debounceEmit(taskId, {
        taskId,
        status: 'tested',
        stagedFiles: task.stagedFiles,
        testInstructions: task.testInstructions,
        logColor: 'green',
        timestamp: new Date().toISOString(),
      });
    } catch (testErr) {
      logger.error(`Automated test failed: ${testErr.message}`, {
        taskId,
        stack: testErr.stack,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Automated test failed: ${testErr.message}`);
    }

    task.originalContent = originalContent;
    task.newContent = {};
    for (const file of stagedFiles) {
      task.newContent[file.path] = file.content;
    }

    const proposals = await createProposals(taskId, parsedBackendChanges);
    task.proposedChanges = proposals.map(p => p._id.toString());
    task.status = 'pending_approval';
    await task.save();

    debounceEmit(taskId, {
      taskId,
      status: 'pending_approval',
      stagedFiles: task.stagedFiles,
      proposedChanges: task.proposedChanges,
      testInstructions: task.testInstructions,
      logColor: parsedIsMultiFile ? 'yellow' : 'blue',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Task processed`, { taskId, stagedFiles: stagedFiles.length, proposals: proposals.length, timestamp: new Date().toISOString() });
    await appendLog(errorLogPath, `# Task Processed\nTask ID: ${taskId}\nStaged Files: ${stagedFiles.map(f => f.path).join(', ')}\nProposals: ${proposals.length}\nTest Instructions: ${task.testInstructions}`);
    return task;
  } catch (err) {
    task.status = 'failed';
    task.error = err.message;
    await task.save();
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: `Task processing failed: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: err.message, context: 'processTask' },
    });
    logger.error(`Task processing failed: ${err.message}`, { taskId, stack: err.stack, timestamp: new Date().toISOString() });
    await appendLog(errorLogPath, `# Task Processing Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}`);
    throw err;
  }
}

async function getTasks(filter = {}) {
  try {
    const tasks = await mongoose.model('Task').find(filter);
    logger.info(`Fetched tasks`, { filter, count: tasks.length, timestamp: new Date().toISOString() });
    debounceEmit(filter.taskId || 'all', {
      taskId: filter.taskId || 'all',
      status: 'fetched',
      message: `Fetched ${tasks.length} tasks`,
      logColor: 'green',
      timestamp: new Date().toISOString(),
    });
    return tasks;
  } catch (err) {
    logger.error(`Failed to fetch tasks: ${err.message}`, { filter, stack: err.stack, timestamp: new Date().toISOString() });
    debounceEmit(filter.taskId || 'all', {
      taskId: filter.taskId || 'all',
      status: 'failed',
      error: `Failed to fetch tasks: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: err.message, context: 'fetchTasks' },
    });
    throw new Error(`Failed to fetch tasks: ${err.message}`);
  }
}

async function clearTasks() {
  try {
    await mongoose.model('Task').deleteMany({});
    await mongoose.model('BackendProposal').deleteMany({});
    logger.info(`Cleared all tasks and proposals`, { timestamp: new Date().toISOString() });
    debounceEmit(null, {
      taskId: null,
      status: 'cleared',
      message: `All tasks cleared`,
      logColor: 'green',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error(`Failed to clear tasks: ${err.message}`, { stack: err.stack, timestamp: new Date().toISOString() });
    throw new Error(`Failed to clear tasks: ${err.message}`);
  }
}

async function applyApprovedChanges(taskId) {
  console.log('taskManager: applyApprovedChanges called with taskId:', taskId);
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId`, { taskId, timestamp: new Date().toISOString() });
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: 'Invalid taskId',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'applyApprovedChanges' },
    });
    throw new Error('Invalid taskId');
  }

  const task = await mongoose.model('Task').findOne({ taskId });
  if (!task) {
    logger.warn(`Task not found`, { taskId, timestamp: new Date().toISOString() });
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: 'Task not found',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Task not found', context: 'applyApprovedChanges' },
    });
    throw new Error('Task not found');
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      for (const fileObj of task.stagedFiles || []) {
        const targetPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, fileObj.content, 'utf8');
        logger.debug(`Applied staged file to filesystem`, {
          taskId,
          file: fileObj.path,
          contentLength: fileObj.content.length,
          timestamp: new Date().toISOString(),
        });
      }

      const proposals = await mongoose.model('BackendProposal').find({ taskId, status: 'approved' });
      for (const proposal of proposals) {
        const targetFile = path.join(__dirname, '../../../', proposal.file);
        await fs.appendFile(targetFile, `\n// BackendProposal ${proposal._id}: ${proposal.content}\n`, 'utf8');
        logger.debug(`Applied BackendProposal change`, {
          taskId,
          proposalId: proposal._id,
          file: proposal.file,
          timestamp: new Date().toISOString(),
        });
      }

      task.status = 'applied';
      task.generatedFiles = task.stagedFiles.map(f => f.path);
      task.stagedFiles = [];
      task.updatedAt = new Date();
      await task.save();

      debounceEmit(taskId, {
        taskId,
        status: 'applied',
        message: `Task approved and applied`,
        logColor: 'green',
        timestamp: new Date().toISOString(),
      });

      logger.info(`Applied approved changes`, { taskId, timestamp: new Date().toISOString() });
      await appendLog(errorLogPath, `# Changes Applied\nTask ID: ${taskId}`);
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Apply changes attempt ${attempt}/${maxAttempts} failed: ${err.message}`, {
        taskId,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      if (attempt >= maxAttempts) {
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: `Failed to apply changes: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          errorDetails: { reason: err.message, context: 'applyApprovedChanges' },
        });
        throw new Error(`Failed to apply changes: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function rollbackChanges(taskId) {
  console.log('taskManager: rollbackChanges called with taskId:', taskId);
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId`, { taskId, timestamp: new Date().toISOString() });
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: 'Invalid taskId',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'rollbackChanges' },
    });
    throw new Error('Invalid taskId');
  }

  const task = await mongoose.model('Task').findOne({ taskId });
  if (!task) {
    logger.warn(`Task not found`, { taskId, timestamp: new Date().toISOString() });
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: 'Task not found',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Task not found', context: 'rollbackChanges' },
    });
    throw new Error('Task not found');
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      for (const fileObj of task.stagedFiles || []) {
        const stagedPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.unlink(stagedPath).catch(() => {});
        logger.debug(`Removed staged file`, { taskId, file: fileObj.path, timestamp: new Date().toISOString() });
      }

      task.status = 'denied';
      task.stagedFiles = [];
      task.proposedChanges = [];
      task.updatedAt = new Date();
      await task.save();

      await mongoose.model('BackendProposal').deleteMany({ taskId });

      debounceEmit(taskId, {
        taskId,
        status: 'denied',
        message: `Task denied and changes rolled back`,
        logColor: 'red',
        timestamp: new Date().toISOString(),
      });

      logger.info(`Rolled back changes`, { taskId, timestamp: new Date().toISOString() });
      await appendLog(errorLogPath, `# Changes Rolled Back\nTask ID: ${taskId}`);
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Rollback attempt ${attempt}/${maxAttempts} failed: ${err.message}`, {
        taskId,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      if (attempt >= maxAttempts) {
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: `Failed to rollback changes: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          errorDetails: { reason: err.message, context: 'rollbackChanges' },
        });
        throw new Error(`Failed to rollback changes: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function deleteTask(taskId) {
  console.log('taskManager: deleteTask called with taskId:', taskId);
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId`, { taskId, timestamp: new Date().toISOString() });
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: 'Invalid taskId',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'deleteTask' },
    });
    throw new Error('Invalid taskId');
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const task = await mongoose.model('Task').findOne({ taskId });
      if (!task) {
        logger.warn(`Task not found`, { taskId, timestamp: new Date().toISOString() });
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: 'Task not found',
          logColor: 'red',
          timestamp: new Date().toISOString(),
          errorDetails: { reason: 'Task not found', context: 'deleteTask' },
        });
        throw new Error('Task not found');
      }

      for (const fileObj of task.stagedFiles || []) {
        const stagedPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.unlink(stagedPath).catch(() => {});
        logger.debug(`Removed staged file`, { taskId, file: fileObj.path, timestamp: new Date().toISOString() });
      }

      await mongoose.model('Task').deleteOne({ taskId });
      await mongoose.model('Memory').deleteMany({ taskId });
      await mongoose.model('BackendProposal').deleteMany({ taskId });

      debounceEmit(taskId, {
        taskId,
        status: 'deleted',
        message: `Task deleted`,
        logColor: 'green',
        timestamp: new Date().toISOString(),
      });

      logger.info(`Deleted task`, { taskId, timestamp: new Date().toISOString() });
      await appendLog(errorLogPath, `# Task Deleted\nTask ID: ${taskId}`);
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Delete task attempt ${attempt}/${maxAttempts} failed: ${err.message}`, {
        taskId,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      if (attempt >= maxAttempts) {
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: `Failed to delete task: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          errorDetails: { reason: err.message, context: 'deleteTask' },
        });
        throw new Error(`Failed to delete task: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

module.exports = { processTask, applyApprovedChanges, rollbackChanges, deleteTask, getTasks, clearTasks };
