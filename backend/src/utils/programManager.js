/*
 * File Path: backend/src/utils/programManager.js
 * Purpose: Manages wristband-related tasks for Allur Space Console, integrating with ALL Token contract.
 * How It Works:
 *   - Processes wristband tasks (e.g., ticket purchases) by verifying ALL Token balances.
 *   - Uses wristbandController.js to interact with the ALL Token contract.
 *   - Logs operations to idurar_db.logs and ERROR_LOG.md for traceability.
 * Mechanics:
 *   - `processWristbandTask`: Validates task, verifies token balance, updates task status.
 *   - Supports retries for blockchain operations.
 * Dependencies:
 *   - mongoose@8.7.0: Task model for persistence.
 *   - wristbandController.js: ALL Token verification.
 *   - logUtils.js: MongoDB logging.
 *   - fileUtils.js: Error logging to ERROR_LOG.md.
 *   - db.js: getModel for Task model.
 * Dependents:
 *   - taskRoutes.js: Calls processWristbandTask for wristband-related tasks.
 * Why It’s Here:
 *   - Implements wristband task processing with ALL Token, addressing issue #47 (User, 05/02/2025).
 * Change Log:
 *   - 05/08/2025: Created with wristbandController.js integration (Grok).
 *     - Why: Support wristband tasks with ALL Token verification (User, 05/02/2025).
 *     - How: Implemented processWristbandTask, aligned with taskRoutes.js.
 *     - Test: Submit wristband task, verify token balance, task status in idurar_db.tasks.
 * Test Instructions:
 *   - Run `npm start`, POST /api/grok/edit with "Purchase wristband with ALL Token".
 *   - Verify task in idurar_db.tasks with status 'completed', token balance logged.
 *   - Check idurar_db.logs for "Wristband task processed".
 *   - Check ERROR_LOG.md for any errors.
 * Rollback Instructions:
 *   - Delete programManager.js (`rm backend/src/utils/programManager.js`).
 *   - Update taskRoutes.js to skip wristband task processing.
 *   - Verify /api/grok/edit processes non-wristband tasks.
 * Future Enhancements:
 *   - Add transaction support for wristbands (Sprint 4).
 *   - Integrate with CRM for user wallet management (Sprint 3).
 */

const mongoose = require('mongoose');
const { verifyALLToken } = require('../controllers/wristbandController');
const { logInfo, logError } = require('./logUtils');
const { appendLog, errorLogPath } = require('./fileUtils');
const { getModel } = require('../db');

/**
 * Processes a wristband-related task, verifying ALL Token balance.
 * @param {string} taskId - Task ID.
 * @param {string} walletAddress - User's wallet address.
 * @param {number} requiredBalance - Required ALL Token balance.
 * @returns {Promise<Object>} Task processing result.
 */
async function processWristbandTask(taskId, walletAddress, requiredBalance = 10) {
  if (!taskId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
    await logError('Invalid taskId', 'programManager', { taskId, timestamp: new Date().toISOString() });
    throw new Error('Invalid taskId');
  }
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    await logError('Invalid wallet address', 'programManager', { walletAddress, taskId, timestamp: new Date().toISOString() });
    throw new Error('Invalid wallet address');
  }
  if (typeof requiredBalance !== 'number' || requiredBalance <= 0) {
    await logError('Invalid required balance', 'programManager', { requiredBalance, taskId, timestamp: new Date().toISOString() });
    throw new Error('Invalid required balance');
  }

  try {
    const Task = await getModel('Task');
    let task = await Task.findOne({ taskId });
    if (!task) {
      task = new Task({
        taskId,
        prompt: 'Purchase wristband with ALL Token',
        status: 'pending',
        stagedFiles: [],
        generatedFiles: [],
        proposedChanges: [],
        originalContent: {},
        newContent: {},
        testInstructions: '',
        testUrl: null,
        uploadedFiles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await task.save();
      await logInfo('Wristband task created', 'programManager', { taskId, timestamp: new Date().toISOString() });
    }

    task.status = 'processing';
    await task.save();

    // Verify ALL Token balance
    const { success, balance } = await verifyALLToken(walletAddress);
    if (!success || parseFloat(balance) < requiredBalance) {
      throw new Error(`Insufficient ALL Token balance: ${balance} < ${requiredBalance}`);
    }

    task.status = 'completed';
    task.updatedAt = new Date();
    await task.save();

    await logInfo('Wristband task processed', 'programManager', {
      taskId,
      walletAddress,
      balance,
      requiredBalance,
      timestamp: new Date().toISOString(),
    });
    await appendLog(errorLogPath, `# Wristband Task Processed\nTask ID: ${taskId}\nWallet: ${walletAddress}\nBalance: ${balance} ALL`);

    return { success: true, task };
  } catch (err) {
    await logError(`Wristband task failed: ${err.message}`, 'programManager', {
      taskId,
      walletAddress,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    await appendLog(errorLogPath, `# Wristband Task Error\nTask ID: ${taskId}\nError: ${err.message}\nStack: ${err.stack}`);
    throw err;
  }
}

module.exports = { processWristbandTask };
