/*
 * File Path: backend/src/routes/proposalRoutes.js
 * Purpose: Defines Express routes for managing backend proposals in Allur Space Console, supporting CRUD operations and approval/rollback workflows.
 * How It Works:
 *   - Provides endpoints: /grok/backend-proposals (GET), /grok/approve-backend (POST), /grok/rollback (POST), /grok/test (POST).
 *   - Uses BackendProposal model from db.js for MongoDB operations.
 *   - Validates proposalId and taskId to prevent errors.
 *   - Integrates taskManager.js for applying/rolling back proposal changes.
 *   - Integrates testGenerator.js for running Playwright tests on proposals.
 *   - Emits Socket.IO events (backendProposal, backendProposalUpdate) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs operations to MongoDB Log model.
 * Dependencies:
 *   - express: Router for defining endpoints (version 5.1.0).
 *   - mongoose: BackendProposal, Task, Log models for MongoDB operations (version 8.13.2).
 *   - winston: Console logging (version 3.17.0, file transport removed).
 *   - socket.js: getIO for Socket.IO emissions (version 4.8.1).
 *   - taskManager.js: applyApprovedChanges, rollbackChanges for proposal actions.
 *   - testGenerator.js: runTests for proposal testing.
 * Why It’s Here:
 *   - Supports Sprint 2 backend proposal workflow by providing robust endpoints for proposal management (04/23/2025).
 * Change Log:
 *   - 04/21/2025: Created to handle proposal CRUD operations with direct fs operations.
 *   - 04/23/2025: Integrated taskManager.js and testGenerator.js, added debug logs.
 *   - 04/23/2025: Fixed socket.js import path to resolve MODULE_NOT_FOUND error.
 *   - 04/28/2025: Updated to align with proposalUtils.js for createProposals.
 *   - 04/30/2025: Transitioned logging to MongoDB Log model.
 *     - Why: Replace filesystem logs with database storage (User, 04/30/2025).
 *     - How: Replaced winston file transport with Log.create, updated all log calls.
 *     - Test: Verify idurar_db.logs contains proposal route logs, no grok.log writes.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, idurar_db.logs logs “Mounted /api/grok successfully”.
 *   - GET /grok/backend-proposals: Confirm 200 response with proposal list, idurar_db.logs logs fetch.
 *   - POST /grok/approve-backend with { proposalId }: Confirm 200 response, proposal status=approved, green log in LiveFeed.jsx.
 *   - POST /grok/rollback with { proposalId }: Confirm 200 response, proposal status=denied, red log.
 *   - POST /grok/test with { taskId, manual: true }: Confirm test runs, blue log.
 *   - Check idurar_db.logs: Confirm proposal route logs, no filesystem writes.
 * Future Enhancements:
 *   - Add POST /grok/backend-proposals for manual proposal creation (Sprint 4).
 *   - Support bulk approve/deny endpoints (Sprint 4).
 * Self-Notes:
 *   - Nate: Integrated taskManager.js for apply/rollback (04/23/2025).
 *   - Nate: Fixed socket.js import (04/23/2025).
 *   - Nate: Transitioned to MongoDB logging (04/30/2025).
 */
const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
const path = require('path');
const { getIO } = require('../socket');
const { applyApprovedChanges, rollbackChanges } = require('../utils/taskManager');
const { runTests } = require('../utils/testGenerator');
const { getModel } = require('../db');

const router = express.Router();
const BackendProposal = getModel('BackendProposal');
const Task = getModel('Task');
const Log = getModel('Log');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
  ],
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
  try {
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
      errorDetails: { reason: error.message, context: 'backend-proposals' },
    });
    res.status(500).json({ error: `Failed to fetch BackendProposals: ${error.message}` });
  }
});

// POST /grok/approve-backend - Approve a backend proposal
router.post('/approve-backend', async (req, res) => {
  const { proposalId } = req.body;

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
      errorDetails: { reason: error.message, context: 'approve-backend' },
    });
    res.status(500).json({ error: `Failed to approve BackendProposal: ${error.message}` });
  }
});

// POST /grok/rollback - Rollback a backend proposal
router.post('/rollback', async (req, res) => {
  const { proposalId } = req.body;

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
      errorDetails: { reason: error.message, context: 'rollback' },
    });
    res.status(500).json({ error: `Failed to rollback BackendProposal: ${error.message}` });
  }
});

// POST /grok/test - Run Playwright tests for a task’s staged files
router.post('/test', async (req, res) => {
  const { taskId, manual = false } = req.body;

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

    const stagedFiles = task.stagedFiles.map(f => f.path);
    await runTests(null, stagedFiles, taskId, manual);
    await Log.create({
      level: 'debug',
      message: 'Ran test for task',
      context: 'proposalRoutes',
      details: { taskId, manual, stagedFiles: stagedFiles.length },
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'tested',
      message: `Test ${manual ? 'manual' : 'auto'} completed`,
      logColor: manual ? 'blue' : 'green',
      timestamp: new Date().toISOString(),
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
      errorDetails: { reason: error.message, context: 'test' },
    });
    res.status(500).json({ error: `Failed to run test: ${error.message}` });
  }
});

module.exports = router;
