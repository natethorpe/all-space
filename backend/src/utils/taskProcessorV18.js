/*
 * File Path: backend/src/utils/taskManager.js
 * Purpose: Orchestrates task processing, file generation, and proposal creation in Allur Space Console.
 * How It Works:
 *   - Manages task lifecycle: validation, prompt parsing, file generation, testing, proposal creation, and status updates.
 *   - Processes tasks via processTask, generating stagedFiles using fileGeneratorV18.js.
 *   - Creates BackendProposal entries for backend changes, storing them in MongoDB via db.js.
 *   - Applies approved changes (applyApprovedChanges) or rolls back (rollbackChanges) using fileUtils.js.
 *   - Deletes tasks and associated data (deleteTask) with cleanup.
 *   - Emits Socket.IO events (taskUpdate, backendProposal) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs all operations to grok.log using winston for debugging and traceability.
 * Mechanics:
 *   - processTask: Validates taskId, parses prompt, generates files, creates proposals, updates task status.
 *   - applyApprovedChanges: Applies stagedFiles and proposal changes to target files, updates task status to applied.
 *   - rollbackChanges: Removes stagedFiles, updates task status to denied.
 *   - deleteTask: Deletes task, stagedFiles, and proposals from MongoDB and filesystem.
 *   - Uses retry logic (up to 7 attempts for stagedFiles, 3 for others) for file operations and MongoDB queries.
 *   - Validates inputs (taskId, prompt) using UUID regex and string checks.
 * Dependencies:
 *   - mongoose: Task, BackendProposal, Memory models (version 8.7.0).
 *   - socket.js: getIO for Socket.IO (version 4.8.1).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - path, fs.promises: File operations.
 *   - fileGeneratorV18.js, fileUtils.js, promptParser.js: Task utilities.
 * Dependents:
 *   - taskRoutes.js, proposalRoutes.js, taskProcessorV18.js, GrokUI.jsx.
 * Why It’s Here:
 *   - Replaces core taskProcessorV18.js functionality for Sprint 2 modularity (04/23/2025).
 * Change Log:
 *   - 04/21/2025: Created to modularize taskProcessorV18.js.
 *   - 04/23/2025: Enhanced BackendProposal creation.
 *   - 04/23/2025: Fixed socket.js import path.
 *   - 04/23/2025: Enhanced stagedFiles persistence.
 *   - 04/23/2025: Added atomic stagedFiles initialization and validation.
 *   - 04/25/2025: Strengthened stagedFiles initialization with $set.
 *     - Why: Fix intermittent stagedFiles undefined errors for Playwright button and task processing (User, 04/25/2025).
 *     - How: Used $set in Task.findOneAndUpdate for stagedFiles, added debug logs for save attempts.
 *   - 04/25/2025: Increased retry attempts to 7 for stagedFiles persistence.
 *     - Why: Ensure robust MongoDB saves for Sprint 2 completion (User, 04/25/2025).
 *     - How: Updated maxRetries to 7, added logging for each attempt.
 *     - Test: Submit "Build CRM system" 5 times, verify stagedFiles persist, no undefined errors, check grok.log for save logs.
 *   - 04/25/2025: Added mock Allur Crypto API proposal logic.
 *     - Why: Start ecosystem expansion for Sprint 3 (User, 04/25/2025).
 *     - How: Added logic in createProposals to propose /wallet/balance endpoint, logged to grok.log.
 *     - Test: Submit "Add crypto wallet", verify BackendProposal with /wallet/balance, yellow log in LiveFeed.jsx.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, grok.log logs operations.
 *   - POST /grok/edit with "Build CRM system" (5 times): Confirm stagedFiles persist, no “No files to test” errors.
 *   - POST /grok/edit with "Add crypto wallet": Verify BackendProposal with /wallet/balance endpoint, yellow log in LiveFeed.jsx.
 *   - Check idurar_db.tasks: Verify stagedFiles contain path, content fields.
 *   - Check LiveFeed.jsx: Confirm blue/yellow logs, no red persistence errors.
 * Future Enhancements:
 *   - Add task dependency handling (Sprint 6).
 *   - Support proposal versioning (Sprint 5).
 *   - Extract retry logic to retryUtils.js if file grows (Sprint 4).
 * Self-Notes:
 *   - Nate: Added atomic stagedFiles handling for Sprint 2 reliability (04/23/2025).
 *   - Nate: Strengthened $set usage, increased retries, added crypto proposal for Sprint 3 (04/25/2025).
 */
