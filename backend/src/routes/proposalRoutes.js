/*
 * File Path: backend/src/routes/proposalRoutes.js
 * Purpose: Defines Express routes for managing backend proposals in Allur Space Console, supporting CRUD operations and approval/rollback workflows.
 * How It Works:
 *   - Provides endpoints: GET /backend-proposals, POST /approve-backend, POST /rollback, POST /test.
 *   - Uses BackendProposal and Task models for MongoDB operations.
 *   - Validates proposalId and taskId to prevent errors.
 *   - Integrates taskManager.js for applying/rolling back proposal changes.
 *   - Uses playwrightUtils.js for Playwright test execution, aligning with taskRoutes.js.
 *   - Emits backendProposal and taskUpdate events via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs operations to idurar_db.logs using Log model.
 * Mechanics:
 *   - GET /backend-proposals: Fetches all proposals, sorted by creation date.
 *   - POST /approve-backend: Approves a proposal, applies changes via taskManager.js.
 *   - POST /rollback: Rolls back a proposal, updates task status to denied.
 *   - POST /test: Runs Playwright tests for a task’s staged files in manual or auto mode.
 *   - Validates inputs with custom isValidProposalId and isValidTaskId functions.
 * Dependencies:
 *   - express: Router for defining endpoints (version 5.1.0).
 *   - mongoose: BackendProposal, Task, Log models for MongoDB operations (version 8.13.2).
 *   - winston: Console logging (version 3.17.0).
 *   - socket.js: getIO for Socket.IO emissions (version 4.8.1).
 *   - taskManager.js: applyApprovedChanges, rollbackChanges for proposal actions.
 *   - playwrightUtils.js: runPlaywrightTests for test execution.
 *   - db.js: getModel for schema access.
 *   - uuid: Generates unique eventId for Socket.IO events (version 11.1.0).
 * Dependents:
 *   - app.js: Mounts routes at /api/grok.
 *   - GrokUI.jsx: Consumes API responses via useProposals.js, useProposalSocket.js.
 *   - ProposalList.jsx: Triggers proposal actions via useProposalActions.js.
 *   - useProposalActions.js: Makes API calls to these endpoints.
 *   - TaskList.jsx: Displays proposal buttons for tasks.
 * Why It’s Here:
 *   - Supports Sprint 2 backend proposal workflow by providing robust endpoints for proposal management (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Created to handle proposal CRUD operations with direct filesystem operations.
 *   - 04/23/2025: Integrated taskManager.js for apply/rollback, added debug logs, fixed socket.js import path.
 *     - Why: MODULE_NOT_FOUND error for socket.js (User, 04/23/2025).
 *     - How: Corrected import path, added logging for proposal operations, preserved functionality.
 *     - Test: POST /approve-backend, verify 200 response, logs in idurar_db.logs.
 *   - 04/28/2025: Aligned with proposalUtils.js for createProposals consistency.
 *   - 04/29/2025: Transitioned logging to MongoDB Log model.
 *     - Why: Replace filesystem logs with database storage for reliability (User, 04/29/2025).
 *     - How: Replaced winston file transport with Log.create, updated all log calls.
 *     - Test: Run `npm start`, verify idurar_db.logs contains proposal route logs, no grok.log writes.
 *   - 04/29/2025: Updated /test to use playwrightUtils.js.
 *     - Why: Inconsistent test execution with testGenerator.js (User, 04/29/2025).
 *     - How: Replaced runTests with runPlaywrightTests, passed stagedFiles and prompt, aligned with taskRoutes.js.
 *     - Test: POST /api/grok/test, verify test runs, blue log in idurar_db.logs.
 *   - 04/29/2025: Fixed SyntaxError in /rollback endpoint.
 *     - Why: Invalid details object syntax caused server crash (User, 04/29/2025).
 *     - How: Corrected details: Hawkins: to details, removed erroneous label, preserved logging.
 *     - Test: Run `npm start`, POST /rollback, verify 200 response, logs in idurar_db.logs.
 *   - 04/29/2025: Completed /test endpoint WebSocket emission.
 *     - Why: Incomplete taskUpdate event caused UI sync issues (User, 04/29/2025).
 *     - How: Added full taskUpdate event with taskId, status, message, logColor, timestamp, eventId.
 *     - Test: POST /api/grok/test with { taskId, manual: true }, verify blue log in LiveFeed.jsx.
 *   - 04/29/2025: Added dependency import logging.
 *     - Why: Debug TypeError in app.js due to potential dependency failure (User, 04/29/2025).
 *     - How: Added console.log for each require, preserved functionality.
 *     - Test: Run `npm start`, check console for dependency load logs.
 * Test Instructions:
 *   - Run `npm start`: Confirm server starts, idurar_db.logs logs “Mounted /api/grok successfully”.
 *   - GET /api/grok/backend-proposals: Verify 200 response with proposal list, fetch log in idurar_db.logs.
 *   - POST /api/grok/approve-backend with { proposalId }: Confirm 200 response, proposal status=approved, green log in LiveFeed.jsx.
 *   - POST /api/grok/rollback with { proposalId }: Confirm 200 response, proposal status=denied, red log in LiveFeed.jsx.
 *   - POST /api/grok/test with { taskId, manual: true }: Confirm test runs, blue log in idurar_db.logs, taskUpdate event in LiveFeed.jsx.
 *   - Check idurar_db.logs: Verify proposal route logs, no filesystem writes.
 * Future Enhancements:
 *   - Add POST /backend-proposals for manual proposal creation (Sprint 3).
 *   - Support bulk approve/deny endpoints (Sprint 3).
 *   - Implement proposal prioritization (Sprint 4).
 * Self-Notes:
 *   - Nate: Integrated taskManager.js for apply/rollback (04/23/2025).
 *   - Nate: Fixed socket.js import (04/23/2025).
 *   - Nate: Transitioned to MongoDB logging (04/29/2025).
 *   - Nate: Aligned test execution with playwrightUtils.js (04/29/2025).
 *   - Nate: Fixed SyntaxError in /rollback details object (04/29/2025).
 *   - Nate: Completed /test endpoint with full taskUpdate event (04/29/2025).
 *   - Nate: Added dependency logging for TypeError debugging (04/29/2025).
 */
