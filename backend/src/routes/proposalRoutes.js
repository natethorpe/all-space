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
 *   - socket.js: getIO for Socket.IO emissions (version 4.8.1).
 *   - taskManager.js: applyApprovedChanges, rollbackChanges for proposal actions.
 *   - playwrightUtils.js: runPlaywrightTests for test execution.
 *   - db.js: getModel for schema access.
 *   - uuid: Generates unique eventId for Socket.IO events (version 11.1.0).
 *   - errorHandlers.js: catchErrors for error handling.
 * Dependents:
 *   - app.js: Mounts routes at /api/grok.
 *   - GrokUI.jsx: Consumes API responses via useProposals.js, useProposalSocket.js.
 *   - ProposalList.jsx: Triggers proposal actions via useProposalActions.js.
 *   - TaskList.jsx: Displays proposal buttons for tasks.
 * Why It’s Here:
 *   - Supports Sprint 2 backend proposal workflow by providing robust endpoints for proposal management (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Created to handle proposal CRUD operations with direct filesystem operations (Nate).
 *   - 04/23/2025: Integrated taskManager.js for apply/rollback, added debug logs, fixed socket.js import path (Nate).
 *   - 04/28/2025: Aligned with proposalUtils.js for createProposals consistency (Nate).
 *   - 04/29/2025: Transitioned logging to MongoDB Log model (Nate).
 *   - 04/29/2025: Updated /test to use playwrightUtils.js (Nate).
 *   - 04/29/2025: Fixed SyntaxError in /rollback endpoint (Nate).
 *   - 04/29/2025: Completed /test endpoint WebSocket emission (Nate).
 *   - 04/29/2025: Added dependency import logging (Nate).
 *   - 05/08/2025: Added verifyToken middleware, fixed app.use() error (Grok).
 *   - 05/08/2025: Removed verifyToken for debugging app.use() error (Grok).
 *   - 05/08/2025: Added debug logging for rollbackChanges errors (Grok).
 *     - Why: 500 errors on POST /rollback due to taskManager errors (User, 05/08/2025).
 *     - How: Added detailed logging for rollbackChanges, preserved route logic.
 *     - Test: POST /api/grok/rollback with { proposalId }, verify 200 or detailed error in grok.log.
 * Test Instructions:
 *   - Apply updated proposalRoutes.js, ensure backend/.env includes DATABASE_URI=mongodb://localhost:27017/idurar_db.
 *   - Run `npm start` in backend/, `npm run dev` in frontend/.
 *   - Verify server starts without middleware error.
 *   - POST /api/grok/edit with { prompt: "Create an inventory system" }: Create a task with proposals.
 *   - GET /api/grok/backend-proposals: Verify 200 response with proposals.
 *   - POST /api/grok/approve-backend with { proposalId }: Verify proposal approved, changes applied.
 *   - POST /api/grok/rollback with { proposalId }: Verify proposal denied, changes rolled back.
 *   - POST /api/grok/test with { taskId, manual: true }: Verify test runs, blue log in LiveFeed.jsx.
 *   - Check idurar_db.logs: Confirm proposal actions logged, no 500 errors.
 * Rollback Instructions:
 *   - If errors persist: Revert to proposalRoutes.js.bak (`mv backend/src/routes/proposalRoutes.js.bak backend/src/routes/proposalRoutes.js`).
 *   - Verify server starts post-rollback.
 * Future Enhancements:
 *   - Add POST /backend-proposals for manual proposal creation (Sprint 3).
 *   - Support bulk approve/deny endpoints (Sprint 3).
 *   - Implement proposal prioritization (Sprint 4).
 * Self-Notes:
 *   - Nate: Integrated taskManager.js, transitioned to MongoDB logging, fixed test endpoint (04/29/2025).
 *   - Grok: Enhanced rollback error logging (05/08/2025).
 */

console.log('proposalRoutes.js: Loading express');
const express = require('express');
console.log('proposalRoutes.js: Loading mongoose');
const mongoose = require('mongoose');
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
console.log('proposalRoutes.js: Loading errorHandlers');
const { catchErrors } = require('../handlers/errorHandlers');

const router = express.Router();

// Log router initialization
console.log('proposalRoutes: Initializing routes', {
  timestamp: new Date().toISOString(),
});

function isValidProposalId(proposalId) {
  const isValid = typeof proposalId === 'string' && proposalId.length > 0;
  if (!isValid) {
    console.warn(`Invalid BackendProposal ID detected`, { proposalId: proposalId || 'missing' });
  }
  return isValid;
}

function isValidTaskId(taskId) {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) {
    console.warn(`Invalid taskId detected`, { taskId: taskId || 'missing' });
  }
  return isValid;
}

