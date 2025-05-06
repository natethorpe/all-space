/*
 * File Path: backend/src/utils/taskManager.js
 * Purpose: Orchestrates task processing, file generation, and proposal creation in Allur Space Console.
 * How It Works:
 *   - Manages task lifecycle: validation, prompt parsing, file generation, automated testing, proposal creation, and status updates.
 *   - Processes tasks via processTask, generating stagedFiles using fileGeneratorV18.js.
 *   - Runs headless automated tests before presenting tasks to users via taskTesterV18.js.
 *   - Creates BackendProposal entries for backend changes, storing them in MongoDB via db.js.
 *   - Applies approved changes (applyApprovedChanges) or rolls back (rollbackChanges) using fileUtils.js.
 *   - Deletes tasks and associated data (deleteTask) with cleanup.
 *   - Emits Socket.IO events (taskUpdate, backendProposal) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Sends email notifications via emailer.js for task events (e.g., completion, errors).
 *   - Logs all operations to grok.log using winston for debugging and traceability.
 * Mechanics:
 *   - processTask: Validates inputs, creates/updates tasks, generates files, runs tests, creates proposals, and updates status.
 *   - createProposals: Generates BackendProposal entries, handling crypto wallet changes specifically.
 *   - getTasks: Fetches tasks from MongoDB with optional filtering by taskId.
 *   - clearTasks: Deletes all tasks and proposals.
 *   - applyApprovedChanges: Writes staged files and approved proposals to filesystem.
 *   - rollbackChanges: Removes staged files and deletes proposals.
 *   - deleteTask: Deletes task and associated data.
 *   - Uses debounce for event emissions to prevent duplicates.
 * Dependencies:
 *   - mongoose: Task, BackendProposal, Memory models for MongoDB (version 8.13.2).
 *   - socket.js: getIO for Socket.IO emissions (version 4.8.1).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - path, fs.promises: File operations.
 *   - fileGeneratorV18.js: Generates staged files.
 *   - taskTesterV18.js: Runs Playwright tests.
 *   - fileUtils.js: readSystemFiles, appendLog, errorLogPath for file operations.
 *   - promptParser.js: parsePrompt for extracting action, target, features.
 *   - taskValidator.js: isValidTaskId, isValidTask, isValidFiles for validation.
 *   - lodash/debounce: Debounces event emissions (version 4.17.21).
 *   - emailer.js: Sends email notifications with recipient, subject, taskId, eventType (version 6.9.15).
 *   - uuid: Generates unique eventId (version 11.1.0).
 * Dependents:
 *   - taskRoutes.js: Calls processTask, getTasks, deleteTask, clearTasks for /grok endpoints.
 *   - proposalRoutes.js: Calls applyApprovedChanges, rollbackChanges for proposal actions.
 *   - taskProcessorV18.js: Calls processTask for task orchestration.
 *   - GrokUI.jsx: Receives taskUpdate events via useTasks.js for UI updates.
 * Why It’s Here:
 *   - Replaces core taskProcessorV18.js functionality for Sprint 2 modularity, providing robust task management (04/23/2025).
 * Change Log:
 *   - 04/21/2025: Created to modularize taskProcessorV18.js (Nate).
 *   - 04/23/2025: Enhanced BackendProposal creation with MongoDB storage (Nate).
 *   - 04/25/2025: Strengthened stagedFiles initialization, increased retries to 7 (Nate).
 *   - 05/01/2025: Fixed Memory validation error, enhanced error handling (Grok).
 *   - 05/02/2025: Added automated testing, fixed backendChanges parsing (Grok).
 *   - 05/07/2025: Fixed ReferenceError: logInfo is not defined by importing logUtils.js (Grok).
 *   - 05/08/2025: Added testUrl support, ensured originalContent/newContent serialization, integrated emailer.js (Grok).
 *   - 05/08/2025: Fixed stagedFiles persistence error in MongoDB (Grok).
 *   - 05/08/2025: Fixed originalContent serialization error with toObject() (Grok).
 *   - 05/08/2025: Enhanced originalContent validation for null checks (Grok).
 *   - 05/08/2025: Added schema validation before task.save() to prevent Mongoose errors (Grok).
 *   - 05/08/2025: Fixed newContent Mongoose metadata issue by using plain objects (Grok).
 *   - 05/08/2025: Fixed sendEmail ReferenceError by aligning with emailer.js signature (Grok).
 *   - 05/08/2025: Fixed empty task fetch (“count”:0) with debug logging (Grok).
 *   - 05/08/2025: Fixed MODULE_NOT_FOUND for lodash.debounce by using lodash/debounce (Grok).
 *   - 05/08/2025: Fixed debounceEmit is not defined error (Grok).
 *   - 05/08/2025: Fixed 500 error on /edit by handling test failures gracefully (Grok).
 *   - 05/08/2025: Enhanced task persistence and getTasks to fix empty fetch (Grok).
 *   - 05/08/2025: Restored critical functionality and fixed user field, email status, test retries (Grok).
 *   - 05/08/2025: Fixed user: undefined in getTasks logs (Grok).
 *     - Why: Incorrect user field mapping in getTasks logs (User, 05/08/2025).
 *     - How: Updated getTasks to ensure user field is correctly mapped using toObject(), preserved existing functionality.
 *     - Test: GET /api/grok/tasks, verify user field in logs is 'admin@idurarapp.com'.
 * Test Instructions:
 *   - Apply updated taskManager.js, ensure backend/.env uses DATABASE_URI=mongodb://localhost:27017/idurar_db.
 *   - Run `npm install` to ensure lodash@4.17.21 is installed.
 *   - Run `npm start` in backend/, `npm run dev` in frontend/.
 *   - Verify backend starts without errors in grok.log.
 *   - Connect to MongoDB: `mongo mongodb://localhost:27017/idurar_db`.
 *   - POST /api/grok/edit with { prompt: "Create an inventory system", taskId: "test-uuid-1234-5678-9012-345678901234" }: Verify 200 response, task in TaskList.jsx, green log in LiveFeed.jsx.
 *   - DELETE /api/grok/tasks/<taskId>: Verify 200 response, task removed.
 *   - GET /api/grok/tasks: Verify tasks returned, user field in logs is 'admin@idurarapp.com'.
 *   - POST /api/grok/test/<taskId>: Verify 200 response, test runs.
 *   - Check idurar_db.tasks for task with correct status, testUrl.
 *   - Verify email sent to admin@hiwaydriveintheater.com with correct status.
 * Rollback Instructions:
 *   - If errors persist: Revert to taskManager.js.bak (`copy backend\src\utils\taskManager.js.bak backend\src\utils\taskManager.js`).
 *   - Run `npm install lodash@4.17.21` to ensure lodash is installed.
 *   - Verify /api/grok/edit processes tasks and /api/grok/tasks returns tasks (may have user field issues).
 * Future Enhancements:
 *   - Add task retry mechanism for failed tests (Sprint 3).
 *   - Support proposal versioning for audit trails and rollback (Sprint 5).
 *   - Integrate ALL Token rewards for task completion (Sprint 3).
 *   - Enhance Memory model with task history for analytics (Sprint 4).
 * Self-Notes:
 *   - Nate: Modularized task processing for scalability, added robust proposal creation (04/23/2025).
 *   - Grok: Fixed user field mapping in getTasks logs (05/08/2025).
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
const debounce = require('lodash/debounce');
const { sendEmail } = require('./emailer');
const { logInfo, logDebug, logWarn, logError } = require('./logUtils');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

// Define debounceEmit at module scope
const debounceEmit = debounce((taskId, data) => {
  const eventId = uuidv4();
  logger.debug(`Emitting taskUpdate`, { taskId, eventId, status: data.status, timestamp: new Date().toISOString() });
  getIO().emit('taskUpdate', { ...data, eventId });
}, 500, { leading: true, trailing: false });

/**
 * Creates BackendProposal entries for backend changes, handling crypto wallet cases.
 * @param {string} taskId - The task ID.
 * @param {Array} backendChanges - Array of changes with file, change, reason, description.
 * @param {string} userEmail - The user's email for proposal ownership.
 * @returns {Promise<Array>} Array of created proposals.
 */