const mongoose = require('mongoose');
const { getIO } = require('../socket');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;
const { generateFiles } = require('./fileGeneratorV18');
const { readSystemFiles, appendLog, errorLogPath } = require('./fileUtils');
const { parsePrompt } = require('./promptParser');
const { isValidTaskId } = require('./taskValidator');

const Task = mongoose.model('Task');
const Memory = mongoose.model('Memory');
const BackendProposal = mongoose.model('BackendProposal');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

async function createProposals(taskId, backendChanges) {
  console.log('taskManager: createProposals called with taskId:', taskId, 'backendChanges:', backendChanges.length);
  if (!backendChanges || !Array.isArray(backendChanges)) return [];
  const proposals = [];
  for (const change of backendChanges) {
    let { file, change: changeText, reason } = change;
    // Mock Allur Crypto API proposal
    if (changeText.includes('crypto wallet')) {
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
    }
    if (!file || !changeText || !reason) {
      logger.warn(`Skipping invalid backend change`, { taskId, change });
      continue;
    }
    try {
      const proposal = new BackendProposal({
        taskId,
        file,
        content: changeText,
        status: 'pending',
        createdAt: new Date(),
      });
      await proposal.save();
      proposals.push(proposal);
      logger.debug(`Created BackendProposal`, { taskId, proposalId: proposal._id, file });
      await appendLog(errorLogPath, `# BackendProposal Created\nTask ID: ${taskId}\nProposal ID: ${proposal._id}\nFile: ${file}`);
      getIO().emit('backendProposal', { taskId, proposal: { id: proposal._id, file, content: changeText, status: 'pending' } });
    } catch (err) {
      logger.error(`Failed to create BackendProposal: ${err.message}`, { taskId, change, stack: err.stack });
      await appendLog(errorLogPath, `# BackendProposal Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}`);
    }
  }
  if (proposals.length > 0) {
    getIO().emit('backendProposal', { taskId, proposals });
  }
  return proposals;
}

