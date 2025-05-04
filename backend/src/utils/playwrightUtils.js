/*
 * File Path: backend/src/utils/playwrightUtils.js
 * Purpose: Provides utility functions for Playwright test execution in Allur Space Console.
 * How It Works:
 *   - Wraps taskTesterV18.js functionality for running Playwright tests in auto or manual modes.
 *   - Generates test URLs for manual and automated tests, returning them for UI display.
 *   - Logs test results to idurar_db.logs and emits taskUpdate events.
 * Mechanics:
 *   - `runPlaywrightTests`: Executes tests, validates inputs, and returns results with test URL.
 *   - `generateTestUrl`: Generates URLs for manual tests, used internally by runPlaywrightTests.
 * Dependencies:
 *   - taskTesterV18.js: Core test execution logic (version 1.48.1).
 *   - logUtils.js: MongoDB logging for test events.
 *   - socket.js: Socket.IO for real-time taskUpdate events.
 *   - uuid: Generates unique eventId for Socket.IO (version 11.1.0).
 * Dependents:
 *   - taskRoutes.js: Uses for /api/grok/test endpoint.
 *   - proposalRoutes.js: Uses for /api/grok/test endpoint.
 * Why It’s Here:
 *   - Created to resolve MODULE_NOT_FOUND error in taskRoutes.js and support Playwright testing (04/29/2025).
 * Change Log:
 *   - 04/29/2025: Created to wrap taskTesterV18.js, fixing server crash (Nate).
 *   - 05/03/2025: Added test URL generation and taskUpdate emission (Nate).
 *   - 04/30/2025: Aligned with provided version, enhanced logging (Grok).
 *   - 05/02/2025: Added testUrl for automated tests (Grok).
 *     - Why: Playwright button disabled due to missing testUrl (User, 05/02/2025).
 *     - How: Generated testUrl for all test modes, updated taskUpdate emission.
 *     - Test: POST /api/grok/test, verify testUrl in response, button enabled in TaskList.jsx.
 * Test Instructions:
 *   - Run `npm start`, POST /api/grok/test with { taskId, manual: true }.
 *   - Verify test runs, blue log in idurar_db.logs, test URL in response.
 *   - POST /api/grok/test with { taskId, manual: false }, verify test URL, green log.
 *   - Check TaskList.jsx: Confirm Playwright button enabled with testUrl.
 * Rollback Instructions:
 *   - Revert to playwrightUtils.js.bak (`mv backend/src/utils/playwrightUtils.js.bak backend/src/utils/playwrightUtils.js`).
 *   - Verify /api/grok/test works post-rollback (may lack testUrl for auto tests).
 * Future Enhancements:
 *   - Add test coverage reporting (Sprint 5).
 *   - Store test URLs in MongoDB (Sprint 4).
 */

const { runTests } = require('./taskTesterV18');
const { logInfo, logError } = require('./logUtils');
const { getIO } = require('../socket');
const { v4: uuidv4 } = require('uuid');

/**
 * Runs Playwright tests for a task, supporting auto or manual modes.
 * @param {string} taskId - The task ID.
 * @param {Array} stagedFiles - The staged files to test.
 * @param {string} prompt - The task prompt.
 * @param {boolean} manual - Whether to run in manual mode (default: false).
 * @returns {Promise<Object>} Test results with success status and test URL.
 */
async function runPlaywrightTests(taskId, stagedFiles, prompt, manual = false) {
  try {
    if (!taskId || !stagedFiles || !Array.isArray(stagedFiles) || !prompt) {
      throw new Error('Invalid inputs: taskId, stagedFiles, and prompt are required');
    }

    await logInfo(`Initiating ${manual ? 'manual' : 'auto'} Playwright test`, 'playwrightUtils', {
      taskId,
      stagedFilesCount: stagedFiles.length,
      prompt,
      timestamp: new Date().toISOString(),
    });

    const result = await runTests(null, stagedFiles, taskId, manual);
    const testUrl = `http://localhost:8888/api/grok/test/${taskId}/${uuidv4()}`; // Generate testUrl for all tests

    await logInfo(`Playwright test completed`, 'playwrightUtils', {
      taskId,
      success: result.success,
      testUrl,
      timestamp: new Date().toISOString(),
    });

    getIO().emit('taskUpdate', {
      taskId,
      status: 'tested',
      message: `Test ${manual ? 'manual' : 'auto'} completed`,
      logColor: manual ? 'blue' : 'green',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      testUrl,
    });

    return { ...result, testUrl };
  } catch (err) {
    await logError(`Playwright test failed: ${err.message}`, 'playwrightUtils', {
      taskId,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: `Playwright test failed: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      errorDetails: { reason: err.message, context: 'runPlaywrightTests' },
    });

    throw err;
  }
}

/**
 * Generates a test URL for manual Playwright tests.
 * @param {string} taskId - The task ID.
 * @param {Array} stagedFiles - The staged files for testing.
 * @param {string} prompt - The task prompt.
 * @returns {Promise<string>} The generated test URL.
 */
async function generateTestUrl(taskId, stagedFiles, prompt) {
  try {
    if (!taskId || !stagedFiles || !Array.isArray(stagedFiles) || !prompt) {
      throw new Error('Invalid inputs: taskId, stagedFiles, and prompt are required');
    }

    const result = await runTests(null, stagedFiles, taskId, true);
    const testUrl = `http://localhost:8888/api/grok/test/${taskId}/${uuidv4()}`; // Consistent URL format

    await logInfo(`Generated manual test URL: ${testUrl}`, 'playwrightUtils', {
      taskId,
      timestamp: new Date().toISOString(),
    });

    return testUrl;
  } catch (err) {
    await logError(`Failed to generate test URL: ${err.message}`, 'playwrightUtils', {
      taskId,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    throw err;
  }
}

module.exports = { runPlaywrightTests, generateTestUrl };