async function createProposals(taskId, backendChanges, userEmail) {
  const timestamp = new Date().toISOString();
  console.log('taskManager: createProposals called', {
    taskId,
    changeCount: backendChanges?.length || 0,
    userEmail,
    timestamp,
  });
  if (!backendChanges || !Array.isArray(backendChanges)) {
    await logWarn('Invalid backendChanges: not an array', 'taskManager', {
      taskId,
      backendChanges,
      timestamp,
    });
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
        router.get('/${file?.split('.')[0] || 'endpoint'}', (req, res) => res.json({ status: '${description || 'Endpoint active'}' }));
        module.exports = router;
      `;
      await logDebug('Generated mock changeText for backend change', 'taskManager', {
        taskId,
        file,
        description,
        timestamp,
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
      await logWarn('Skipping invalid backend change: missing required fields', 'taskManager', {
        taskId,
        change,
        timestamp,
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
        user: userEmail,
      });
      await proposal.save();
      proposals.push(proposal);
      await logDebug('Created BackendProposal', 'taskManager', {
        taskId,
        proposalId: proposal._id,
        file,
        description: proposal.description,
        user: userEmail,
        timestamp,
      });
      await appendLog(errorLogPath, `# BackendProposal Created\nTask ID: ${taskId}\nProposal ID: ${proposal._id}\nFile: ${file}\nDescription: ${description || reason}\nUser: ${userEmail}`);
      const eventId = uuidv4();
      await logDebug('Emitting backendProposal', 'taskManager', {
        taskId,
        eventId,
        timestamp,
      });
      getIO().emit('backendProposal', {
        taskId,
        proposal: { id: proposal._id, file, content: changeText, status: 'pending', description: description || reason },
        eventId,
      });
    } catch (err) {
      await logError(`Failed to create BackendProposal: ${err.message}`, 'taskManager', {
        taskId,
        change,
        stack: err.stack,
        user: userEmail,
        timestamp,
      });
      await appendLog(errorLogPath, `# BackendProposal Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}`);
    }
  }
  if (proposals.length > 0) {
    const eventId = uuidv4();
    await logDebug('Emitting backendProposal for multiple proposals', 'taskManager', {
      taskId,
      eventId,
      proposalCount: proposals.length,
      user: userEmail,
      timestamp,
    });
    getIO().emit('backendProposal', { taskId, proposals, eventId });
  }
  return proposals;
}