async function processTask(taskId, prompt, action, target, features, isMultiFile = false, backendChanges = []) {
  console.log('taskManager: processTask called with taskId:', taskId, 'prompt:', prompt);
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId`, { taskId });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: 'Invalid taskId',
      logColor: 'red',
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid taskId');
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    logger.error(`Invalid prompt`, { taskId, prompt });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: 'Invalid prompt',
      logColor: 'red',
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid prompt');
  }

  let task;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      task = await Task.findOne({ taskId });
      if (!task) {
        task = await Task.findOneAndUpdate(
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
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { new: true, upsert: true }
        );
        logger.debug(`Task created in idurar_db.tasks`, { taskId, status: task.status });
      } else if (!Array.isArray(task.stagedFiles)) {
        await Task.findOneAndUpdate(
          { taskId },
          { $set: { stagedFiles: [] } },
          { new: true }
        );
        logger.debug(`Initialized stagedFiles for existing task`, { taskId });
      }
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Task creation attempt ${attempt}/${maxAttempts} failed: ${err.message}`, { taskId, stack: err.stack });
      if (attempt >= maxAttempts) {
        getIO().emit('taskUpdate', {
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

  task.status = 'processing';
  await task.save();
  getIO().emit('taskUpdate', {
    taskId,
    status: 'processing',
    message: `Processing task: ${prompt}`,
    logColor: 'blue',
    timestamp: new Date().toISOString(),
  });

  const memory = new Memory({
    taskId,
    prompt,
    status: 'pending',
    stagedFiles: [],
    generatedFiles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await memory.save();
  logger.debug(`Memory entry created`, { taskId });

  const systemFiles = await readSystemFiles();
  const originalContent = {};
  for (const file of Object.keys(systemFiles)) {
    originalContent[file] = systemFiles[file];
  }

  const stagedFiles = [];
  const parsedData = backendChanges.length ? { action, target, features, isMultiFile, backendChanges } : parsePrompt(prompt, taskId);
  const { action: parsedAction, target: parsedTarget, features: parsedFeatures, isMultiFile: parsedIsMultiFile, backendChanges: parsedBackendChanges } = parsedData;

  if (parsedIsMultiFile) {
    const components = parsedFeatures.includes('crm') ? ['Login', 'Dashboard', 'EmployeeLog', 'SponsorProfile'] : parsedFeatures;
    for (const component of components) {
      const file = await generateFiles(task, parsedAction, component, parsedFeatures);
      if (file) {
        let retries = 0;
        const maxRetries = 7; // Increased for robustness
        while (retries < maxRetries) {
          try {
            const fileContent = await fs.readFile(file, 'utf8');
            await Task.findOneAndUpdate(
              { taskId },
              { $push: { stagedFiles: { path: file, content: fileContent } } },
              { new: true }
            );
            logger.debug(`Persisted stagedFiles: ${file}`, { taskId, attempt: retries + 1 });
            stagedFiles.push(file);
            break;
          } catch (err) {
            retries++;
            logger.warn(`Staged files save attempt ${retries}/${maxRetries} failed: ${err.message}`, { taskId });
            if (retries >= maxRetries) {
              logger.error(`Failed to persist stagedFiles after ${maxRetries} attempts`, { taskId, error: err.message });
              throw err;
            }
            await new Promise(resolve => setTimeout(resolve, 500 * retries));
          }
        }
      }
    }
  } else {
    const file = await generateFiles(task, parsedAction, parsedTarget, parsedFeatures);
    if (file) {
      let retries = 0;
      const maxRetries = 7; // Increased for robustness
      while (retries < maxRetries) {
        try {
          const fileContent = await fs.readFile(file, 'utf8');
          await Task.findOneAndUpdate(
            { taskId },
            { $push: { stagedFiles: { path: file, content: fileContent } } },
            { new: true }
          );
          logger.debug(`Persisted stagedFiles: ${file}`, { taskId, attempt: retries + 1 });
          stagedFiles.push(file);
          break;
        } catch (err) {
          retries++;
          logger.warn(`Staged files save attempt ${retries}/${maxRetries} failed: ${err.message}`, { taskId });
          if (retries >= maxRetries) {
            logger.error(`Failed to persist stagedFiles after ${maxRetries} attempts`, { taskId, error: err.message });
            throw err;
          }
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
        }
      }
    }
  }

  task.originalContent = originalContent;
  task.newContent = {};
  for (const file of stagedFiles) {
    task.newContent[file] = systemFiles[file] || await fs.readFile(file, 'utf8');
  }

  const proposals = await createProposals(taskId, parsedBackendChanges);
  task.proposedChanges = proposals.map(p => p._id.toString());
  task.status = 'pending_approval';
  await task.save();

  getIO().emit('taskUpdate', {
    taskId,
    status: 'pending_approval',
    stagedFiles: task.stagedFiles,
    proposedChanges: task.proposedChanges,
    logColor: parsedIsMultiFile ? 'yellow' : 'blue',
    timestamp: new Date().toISOString(),
  });

  logger.info(`Task processed`, { taskId, stagedFiles: stagedFiles.length, proposals: proposals.length });
  await appendLog(errorLogPath, `# Task Processed\nTask ID: ${taskId}\nStaged Files: ${stagedFiles.join(', ')}\nProposals: ${proposals.length}`);
}

async function applyApprovedChanges(taskId) {
  console.log('taskManager: applyApprovedChanges called with taskId:', taskId);
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId`, { taskId });
    throw new Error('Invalid taskId');
  }

  const task = await Task.findOne({ taskId });
  if (!task) {
    logger.warn(`Task not found`, { taskId });
    throw new Error('Task not found');
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      for (const fileObj of task.stagedFiles || []) {
        const targetPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.writeFile(targetPath, fileObj.content, 'utf8');
        logger.debug(`Applied staged file`, { taskId, file: fileObj.path });
      }

      const proposals = await BackendProposal.find({ taskId, status: 'approved' });
      for (const proposal of proposals) {
        const targetFile = path.join(__dirname, '../../../', proposal.file);
        await fs.appendFile(targetFile, `\n// BackendProposal ${proposal._id}: ${proposal.content}\n`, 'utf8');
        logger.debug(`Applied BackendProposal change`, { taskId, proposalId: proposal._id, file: proposal.file });
      }

      task.status = 'applied';
      task.generatedFiles = task.stagedFiles.map(f => f.path);
      task.stagedFiles = [];
      task.updatedAt = new Date();
      await task.save();

      getIO().emit('taskUpdate', {
        taskId,
        status: 'applied',
        message: `Task approved and applied`,
        logColor: 'green',
        timestamp: new Date().toISOString(),
      });

      logger.info(`Applied approved changes`, { taskId });
      await appendLog(errorLogPath, `# Changes Applied\nTask ID: ${taskId}`);
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Apply changes attempt ${attempt}/${maxAttempts} failed: ${err.message}`, { taskId, stack: err.stack });
      if (attempt >= maxAttempts) {
        getIO().emit('taskUpdate', {
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
    logger.error(`Invalid taskId`, { taskId });
    throw new Error('Invalid taskId');
  }

  const task = await Task.findOne({ taskId });
  if (!task) {
    logger.warn(`Task not found`, { taskId });
    throw new Error('Task not found');
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      for (const fileObj of task.stagedFiles || []) {
        const stagedPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.unlink(stagedPath).catch(() => {});
        logger.debug(`Removed staged file`, { taskId, file: fileObj.path });
      }

      task.status = 'denied';
      task.stagedFiles = [];
      task.proposedChanges = [];
      task.updatedAt = new Date();
      await task.save();

      await BackendProposal.deleteMany({ taskId });

      getIO().emit('taskUpdate', {
        taskId,
        status: 'denied',
        message: `Task denied and changes rolled back`,
        logColor: 'red',
        timestamp: new Date().toISOString(),
      });

      logger.info(`Rolled back changes`, { taskId });
      await appendLog(errorLogPath, `# Changes Rolled Back\nTask ID: ${taskId}`);
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Rollback attempt ${attempt}/${maxAttempts} failed: ${err.message}`, { taskId, stack: err.stack });
      if (attempt >= maxAttempts) {
        getIO().emit('taskUpdate', {
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
    logger.error(`Invalid taskId`, { taskId });
    throw new Error('Invalid taskId');
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const task = await Task.findOne({ taskId });
      if (!task) {
        logger.warn(`Task not found`, { taskId });
        throw new Error('Task not found');
      }

      for (const fileObj of task.stagedFiles || []) {
        const stagedPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.unlink(stagedPath).catch(() => {});
        logger.debug(`Removed staged file`, { taskId, file: fileObj.path });
      }

      await Task.deleteOne({ taskId });
      await Memory.deleteMany({ taskId });
      await BackendProposal.deleteMany({ taskId });

      getIO().emit('taskUpdate', {
        taskId,
        status: 'deleted',
        message: `Task deleted`,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Deleted task`, { taskId });
      await appendLog(errorLogPath, `# Task Deleted\nTask ID: ${taskId}`);
      break;
    } catch (err) {
      attempt++;
      logger.warn(`Delete task attempt ${attempt}/${maxAttempts} failed: ${err.message}`, { taskId, stack: err.stack });
      if (attempt >= maxAttempts) {
        getIO().emit('taskUpdate', {
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

module.exports = { processTask, applyApprovedChanges, rollbackChanges, deleteTask };