// GET /grok/backend-proposals - Fetch all backend proposals
router.get(
  '/backend-proposals',
  catchErrors(async (req, res) => {
    const Log = await getModel('Log');
    try {
      const BackendProposal = await getModel('BackendProposal');
      const proposals = await BackendProposal.find({}).sort({ createdAt: -1 });
      await Log.create({
        level: 'debug',
        message: `Fetched ${proposals.length} BackendProposals from idurar_db.backendproposals`,
        context: 'proposalRoutes',
        details: { sort: 'createdAt DESC', user: req.user?.email },
        timestamp: new Date().toISOString(),
      });
      getIO().emit('backendProposal', {
        taskId: 'system',
        proposals,
        eventId: uuidv4(),
      });
      res.status(200).json(proposals);
    } catch (error) {
      await Log.create({
        level: 'error',
        message: `Failed to fetch BackendProposals: ${error.message}`,
        context: 'proposalRoutes',
        details: { stack: error.stack, user: req.user?.email },
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
  })
);

// POST /grok/approve-backend - Approve a backend proposal
router.post(
  '/approve-backend',
  catchErrors(async (req, res) => {
    const { proposalId } = req.body;
    const Log = await getModel('Log');

    if (!isValidProposalId(proposalId)) {
      await Log.create({
        level: 'warn',
        message: 'Invalid BackendProposal ID',
        context: 'proposalRoutes',
        details: { proposalId, user: req.user?.email },
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
          details: { proposalId, user: req.user?.email },
          timestamp: new Date().toISOString(),
        });
        return res.status(404).json({ error: 'BackendProposal not found' });
      }

      if (proposal.status !== 'pending') {
        await Log.create({
          level: 'warn',
          message: 'Cannot approve BackendProposal: Invalid status',
          context: 'proposalRoutes',
          details: { proposalId, status: proposal.status, user: req.user?.email },
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
        details: { proposalId, taskId: proposal.taskId, user: req.user?.email },
        timestamp: new Date().toISOString(),
      });
      getIO().emit('backendProposalUpdate', {
        proposalId,
        status: 'approved',
        taskId: proposal.taskId,
        message: `Proposal approved and changes applied`,
        logColor: 'green',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
      res.status(200).json({ message: 'BackendProposal approved', proposal });
    } catch (error) {
      await Log.create({
        level: 'error',
        message: `Failed to approve BackendProposal: ${error.message}`,
        context: 'proposalRoutes',
        details: { proposalId, stack: error.stack, user: req.user?.email },
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
  })
);

// POST /grok/rollback - Rollback a backend proposal
router.post(
  '/rollback',
  catchErrors(async (req, res) => {
    const { proposalId } = req.body;
    const Log = await getModel('Log');

    if (!isValidProposalId(proposalId)) {
      await Log.create({
        level: 'warn',
        message: 'Invalid BackendProposal ID',
        context: 'proposalRoutes',
        details: { proposalId, user: req.user?.email },
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
          details: { proposalId, user: req.user?.email },
          timestamp: new Date().toISOString(),
        });
        return res.status(404).json({ error: 'BackendProposal not found' });
      }

      console.log('proposalRoutes: Attempting rollback', {
        proposalId,
        taskId: proposal.taskId,
        user: req.user?.email,
        timestamp: new Date().toISOString(),
      });

      await rollbackChanges(proposal.taskId);
      proposal.status = 'denied';
      proposal.updatedAt = new Date();
      await proposal.save();

      await Log.create({
        level: 'debug',
        message: 'Updated BackendProposal to denied',
        context: 'proposalRoutes',
        details: { proposalId, taskId: proposal.taskId, user: req.user?.email },
        timestamp: new Date().toISOString(),
      });
      getIO().emit('backendProposalUpdate', {
        proposalId,
        status: 'denied',
        taskId: proposal.taskId,
        message: `Proposal denied and changes rolled back`,
        logColor: 'red',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
      });
      res.status(200).json({ message: 'BackendProposal rolled back', proposal });
    } catch (error) {
      console.error('proposalRoutes: Rollback failed', {
        proposalId,
        error: error.message,
        stack: error.stack,
        user: req.user?.email,
        timestamp: new Date().toISOString(),
      });
      await Log.create({
        level: 'error',
        message: `Failed to rollback BackendProposal: ${error.message}`,
        context: 'proposalRoutes',
        details: { proposalId, stack: error.stack, user: req.user?.email },
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
  })
);

// POST /grok/test - Run Playwright tests for a task’s staged files
router.post(
  '/test',
  catchErrors(async (req, res) => {
    const { taskId, manual = false } = req.body;
    const Log = await getModel('Log');

    if (!isValidTaskId(taskId)) {
      await Log.create({
        level: 'warn',
        message: 'Invalid taskId for test',
        context: 'proposalRoutes',
        details: { taskId, user: req.user?.email },
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
          details: { taskId, user: req.user?.email },
          timestamp: new Date().toISOString(),
        });
        return res.status(404).json({ error: 'Task not found' });
      }

      if (!task.stagedFiles || task.stagedFiles.length === 0) {
        await Log.create({
          level: 'warn',
          message: 'No staged files for test',
          context: 'proposalRoutes',
          details: { taskId, user: req.user?.email },
          timestamp: new Date().toISOString(),
        });
        return res.status(400).json({ error: 'No staged files to test' });
      }

      const result = await runPlaywrightTests(taskId, task.stagedFiles, task.prompt, manual);
      await Log.create({
        level: 'debug',
        message: `Ran ${manual ? 'manual' : 'auto'} test for task`,
        context: 'proposalRoutes',
        details: { taskId, manual, stagedFiles: task.stagedFiles.length, user: req.user?.email },
        timestamp: new Date().toISOString(),
      });
      getIO().emit('taskUpdate', {
        taskId,
        status: 'tested',
        message: `Test ${manual ? 'manual' : 'auto'} completed`,
        logColor: manual ? 'blue' : 'green',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
        testUrl: result.testUrl,
      });
      res.status(200).json({ message: 'Test executed successfully', testUrl: result.testUrl });
    } catch (error) {
      await Log.create({
        level: 'error',
        message: `Failed to run test: ${error.message}`,
        context: 'proposalRoutes',
        details: { taskId, stack: error.stack, user: req.user?.email },
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
  })
);

module.exports = router;