console.log('proposalRoutes.js: Loading express');
const express = require('express');
console.log('proposalRoutes.js: Loading mongoose');
const mongoose = require('mongoose');
console.log('proposalRoutes.js: Loading winston');
const winston = require('winston');
console.log('proposalRoutes.js: Loading path');
const path = require('path');
console.log('proposalRoutes.js: Loading socket');
const { getIO } = require('../socket');
console.log('proposalRoutes.js: Loading taskManager');
const { applyApprovedChanges, rollbackChanges } = require('../utils/taskManager');
console.log('proposalRoutes.js: Loading playwrightUtils');
const { runPlaywrightTests } = require('../utils/playwrightUtils');
console.log('proposalRoutes.js: Loading db');
const { getModel } = require('../db');
console.log('proposalRoutes.js: Loading uuid');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

function isValidProposalId(proposalId) {
  const isValid = typeof proposalId === 'string' && proposalId.length > 0;
  if (!isValid) {
    logger.warn(`Invalid BackendProposal ID detected`, { proposalId: proposalId || 'missing' });
  }
  return isValid;
}

function isValidTaskId(taskId) {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) {
    logger.warn(`Invalid taskId detected`, { taskId: taskId || 'missing' });
  }
  return isValid;
}

// GET /grok/backend-proposals - Fetch all backend proposals
router.get('/backend-proposals', async (req, res) => {
  const Log = await getModel('Log');
  try {
    const BackendProposal = await getModel('BackendProposal');
    const proposals = await BackendProposal.find({}).sort({ createdAt: -1 });
    await Log.create({
      level: 'debug',
      message: `Fetched ${proposals.length} BackendProposals from idurar_db.backendproposals`,
      context: 'proposalRoutes',
      details: { sort: 'createdAt DESC' },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('backendProposal', { taskId: 'system', proposals });
    res.status(200).json(proposals);
  } catch (error) {
    await Log.create({
      level: 'error',
      message: `Failed to fetch BackendProposals: ${error.message}`,
      context: 'proposalRoutes',
      details: { stack: error.stack },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Failed to fetch BackendProposals: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      errorDetails: { reason: error.message, context: 'backend-proposals' },
    });
    res.status(500).json({ error: `Failed to fetch BackendProposals: ${error.message}` });
  }
});

// POST /grok/approve-backend - Approve a backend proposal
router.post('/approve-backend', async (req, res) => {
  const { proposalId } = req.body;
  const Log = await getModel('Log');

  if (!isValidProposalId(proposalId)) {
    await Log.create({
      level: 'warn',
      message: 'Invalid BackendProposal ID',
      context: 'proposalRoutes',
      details: { proposalId },
      timestamp: new Date().toISOString(),
    });
    return res.status(400).json({ error: `Invalid BackendProposal ID: ${proposalId}` });
  }

  try {
    const BackendProposal = await getModel('BackendProposal');
    const proposal = await BackendProposal.findById(proposalId);
    if (!proposal) {
      await Log.create({
        level: 'warn',
        message: 'BackendProposal not found',
        context: 'proposalRoutes',
        details: { proposalId },
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ error: 'BackendProposal not found' });
    }

    if (proposal.status !== 'pending') {
      await Log.create({
        level: 'warn',
        message: 'Cannot approve BackendProposal: Invalid status',
        context: 'proposalRoutes',
        details: { proposalId, status: proposal.status },
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ error: `BackendProposal is not in pending status: ${proposal.status}` });
    }

    await applyApprovedChanges(proposal.taskId);
    proposal.status = 'approved';
    proposal.updatedAt = new Date();
    await proposal.save();

    await Log.create({
      level: 'debug',
      message: 'Updated BackendProposal to approved',
      context: 'proposalRoutes',
      details: { proposalId, taskId: proposal.taskId },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('backendProposalUpdate', {
      proposalId,
      status: 'approved',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
    });
    res.status(200).json({ message: 'BackendProposal approved' });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: `Failed to approve BackendProposal: ${error.message}`,
      context: 'proposalRoutes',
      details: { proposalId, stack: error.stack },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Failed to approve BackendProposal: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      errorDetails: { reason: error.message, context: 'approve-backend' },
    });
    res.status(500).json({ error: `Failed to approve BackendProposal: ${error.message}` });
  }
});

// POST /grok/rollback - Rollback a backend proposal
router.post('/rollback', async (req, res) => {
  const { proposalId } = req.body;
  const Log = await getModel('Log');

  if (!isValidProposalId(proposalId)) {
    await Log.create({
      level: 'warn',
      message: 'Invalid BackendProposal ID',
      context: 'proposalRoutes',
      details: { proposalId },
      timestamp: new Date().toISOString(),
    });
    return res.status(400).json({ error: `Invalid BackendProposal ID: ${proposalId}` });
  }

  try {
    const BackendProposal = await getModel('BackendProposal');
    const proposal = await BackendProposal.findById(proposalId);
    if (!proposal) {
      await Log.create({
        level: 'warn',
        message: 'BackendProposal not found',
        context: 'proposalRoutes',
        details: { proposalId },
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ error: 'BackendProposal not found' });
    }

    await rollbackChanges(proposal.taskId);
    proposal.status = 'denied';
    proposal.updatedAt = new Date();
    await proposal.save();

    await Log.create({
      level: 'debug',
      message: 'Updated BackendProposal to denied',
      context: 'proposalRoutes',
      details: { proposalId, taskId: proposal.taskId },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('backendProposalUpdate', {
      proposalId,
      status: 'denied',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
    });
    res.status(200).json({ message: 'BackendProposal rolled back' });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: `Failed to rollback BackendProposal: ${error.message}`,
      context: 'proposalRoutes',
      details: { proposalId, stack: error.stack },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId: 'system',
      status: 'failed',
      error: `Failed to rollback BackendProposal: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      errorDetails: { reason: error.message, context: 'rollback' },
    });
    res.status(500).json({ error: `Failed to rollback BackendProposal: ${error.message}` });
  }
});

// POST /grok/test - Run Playwright tests for a task’s staged files
router.post('/test', async (req, res) => {
  const { taskId, manual = false } = req.body;
  const Log = await getModel('Log');

  if (!isValidTaskId(taskId)) {
    await Log.create({
      level: 'warn',
      message: 'Invalid taskId for test',
      context: 'proposalRoutes',
      details: { taskId },
      timestamp: new Date().toISOString(),
    });
    return res.status(400).json({ error: `Invalid taskId: ${taskId}` });
  }

  try {
    const Task = await getModel('Task');
    const task = await Task.findOne({ taskId });
    if (!task) {
      await Log.create({
        level: 'warn',
        message: 'Task not found for test',
        context: 'proposalRoutes',
        details: { taskId },
        timestamp: new Date().toISOString(),
      });
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.stagedFiles || task.stagedFiles.length === 0) {
      await Log.create({
        level: 'warn',
        message: 'No staged files for test',
        context: 'proposalRoutes',
        details: { taskId },
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ error: 'No staged files to test' });
    }

    await runPlaywrightTests(taskId, task.stagedFiles, task.prompt, manual);
    await Log.create({
      level: 'debug',
      message: `Ran ${manual ? 'manual' : 'auto'} test for task`,
      context: 'proposalRoutes',
      details: { taskId, manual, stagedFiles: task.stagedFiles.length },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'tested',
      message: `Test ${manual ? 'manual' : 'auto'} completed`,
      logColor: manual ? 'blue' : 'green',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
    });
    res.status(200).json({ message: 'Test executed successfully' });
  } catch (error) {
    await Log.create({
      level: 'error',
      message: `Failed to run test: ${error.message}`,
      context: 'proposalRoutes',
      details: { taskId, stack: error.stack },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: `Failed to run test: ${error.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      errorDetails: { reason: error.message, context: 'test' },
    });
    res.status(500).json({ error: `Failed to run test: ${error.message}` });
  }
});

module.exports = router;
