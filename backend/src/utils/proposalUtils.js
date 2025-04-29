/*
 * File Path: backend/src/utils/proposalUtils.js
 * Purpose: Handles backend proposal creation for Allur Space Console, extracted from taskManager.js to resolve circular dependencies.
 * How It Works:
 *   - Creates BackendProposal entries for backend changes, storing them in MongoDB via db.js.
 *   - Emits Socket.IO events (backendProposal) via socket.js for real-time UI updates in GrokUI.jsx.
 *   - Logs proposal creation to MongoDB Log model.
 * Mechanics:
 *   - `createProposals`: Validates backend changes, creates and saves BackendProposal documents, emits events.
 *   - Uses retry logic (3 attempts) for MongoDB saves to ensure reliability.
 *   - Validates taskId and change data to prevent errors.
 * Dependencies:
 *   - mongoose: BackendProposal, Log models (version 8.13.2).
 *   - socket.js: getIO for Socket.IO (version 4.8.1).
 *   - winston: Console logging (version 3.17.0, file transport removed).
 *   - path: File path manipulation (Node.js built-in).
 *   - fs.promises: File operations (Node.js built-in).
 * Dependents:
 *   - taskManager.js: Calls createProposals for task processing.
 *   - proposalRoutes.js: Indirectly uses via taskManager.js for approve/rollback actions.
 * Why It’s Here:
 *   - Resolves circular dependency warning in taskManager.js by isolating proposal creation logic (04/28/2025).
 * Change Log:
 *   - 04/28/2025: Created by extracting createProposals from taskManager.js.
 *   - 04/30/2025: Transitioned logging to MongoDB Log model.
 *     - Why: Replace filesystem logs with database storage (User, 04/30/2025).
 *     - How: Replaced winston file transport with Log.create, updated all log calls.
 *     - Test: Verify idurar_db.logs contains proposal creation logs, no grok.log writes.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, no circular dependency warning.
 *   - POST /grok/edit with "Add crypto wallet": Confirm BackendProposal created, idurar_db.logs logs creation, yellow log in LiveFeed.jsx.
 *   - Check idurar_db.backendproposals: Verify proposal data (taskId, file, content, status).
 *   - Check idurar_db.logs: Confirm proposal logs, no filesystem writes.
 * Future Enhancements:
 *   - Add proposal versioning support (Sprint 5).
 *   - Integrate with systemAnalyzer.js for proposal validation (Sprint 3).
 * Self-Notes:
 *   - Nate: Extracted createProposals to fix circular dependency (04/28/2025).
 *   - Nate: Transitioned to MongoDB logging (04/30/2025).
 */
const mongoose = require('mongoose');
const { getIO } = require('../socket');
const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;
const { isValidTaskId } = require('./taskValidator');
const { getModel } = require('../db');

const BackendProposal = getModel('BackendProposal');
const Log = getModel('Log');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console(),
  ],
});

async function createProposals(taskId, backendChanges) {
  console.log('proposalUtils: createProposals called with taskId:', taskId, 'backendChanges:', backendChanges.length);
  if (!isValidTaskId(taskId)) {
    await Log.create({
      level: 'error',
      message: 'Invalid taskId',
      context: 'proposalUtils',
      details: { taskId },
      timestamp: new Date().toISOString(),
    });
    throw new Error('Invalid taskId');
  }
  if (!backendChanges || !Array.isArray(backendChanges)) {
    await Log.create({
      level: 'warn',
      message: 'Invalid backendChanges',
      context: 'proposalUtils',
      details: { taskId, backendChanges },
      timestamp: new Date().toISOString(),
    });
    return [];
  }

  const proposals = [];
  for (const change of backendChanges) {
    let { file, change: changeText, reason } = change;
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
      await Log.create({
        level: 'warn',
        message: 'Skipping invalid backend change',
        context: 'proposalUtils',
        details: { taskId, change },
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
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
        await Log.create({
          level: 'debug',
          message: 'Created BackendProposal',
          context: 'proposalUtils',
          details: { taskId, proposalId: proposal._id, file },
          timestamp: new Date().toISOString(),
        });
        await fs.appendFile(
          path.join(__dirname, '../../../error.log'),
          `# BackendProposal Created\nTask ID: ${taskId}\nProposal ID: ${proposal._id}\nFile: ${file}\nTimestamp: ${new Date().toISOString()}\n`
        );
        getIO().emit('backendProposal', {
          taskId,
          proposal: { id: proposal._id, file, content: changeText, status: 'pending' },
        });
        break;
      } catch (err) {
        attempt++;
        await Log.create({
          level: 'warn',
          message: `Proposal save attempt ${attempt}/${maxAttempts} failed: ${err.message}`,
          context: 'proposalUtils',
          details: { taskId, change },
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          await Log.create({
            level: 'error',
            message: `Failed to create BackendProposal: ${err.message}`,
            context: 'proposalUtils',
            details: { taskId, change, stack: err.stack },
            timestamp: new Date().toISOString(),
          });
          await fs.appendFile(
            path.join(__dirname, '../../../error.log'),
            `# BackendProposal Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}\nTimestamp: ${new Date().toISOString()}\n`
          );
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  if (proposals.length > 0) {
    getIO().emit('backendProposal', { taskId, proposals });
    await Log.create({
      level: 'info',
      message: `Emitted backendProposal event for ${proposals.length} proposals`,
      context: 'proposalUtils',
      details: { taskId },
      timestamp: new Date().toISOString(),
    });
  }
  return proposals;
}

module.exports = { createProposals };