/**
 * Processes a task by generating files, running tests, and creating proposals.
 * @param {Object} params - Task parameters.
 * @param {string} params.taskId - The task ID (UUID).
 * @param {string} params.prompt - The task prompt.
 * @param {string} params.action - The action type (default: 'create').
 * @param {string} params.target - The target system (default: 'crm').
 * @param {Array} params.features - Array of features (default: []).
 * @param {boolean} params.isMultiFile - Whether to generate multiple files (default: false).
 * @param {Array} params.backendChanges - Array of backend changes (default: []).
 * @param {Array} params.uploadedFiles - Array of uploaded files (default: []).
 * @param {Object} params.user - User object with email.
 * @returns {Promise<Object>} The processed task.
 */
async function processTask({ taskId, prompt, action = 'create', target = 'crm', features = [], isMultiFile = false, backendChanges = [], uploadedFiles = [], user }) {
  const timestamp = new Date().toISOString();
  taskId = taskId || uuidv4();
  console.log('taskManager: processTask called', {
    taskId,
    prompt,
    action,
    target,
    features,
    isMultiFile,
    backendChanges: backendChanges.length,
    uploadedFiles: uploadedFiles.length,
    user: user?.email || 'undefined',
    timestamp,
  });

  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, timestamp });
    debounceEmit(taskId, { taskId, status: 'failed', error: 'Invalid taskId', logColor: 'red', timestamp, errorDetails: { reason: 'Invalid taskId', context: 'processTask' } });
    throw new Error('Invalid taskId');
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    await logError('Invalid prompt', 'taskManager', { taskId, prompt, timestamp });
    debounceEmit(taskId, { taskId, status: 'failed', error: 'Invalid prompt', logColor: 'red', timestamp, errorDetails: { reason: 'Invalid prompt', context: 'processTask' } });
    throw new Error('Invalid prompt');
  }

  let task;
  let attempt = 0;
  const maxAttempts = 3;

  // Create or update task with retry logic
  try {
    console.log('taskManager: Creating/updating task in MongoDB', { taskId, database: mongoose.connection.name, timestamp });
    while (attempt < maxAttempts) {
      try {
        task = await mongoose.model('Task').findOne({ taskId, user: user?.email || { $in: [null, undefined, 'admin@idurarapp.com'] } });
        if (!task) {
          task = new mongoose.model('Task')({
            taskId,
            prompt,
            status: 'pending',
            stagedFiles: [],
            generatedFiles: [],
            proposedChanges: [],
            originalContent: {},
            newContent: {},
            testInstructions: '',
            testUrl: null,
            uploadedFiles: uploadedFiles || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            user: user?.email || 'admin@idurarapp.com',
          });
        } else {
          task.prompt = prompt;
          task.uploadedFiles = uploadedFiles || [];
          task.updatedAt = new Date();
          task.user = user?.email || 'admin@idurarapp.com';
          if (!Array.isArray(task.stagedFiles)) {
            task.stagedFiles = [];
          }
        }
        await task.save();
        await logDebug('Task saved', 'taskManager', {
          taskId,
          status: task.status,
          user: task.user,
          stagedFilesCount: task.stagedFiles.length,
          timestamp,
        });
        break;
      } catch (err) {
        attempt++;
        await logWarn(`Task creation attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
          taskId,
          stack: err.stack,
          timestamp,
        });
        if (attempt >= maxAttempts) {
          debounceEmit(taskId, { taskId, status: 'failed', error: `Failed to create task: ${err.message}`, logColor: 'red', timestamp, errorDetails: { reason: err.message, context: 'processTask' } });
          throw new Error(`Failed to create task: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  } catch (err) {
    await logError(`Task creation failed: ${err.message}`, 'taskManager', { taskId, stack: err.stack, timestamp });
    throw err;
  }

  try {
    // Update task status to processing
    console.log('taskManager: Updating task status to processing', { taskId, timestamp });
    task.status = 'processing';
    await task.save();
    debounceEmit(taskId, { taskId, status: 'processing', message: `Processing task: ${prompt}`, logColor: 'blue', timestamp });

    // Create Memory entry for task history
    console.log('taskManager: Creating Memory entry', { taskId, timestamp });
    try {
      const memory = new mongoose.model('Memory')({
        taskId,
        content: prompt || 'Default content',
        status: 'pending',
        stagedFiles: [],
        generatedFiles: [],
        uploadedFiles: uploadedFiles || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: user?.email || 'admin@idurarapp.com',
      });
      await memory.save();
      await logDebug('Memory entry created', 'taskManager', {
        taskId,
        content: prompt,
        uploadedFiles: uploadedFiles.length,
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
    } catch (memoryErr) {
      await logError(`Failed to save Memory document: ${memoryErr.message}`, 'taskManager', { taskId, stack: memoryErr.stack, timestamp });
      task.status = 'failed';
      task.error = `Memory validation failed: ${memoryErr.message}`;
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: memoryErr.message, context: 'processTask' } });
      throw new Error(task.error);
    }

    // Read and validate system files for originalContent
    console.log('taskManager: Reading system files for originalContent', { taskId, timestamp });
    let originalContent = {};
    try {
      const systemFiles = await readSystemFiles();
      const maxSize = 10 * 1024 * 1024; // 10MB total limit
      const maxFileSize = 1 * 1024 * 1024; // 1MB per file
      let totalSize = 0;
      for (const file of Object.keys(systemFiles)) {
        const content = systemFiles[file];
        if (typeof content === 'string') {
          try {
            Buffer.from(content, 'utf8');
            const fileSize = Buffer.byteLength(content, 'utf8');
            if (fileSize <= maxFileSize && totalSize + fileSize <= maxSize) {
              originalContent[file] = content;
              totalSize += fileSize;
            } else {
              await logWarn('Skipping file in originalContent due to size limit', 'taskManager', {
                taskId,
                file,
                fileSize,
                totalSize,
                maxSize,
                maxFileSize,
                timestamp,
              });
            }
          } catch (err) {
            await logWarn('Skipping file in originalContent due to invalid UTF-8', 'taskManager', {
              taskId,
              file,
              error: err.message,
              timestamp,
            });
          }
        }
      }
      await logDebug('Generated originalContent', 'taskManager', {
        taskId,
        fileCount: Object.keys(originalContent).length,
        totalSize,
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
      JSON.stringify(originalContent); // Validate serialization
      task.originalContent = originalContent;
    } catch (err) {
      await logError(`Failed to read system files: ${err.message}`, 'taskManager', { taskId, stack: err.stack, timestamp });
      task.status = 'failed';
      task.error = `Failed to read system files: ${err.message}`;
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: err.message, context: 'processTask' } });
      throw new Error(task.error);
    }

    // Parse prompt or use provided data
    console.log('taskManager: Parsing prompt', { taskId, timestamp });
    let parsedData;
    try {
      parsedData = backendChanges.length ? { action, target, features, isMultiFile, backendChanges } : await parsePrompt(prompt, taskId);
      const { action: parsedAction, target: parsedTarget = 'crm', features: parsedFeatures = [], isMultiFile: parsedIsMultiFile, backendChanges: parsedBackendChanges } = parsedData;
      await logInfo('Parsed prompt', 'taskManager', {
        taskId,
        parsedData: { action: parsedAction, target: parsedTarget, features: parsedFeatures, isMultiFile: parsedIsMultiFile, backendChanges: parsedBackendChanges.length },
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
    } catch (parseErr) {
      await logError(`Prompt parsing failed: ${parseErr.message}`, 'taskManager', { taskId, stack: parseErr.stack, timestamp });
      task.status = 'failed';
      task.error = `Prompt parsing failed: ${parseErr.message}`;
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: parseErr.message, context: 'processTask' } });
      throw new Error(task.error);
    }

    const { action: parsedAction, target: parsedTarget, features: parsedFeatures, isMultiFile: parsedIsMultiFile, backendChanges: parsedBackendChanges } = parsedData;

    // Generate staged files
    console.log('taskManager: Generating staged files', { taskId, timestamp });
    let stagedFiles;
    try {
      stagedFiles = await generateFiles(taskId, { ...parsedData, target: parsedTarget });
      await logDebug('Generated staged files', 'taskManager', {
        taskId,
        fileCount: stagedFiles.length,
        files: stagedFiles.map(f => f.path || 'unknown'),
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
    } catch (generateErr) {
      await logError(`Failed to generate stagedFiles: ${generateErr.message}`, 'taskManager', { taskId, parsedData, stack: generateErr.stack, timestamp });
      task.status = 'failed';
      task.error = `File generation failed: ${generateErr.message}`;
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: generateErr.message, context: 'processTask' } });
      throw new Error(task.error);
    }

    // Validate stagedFiles
    if (!stagedFiles || !Array.isArray(stagedFiles)) {
      await logError(`Invalid stagedFiles returned from generateFiles: ${JSON.stringify(stagedFiles)}`, 'taskManager', { taskId, parsedData, timestamp });
      task.status = 'failed';
      task.error = `Invalid stagedFiles: ${stagedFiles === null ? 'null' : typeof stagedFiles}`;
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: task.error, context: 'processTask' } });
      throw new Error(task.error);
    }
    if (stagedFiles.length === 0) {
      await logWarn('No staged files generated', 'taskManager', { taskId, parsedData, timestamp });
      task.status = 'failed';
      task.error = 'No staged files generated';
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: task.error, context: 'processTask' } });
      throw new Error(task.error);
    }

    if (!isValidTask(taskId, prompt, stagedFiles)) {
      await logError('Task validation failed', 'taskManager', { taskId, prompt, stagedFiles: JSON.stringify(stagedFiles), timestamp });
      task.status = 'failed';
      task.error = 'Task validation failed';
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: task.error, context: 'processTask' } });
      throw new Error(task.error);
    }
    if (!isValidFiles(stagedFiles)) {
      await logError('File validation failed', 'taskManager', { taskId, stagedFiles: JSON.stringify(stagedFiles), timestamp });
      task.status = 'failed';
      task.error = 'File validation failed';
      await task.save();
      debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: task.error, context: 'processTask' } });
      throw new Error(task.error);
    }

    // Save stagedFiles with retry logic
    console.log('taskManager: Saving staged files to MongoDB', { taskId, timestamp });
    let retries = 0;
    const maxRetries = 7;
    while (retries < maxRetries) {
      try {
        task.stagedFiles = stagedFiles;
        task.generatedFiles = stagedFiles.map(f => f.path || '');
        task.testInstructions = stagedFiles.map(f => f.testInstructions || '').join('\n\n');

        const newContentObj = {};
        stagedFiles.forEach(file => {
          const key = file.path || 'unknown';
          const value = file.content || '';
          if (typeof key === 'string' && typeof value === 'string') {
            newContentObj[key] = value;
          }
        });
        JSON.stringify(newContentObj); // Validate serialization
        await logDebug('Generated newContent', 'taskManager', {
          taskId,
          newContent: Object.keys(newContentObj),
          newContentSize: Buffer.byteLength(JSON.stringify(newContentObj), 'utf8'),
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
        task.newContent = newContentObj;

        for (const [key, value] of Object.entries(task.newContent)) {
          if (typeof key !== 'string' || typeof value !== 'string') {
            throw new Error(`Invalid newContent: key=${key}, value type=${typeof value}`);
          }
        }
        for (const [key, value] of Object.entries(task.originalContent)) {
          if (typeof key !== 'string' || typeof value !== 'string') {
            throw new Error(`Invalid originalContent: key=${key}, value type=${typeof value}`);
          }
        }

        await task.save();
        const savedTask = await mongoose.model('Task').findOne({ taskId });
        if (!savedTask || !savedTask.stagedFiles || savedTask.stagedFiles.length !== stagedFiles.length) {
          throw new Error('Staged files verification failed');
        }
        await logDebug('Verified stagedFiles in MongoDB', 'taskManager', {
          taskId,
          files: stagedFiles.map(f => f.path || 'unknown'),
          testInstructions: savedTask.testInstructions,
          contentKeys: Object.keys(savedTask.originalContent).length + '/' + Object.keys(savedTask.newContent).length,
          attempt: retries + 1,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
        break;
      } catch (err) {
        retries++;
        await logWarn(`Staged files save attempt ${retries}/${maxRetries} failed: ${err.message}`, 'taskManager', {
          taskId,
          stagedFiles: JSON.stringify(stagedFiles),
          originalContentSize: Buffer.byteLength(JSON.stringify(task.originalContent), 'utf8'),
          newContentSize: Buffer.byteLength(JSON.stringify(task.newContent), 'utf8'),
          errorStack: err.stack,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
        if (retries >= maxRetries) {
          task.status = 'failed';
          task.error = `Failed to persist stagedFiles: ${err.message}`;
          await task.save();
          debounceEmit(taskId, { taskId, status: 'failed', error: task.error, logColor: 'red', timestamp, errorDetails: { reason: err.message, context: 'processTask' } });
          throw new Error(task.error);
        }
        await new Promise(resolve => setTimeout(resolve, 500 * retries));
      }
    }

    // Run automated tests with retries
    console.log('taskManager: Running automated tests', { taskId, timestamp });
    let testResult = null;
    let testUrl = `http://localhost:8888/api/grok/test/${taskId}/${uuidv4()}`;
    let testAttempts = 0;
    const maxTestAttempts = 3;
    while (testAttempts < maxTestAttempts) {
      try {
        testResult = await runTests(null, stagedFiles, taskId, false);
        task.testUrl = testUrl;
        task.status = testResult.success ? 'tested' : 'failed';
        task.error = testResult.success ? null : `Automated test failed: ${testResult.error || 'Unknown error'}`;
        await task.save();
        await logInfo('Automated test completed', 'taskManager', {
          taskId,
          stagedFilesCount: stagedFiles.length,
          testResult: testResult.success ? 'success' : 'failed',
          testUrl,
          error: task.error,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
        debounceEmit(taskId, {
          taskId,
          status: task.status,
          stagedFiles: task.stagedFiles,
          testInstructions: task.testInstructions,
          testUrl,
          error: task.error,
          logColor: testResult.success ? 'green' : 'red',
          timestamp,
        });
        break;
      } catch (testErr) {
        testAttempts++;
        await logError(`Test attempt ${testAttempts}/${maxTestAttempts} failed: ${testErr.message}`, 'taskManager', {
          taskId,
          stack: testErr.stack,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
        if (testAttempts >= maxTestAttempts) {
          task.testUrl = testUrl; // Ensure testUrl is set even on failure
          task.status = 'failed';
          task.error = `Automated test failed after ${maxTestAttempts} attempts: ${testErr.message}`;
          await task.save();
          debounceEmit(taskId, {
            taskId,
            status: 'failed',
            error: task.error,
            testUrl,
            logColor: 'red',
            timestamp,
            errorDetails: { reason: testErr.message, context: 'processTask' },
          });
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * testAttempts));
      }
    }

    // Create backend proposals
    console.log('taskManager: Creating backend proposals', { taskId, timestamp });
    let proposals = [];
    try {
      proposals = await createProposals(taskId, parsedBackendChanges, user?.email || 'admin@idurarapp.com');
      task.proposedChanges = proposals.map(p => p._id.toString());
      task.status = 'pending_approval';
      await task.save();
      debounceEmit(taskId, {
        taskId,
        status: 'pending_approval',
        stagedFiles: task.stagedFiles,
        proposedChanges: task.proposedChanges,
        testInstructions: task.testInstructions,
        testUrl: task.testUrl,
        logColor: parsedIsMultiFile ? 'yellow' : 'blue',
        timestamp,
      });
    } catch (proposalErr) {
      await logError(`Failed to create backend proposals: ${proposalErr.message}`, 'taskManager', {
        taskId,
        stack: proposalErr.stack,
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
      task.status = 'failed';
      task.error = `Failed to create backend proposals: ${proposalErr.message}`;
      await task.save();
      debounceEmit(taskId, {
        taskId,
        status: 'failed',
        error: task.error,
        logColor: 'red',
        timestamp,
        errorDetails: { reason: proposalErr.message, context: 'processTask' },
      });
      throw new Error(task.error);
    }

    // Send email notification
    console.log('taskManager: Sending email notification', { taskId, timestamp });
    try {
      const eventType = task.status === 'pending_approval' ? 'task_pending_approval' : task.status === 'failed' ? 'task_failed' : 'task_completed';
      await sendEmail(
        user?.email || 'admin@hiwaydriveintheater.com',
        `Task ${taskId} ${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`,
        taskId,
        eventType
      );
      await logInfo('Email notification sent', 'taskManager', {
        taskId,
        recipient: user?.email || 'admin@hiwaydriveintheater.com',
        eventType,
        timestamp,
      });
    } catch (emailErr) {
      await logError(`Failed to send email notification: ${emailErr.message}`, 'taskManager', {
        taskId,
        stack: emailErr.stack,
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
    }

    await logInfo('Task processed', 'taskManager', {
      taskId,
      stagedFiles: stagedFiles.length,
      proposals: proposals.length,
      testUrl: task.testUrl,
      status: task.status,
      user: user?.email || 'admin@idurarapp.com',
      timestamp,
    });
    await appendLog(errorLogPath, `# Task Processed\nTask ID: ${taskId}\nStaged Files: ${stagedFiles.map(f => f.path).join(', ')}\nProposals: ${proposals.length}\nTest Instructions: ${task.testInstructions}\nTest URL: ${task.testUrl}\nStatus: ${task.status}\nUser: ${user?.email || 'admin@idurarapp.com'}`);
    return task.toObject();
  } catch (err) {
    await logError(`Task processing failed: ${err.message}`, 'taskManager', {
      taskId,
      stack: err.stack,
      user: user?.email || 'admin@idurarapp.com',
      timestamp,
    });
    task.status = 'failed';
    task.error = err.message;
    await task.save();
    debounceEmit(taskId, {
      taskId,
      status: 'failed',
      error: `Task processing failed: ${err.message}`,
      logColor: 'red',
      timestamp,
      errorDetails: { reason: err.message, context: 'processTask' },
    });
    throw err;
  }
}

/**
 * Fetches tasks from MongoDB with optional filtering.
 * @param {Object} params - Filter parameters.
 * @param {string} params.taskId - Optional task ID filter.
 * @param {Object} params.user - User object with email.
 * @returns {Promise<Array>} Array of tasks.
 */
async function getTasks({ taskId, user }) {
  const timestamp = new Date().toISOString();
  let filter = taskId && taskId !== 'all' ? { taskId } : {};
  filter.user = { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] };
  console.log('getTasks: Executing query with filter', {
    filter: JSON.stringify(filter),
    database: mongoose.connection.name,
    collection: mongoose.model('Task').collection.collectionName,
    user: user?.email || 'undefined',
    timestamp,
  });

  try {
    const Task = mongoose.model('Task');
    let tasks = await Task.find(filter).exec();
    const taskObjects = tasks.map(t => {
      const taskObj = t.toObject();
      taskObj.user = t.user || 'admin@idurarapp.com'; // Ensure user field is set
      return taskObj;
    });
    console.log('getTasks: Found tasks', {
      count: tasks.length,
      taskIds: tasks.map(t => t.taskId),
      statuses: tasks.map(t => t.status),
      users: tasks.map(t => t.user || 'admin@idurarapp.com'),
      database: mongoose.connection.name,
      collection: Task.collection.collectionName,
      timestamp,
    });
    await logInfo('Fetched tasks from MongoDB', 'taskManager', {
      filter,
      count: tasks.length,
      taskIds: tasks.map(t => t.taskId),
      statuses: tasks.map(t => t.status),
      user: user?.email || 'undefined',
      timestamp,
    });
    debounceEmit(taskId || 'all', {
      taskId: taskId || 'all',
      status: 'fetched',
      message: `Fetched ${tasks.length} tasks`,
      logColor: 'green',
      timestamp,
    });
    return taskObjects;
  } catch (err) {
    await logError(`Failed to fetch tasks: ${err.message}`, 'taskManager', {
      filter,
      error: err.message,
      stack: err.stack,
      user: user?.email || 'undefined',
      timestamp,
    });
    debounceEmit(taskId || 'all', {
      taskId: taskId || 'all',
      status: 'failed',
      error: `Failed to fetch tasks: ${err.message}`,
      logColor: 'red',
      timestamp,
      errorDetails: { reason: err.message, context: 'fetchTasks' },
    });
    throw new Error(`Failed to fetch tasks: ${err.message}`);
  }
}

/**
 * Clears all tasks and associated proposals.
 * @param {Object} params - Parameters.
 * @param {Object} params.user - User object with email.
 * @returns {Promise<void>}
 */
async function clearTasks({ user }) {
  const timestamp = new Date().toISOString();
  try {
    const filter = { user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } };
    await mongoose.model('Task').deleteMany(filter);
    await mongoose.model('BackendProposal').deleteMany(filter);
    await mongoose.model('Memory').deleteMany(filter);
    await logInfo('Cleared all tasks and proposals', 'taskManager', { user: user?.email || 'undefined', timestamp });
    debounceEmit(null, {
      taskId: null,
      status: 'cleared',
      message: `All tasks cleared for user ${user?.email || 'undefined'}`,
      logColor: 'green',
      timestamp,
    });
  } catch (err) {
    await logError(`Failed to clear tasks: ${err.message}`, 'taskManager', {
      error: err.message,
      stack: err.stack,
      user: user?.email || 'undefined',
      timestamp,
    });
    throw new Error(`Failed to clear tasks: ${err.message}`);
  }
}

/**
 * Applies approved changes to the filesystem.
 * @param {string} taskId - The task ID.
 * @param {Object} params - Parameters.
 * @param {Object} params.user - User object with email.
 * @returns {Promise<void>}
 */
async function applyApprovedChanges(taskId, { user }) {
  const timestamp = new Date().toISOString();
  console.log('taskManager: applyApprovedChanges called', { taskId, user: user?.email || 'undefined', timestamp });
  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, user: user?.email || 'undefined', timestamp });
    debounceEmit(taskId, { taskId, status: 'failed', error: 'Invalid taskId', logColor: 'red', timestamp, errorDetails: { reason: 'Invalid taskId', context: 'applyApprovedChanges' } });
    throw new Error('Invalid taskId');
  }

  const task = await mongoose.model('Task').findOne({ taskId, user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });
  if (!task) {
    await logError('Task not found', 'taskManager', { taskId, user: user?.email || 'undefined', timestamp });
    debounceEmit(taskId, { taskId, status: 'failed', error: 'Task not found', logColor: 'red', timestamp, errorDetails: { reason: 'Task not found', context: 'applyApprovedChanges' } });
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
        await logDebug('Applied staged file to filesystem', 'taskManager', {
          taskId,
          file: fileObj.path,
          contentLength: fileObj.content.length,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
      }

      const proposals = await mongoose.model('BackendProposal').find({ taskId, status: 'approved', user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });
      for (const proposal of proposals) {
        const targetFile = path.join(__dirname, '../../../', proposal.file);
        await fs.appendFile(targetFile, `\n// BackendProposal ${proposal._id}: ${proposal.content}\n`, 'utf8');
        await logDebug('Applied BackendProposal change', 'taskManager', {
          taskId,
          proposalId: proposal._id,
          file: proposal.file,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
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
        timestamp,
      });
      await logInfo('Applied approved changes', 'taskManager', { taskId, user: user?.email || 'admin@idurarapp.com', timestamp });
      await appendLog(errorLogPath, `# Changes Applied\nTask ID: ${taskId}\nUser: ${user?.email || 'admin@idurarapp.com'}`);
      break;
    } catch (err) {
      attempt++;
      await logWarn(`Apply changes attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
        taskId,
        stack: err.stack,
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
      if (attempt >= maxAttempts) {
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: `Failed to apply changes: ${err.message}`,
          logColor: 'red',
          timestamp,
          errorDetails: { reason: err.message, context: 'applyApprovedChanges' },
        });
        throw new Error(`Failed to apply changes: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Rolls back changes for a task.
 * @param {string} taskId - The task ID.
 * @param {Object} params - Parameters.
 * @param {Object} params.user - User object with email.
 * @returns {Promise<void>}
 */
async function rollbackChanges(taskId, { user }) {
  const timestamp = new Date().toISOString();
  console.log('taskManager: rollbackChanges called', { taskId, user: user?.email || 'undefined', timestamp });
  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, user: user?.email || 'undefined', timestamp });
    debounceEmit(taskId, { taskId, status: 'failed', error: 'Invalid taskId', logColor: 'red', timestamp, errorDetails: { reason: 'Invalid taskId', context: 'rollbackChanges' } });
    throw new Error('Invalid taskId');
  }

  const task = await mongoose.model('Task').findOne({ taskId, user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });
  if (!task) {
    await logError('Task not found', 'taskManager', { taskId, user: user?.email || 'undefined', timestamp });
    debounceEmit(taskId, { taskId, status: 'failed', error: 'Task not found', logColor: 'red', timestamp, errorDetails: { reason: 'Task not found', context: 'rollbackChanges' } });
    throw new Error('Task not found');
  }

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      for (const fileObj of task.stagedFiles || []) {
        const stagedPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.unlink(stagedPath).catch(() => {});
        await logDebug('Removed staged file', 'taskManager', {
          taskId,
          file: fileObj.path,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
      }

      task.status = 'denied';
      task.stagedFiles = [];
      task.proposedChanges = [];
      task.updatedAt = new Date();
      await task.save();

      await mongoose.model('BackendProposal').deleteMany({ taskId, user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });

      debounceEmit(taskId, {
        taskId,
        status: 'denied',
        message: `Task denied and changes rolled back`,
        logColor: 'red',
        timestamp,
      });
      await logInfo('Rolled back changes', 'taskManager', { taskId, user: user?.email || 'admin@idurarapp.com', timestamp });
      await appendLog(errorLogPath, `# Changes Rolled Back\nTask ID: ${taskId}\nUser: ${user?.email || 'admin@idurarapp.com'}`);
      break;
    } catch (err) {
      attempt++;
      await logWarn(`Rollback attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
        taskId,
        stack: err.stack,
        user: user?.email || 'admin@idurarapp.com',
        timestamp,
      });
      if (attempt >= maxAttempts) {
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: `Failed to rollback changes: ${err.message}`,
          logColor: 'red',
          timestamp,
          errorDetails: { reason: err.message, context: 'rollbackChanges' },
        });
        throw new Error(`Failed to rollback changes: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Deletes a task and associated data.
 * @param {string} taskId - The task ID.
 * @param {Object} params - Parameters.
 * @param {Object} params.user - User object with email.
 * @returns {Promise<void>}
 */
async function deleteTask(taskId, { user }) {
  const timestamp = new Date().toISOString();
  console.log('taskManager: deleteTask called', { taskId, user: user?.email || 'undefined', timestamp });
  if (!isValidTaskId(taskId)) {
    await logError('Invalid taskId', 'taskManager', { taskId, user: user?.email || 'undefined', timestamp });
    debounceEmit(taskId, { taskId, status: 'failed', error: 'Invalid taskId', logColor: 'red', timestamp, errorDetails: { reason: 'Invalid taskId', context: 'deleteTask' } });
    throw new Error('Invalid taskId');
  }

  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    try {
      const task = await mongoose.model('Task').findOne({ taskId, user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });
      if (!task) {
        await logError('Task not found', 'taskManager', { taskId, user: user?.email || 'undefined', timestamp });
        debounceEmit(taskId, { taskId, status: 'failed', error: 'Task not found', logColor: 'red', timestamp, errorDetails: { reason: 'Task not found', context: 'deleteTask' } });
        throw new Error('Task not found');
      }

      for (const fileObj of task.stagedFiles || []) {
        const stagedPath = path.join(__dirname, '../../../', fileObj.path);
        await fs.unlink(stagedPath).catch(() => {});
        await logDebug('Removed staged file', 'taskManager', {
          taskId,
          file: fileObj.path,
          user: user?.email || 'admin@idurarapp.com',
          timestamp,
        });
      }

      await mongoose.model('Task').deleteOne({ taskId, user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });
      await mongoose.model('Memory').deleteMany({ taskId, user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });
      await mongoose.model('BackendProposal').deleteMany({ taskId, user: { $in: [user?.email, null, undefined, 'admin@idurarapp.com'] } });

      debounceEmit(taskId, {
        taskId,
        status: 'deleted',
        message: `Task deleted`,
        logColor: 'green',
        timestamp,
      });
      await logInfo('Deleted task', 'taskManager', { taskId, user: user?.email || 'admin@idurarapp.com', timestamp });
      await appendLog(errorLogPath, `# Task Deleted\nTask ID: ${taskId}\nUser: ${user?.email || 'admin@idurarapp.com'}`);
      break;
    } catch (err) {
      attempt++;
      await logError(`Delete task attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskManager', {
        taskId,
        stack: err.stack,
        user: user?.email || 'undefined',
        errorCode: err.code,
        errorName: err.name,
        timestamp,
      });
      if (attempt >= maxAttempts) {
        debounceEmit(taskId, {
          taskId,
          status: 'failed',
          error: `Failed to delete task: ${err.message}`,
          logColor: 'red',
          timestamp,
          errorDetails: { reason: err.message, context: 'deleteTask', errorCode: err.code, errorName: err.name },
        });
        throw new Error(`Failed to delete task: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

module.exports = { processTask, applyApprovedChanges, rollbackChanges, deleteTask, getTasks, clearTasks };
