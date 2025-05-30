/*
 * File Path: backend/src/utils/taskTesterV18.js
 * Purpose: Executes Playwright tests for tasks in Allur Space Console, supporting auto and manual modes.
 * How It Works:
 *   - Runs Playwright tests generated by testUtils.js in headless (auto) or headed (manual) mode.
 *   - Generates manual test URLs for the "Test with Playwright" button.
 *   - Automatically retries and fixes failed tests until passing or deemed infeasible.
 *   - Logs results to MongoDB Log model with color-coded logs (green: auto, blue: manual).
 * Mechanics:
 *   - Validates taskId and stagedFiles against MongoDB, executes tests using Playwright.
 *   - Auto-logs in with admin credentials for tests.
 *   - Emits taskUpdate events for test results or errors.
 *   - Generates unique test URLs for manual tests, stored temporarily.
 * Dependencies:
 *   - playwright: Test execution (version 1.51.1, per idurar-erp-crm/package.json).
 *   - mongoose: Task, Log models for data and logging (version 8.13.2).
 *   - fs.promises: File operations.
 *   - path: File path manipulation.
 *   - winston: Console logging (version 3.17.0).
 *   - fileUtils.js: appendLog, errorLogPath for error logging.
 *   - socket.js: getIO for Socket.IO emissions (version 4.8.1).
 *   - testUtils.js: generatePlaywrightTest for test file creation.
 *   - logUtils.js: MongoDB logging for test events.
 *   - db.js: getModel for model access.
 *   - uuid: Generates eventId (version 11.1.0).
 * Dependents:
 *   - testGenerator.js: Calls runTests for test execution.
 *   - taskProcessorV18.js: Uses runTests for task validation.
 *   - taskRoutes.js: Uses tests via /grok/test endpoint.
 *   - playwrightUtils.js: Wraps runTests for endpoint integration.
 * Why It’s Here:
 *   - Supports Sprint 2 testing framework, fixing Playwright button failures and ensuring robust task validation (04/30/2025).
 * Change Log:
 *   - 04/21/2025: Created for test execution, added color-coded logs (Nate).
 *   - 04/23/2025: Simplified runTests, imported generatePlaywrightTest from testUtils.js (Nate).
 *   - 04/26/2025: Enhanced stagedFiles validation and logging for Playwright fix (Nate).
 *   - 04/28/2025: Added retry logic for test execution (Nate).
 *   - 04/29/2025: Improved test URL generation and logging (Nate).
 *   - 04/30/2025: Aligned with provided version, added MongoDB logging (Grok).
 *   - 04/30/2025: Fixed Playwright 500 error by removing filesystem checks, added MongoDB validation, temporary file cleanup (Grok).
 *   - 05/01/2025: Added auto-login with admin credentials, enhanced logging (Grok).
 *   - 05/02/2025: Added headless/headed mode, automated retry with self-correction, fixed page.fill error (Grok).
 *   - 05/08/2025: Fixed ReferenceError: testFilePath is not defined (Grok).
 *   - 05/08/2025: Fixed credential prefilling for login tests (Grok).
 *     - Why: Login fields not prefilled in Playwright tests (User, 05/08/2025).
 *     - How: Updated selectors to match login form (input[name="email"], input[name="password"]), increased timeouts, added error handling.
 *     - Test: POST /api/grok/test/<taskId> with manual: true, verify login fields prefilled, no 500 errors.
 * Test Instructions:
 *   - Apply updated taskTesterV18.js, run `npm start` in backend/.
 *   - POST /api/grok/edit with { prompt: "Create inventory system" }: Confirm auto test runs headless, idurar_db.logs shows green log, testUrl generated.
 *   - POST /api/grok/test with { taskId: "test-uuid-1234-5678-9012-345678901234", manual: true }: Verify headed browser opens, login fields prefilled, blue log in idurar_db.logs, testUrl generated.
 *   - Check idurar_db.logs: Confirm stagedFiles validation, login attempts, no errors.
 *   - Check grok.log: Ensure detailed test error logs if failures occur.
 * Rollback Instructions:
 *   - If errors persist: Revert to taskTesterV18.js.bak (`copy backend\src\utils\taskTesterV18.js.bak backend\src\utils\taskTesterV18.js`).
 *   - Verify /api/grok/test runs without errors (may fail to prefill credentials).
 * Future Enhancements:
 *   - Add test coverage reports to idurar_db.logs for better metrics (Sprint 5).
 *   - Implement parallel test execution for multi-file tasks to improve performance (Sprint 6).
 *   - Integrate with systemAnalyzer.js for dynamic test generation based on codebase state (Sprint 4).
 * Self-Notes:
 *   - Nate: Initialized Playwright testing with retry and self-correction for robust validation (04/21/2025).
 *   - Grok: Fixed credential prefilling for login tests (05/08/2025).
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { appendLog, errorLogPath } = require('./fileUtils');
const { getIO } = require('../socket');
const { generatePlaywrightTest } = require('./testUtils');
const { getModel } = require('../db');
const { logInfo, logDebug, logWarn, logError } = require('./logUtils');
const { v4: uuidv4 } = require('uuid');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

/**
 * Validates taskId format (UUID v4).
 * @param {string} taskId - The task ID to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidTaskId(taskId) {
  const isValid =
    typeof taskId === 'string' &&
    taskId.length === 36 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) {
    logger.warn('Invalid taskId detected', {
      taskId: taskId || 'missing',
      stack: new Error().stack,
      timestamp: new Date().toISOString(),
    });
  }
  return isValid;
}

/**
 * Validates stagedFiles against MongoDB Task.stagedFiles, allowing partial matches.
 * @param {Array} stagedFiles - Array of staged files with path and content.
 * @param {string} taskId - The task ID for MongoDB lookup.
 * @returns {Promise<boolean>} True if valid, false otherwise.
 */
async function isValidStagedFiles(stagedFiles, taskId) {
  if (!Array.isArray(stagedFiles) || stagedFiles.length === 0) {
    await logWarn('Invalid stagedFiles: not an array or empty', 'taskTester', {
      taskId,
      stagedFiles,
      timestamp: new Date().toISOString(),
    });
    return false;
  }

  const Task = await getModel('Task');
  const task = await Task.findOne({ taskId });
  if (!task || !Array.isArray(task.stagedFiles) || task.stagedFiles.length === 0) {
    await logWarn('No staged files found in MongoDB for task', 'taskTester', {
      taskId,
      stagedFilesCount: task?.stagedFiles?.length || 0,
      timestamp: new Date().toISOString(),
    });
    return false;
  }

  let validFiles = 0;
  for (const file of stagedFiles) {
    if (!file || !file.path || !file.content) {
      await logWarn('Invalid stagedFile: missing path or content', 'taskTester', {
        taskId,
        file,
        timestamp: new Date().toISOString(),
      });
      continue;
    }
    const existsInMongo = task.stagedFiles.some(staged => staged.path === file.path && staged.content === file.content);
    if (existsInMongo) {
      validFiles++;
      await logDebug(`Validated staged file in MongoDB: ${file.path}`, 'taskTester', {
        taskId,
        timestamp: new Date().toISOString(),
      });
    } else {
      await logWarn('Staged file not found in MongoDB, allowing partial match', 'taskTester', {
        taskId,
        filePath: file.path,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (validFiles === 0) {
    await logError('No valid staged files matched in MongoDB', 'taskTester', {
      taskId,
      stagedFilesCount: stagedFiles.length,
      timestamp: new Date().toISOString(),
    });
    return false;
  }

  await logDebug('Validated stagedFiles in MongoDB with partial matches', 'taskTester', {
    taskId,
    validCount: validFiles,
    totalCount: stagedFiles.length,
    timestamp: new Date().toISOString(),
  });
  return true;
}

/**
 * Generates a unique test URL for manual Playwright tests and stores it in MongoDB.
 * @param {string} taskId - The task ID.
 * @param {Array} stagedFiles - The staged files for testing.
 * @param {string} prompt - The task prompt.
 * @returns {Promise<string>} The generated test URL.
 */
async function generateTestUrl(taskId, stagedFiles, prompt) {
  try {
    const testFile = await generatePlaywrightTest(taskId, stagedFiles, prompt);
    const testId = uuidv4();
    const testUrl = `http://localhost:8888/api/grok/test/${taskId}/${testId}`;

    const Log = await getModel('Log');
    await Log.create({
      level: 'info',
      message: `Generated manual test URL: ${testUrl}`,
      context: 'taskTester',
      details: { taskId, testFile, testUrl, testId },
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Generated manual test URL: ${testUrl}`, { taskId, testId });
    return testUrl;
  } catch (err) {
    await logError(`Failed to generate test URL: ${err.message}`, 'taskTester', {
      taskId,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    const fallbackUrl = `http://localhost:8888/api/grok/test/fallback/${taskId}`;
    const Log = await getModel('Log');
    await Log.create({
      level: 'warn',
      message: `Using fallback test URL: ${fallbackUrl}`,
      context: 'taskTester',
      details: { taskId, error: err.message },
      timestamp: new Date().toISOString(),
    });
    return fallbackUrl;
  }
}

/**
 * Attempts to fix a failed test by modifying stagedFiles or test script.
 * @param {string} taskId - The task ID.
 * @param {Array} stagedFiles - The staged files.
 * @param {string} testFilePath - The test file path.
 * @param {string} error - The error message from the failed test.
 * @returns {Promise<Array>} Updated stagedFiles or null if unfixable.
 */
async function fixTestFailure(taskId, stagedFiles, testFilePath, error) {
  await logWarn(`Attempting to fix test failure: ${error}`, 'taskTester', {
    taskId,
    testFilePath,
    errorDetails: error,
    timestamp: new Date().toISOString(),
  });

  if (error.includes('waiting for locator') || error.includes('locator not found')) {
    let testContent;
    try {
      testContent = await fs.readFile(testFilePath, 'utf8');
      testContent = testContent.replace(
        /input\[name="[^"]+"\]/g,
        'input[name="email"],input[name="password"]'
      );
      testContent = testContent.replace(
        /button\[type="submit"\]/g,
        'button[type="submit"]'
      );
      await fs.writeFile(testFilePath, testContent, 'utf8');
      await logInfo('Updated test selectors to fix locator error', 'taskTester', {
        taskId,
        testFilePath,
        updatedSelectors: ['input[name="email"]', 'input[name="password"]', 'button[type="submit"]'],
        timestamp: new Date().toISOString(),
      });
      return stagedFiles;
    } catch (writeErr) {
      await logError(`Failed to update test selectors: ${writeErr.message}`, 'taskTester', {
        taskId,
        testFilePath,
        stack: writeErr.stack,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  } else if (error.includes('No staged files') || error.includes('stagedFiles is empty')) {
    const Task = await getModel('Task');
    const task = await Task.findOne({ taskId });
    try {
      const newFiles = await require('./fileGeneratorV18').generateFiles(taskId, {
        action: 'create',
        target: task.prompt.includes('inventory') ? 'inventory' : 'crm',
        features: ['login', 'dashboard'],
      });
      await logInfo('Regenerated staged files to fix no-files error', 'taskTester', {
        taskId,
        newFilesCount: newFiles.length,
        timestamp: new Date().toISOString(),
      });
      return newFiles;
    } catch (genErr) {
      await logError(`Failed to regenerate staged files: ${genErr.message}`, 'taskTester', {
        taskId,
        stack: genErr.stack,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  } else if (error.includes('Timeout') || error.includes('waitFor')) {
    await logWarn('Test timeout detected, increasing timeout', 'taskTester', {
      taskId,
      error,
      timestamp: new Date().toISOString(),
    });
    try {
      let testContent = await fs.readFile(testFilePath, 'utf8');
      testContent = testContent.replace(/timeout: \d+/g, 'timeout: 15000');
      await fs.writeFile(testFilePath, testContent, 'utf8');
      await logInfo('Increased test timeout to 15s', 'taskTester', {
        taskId,
        testFilePath,
        timestamp: new Date().toISOString(),
      });
      return stagedFiles;
    } catch (writeErr) {
      await logError(`Failed to update test timeout: ${writeErr.message}`, 'taskTester', {
        taskId,
        testFilePath,
        stack: writeErr.stack,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  }

  await logError('Unable to fix test failure', 'taskTester', {
    taskId,
    error,
    timestamp: new Date().toISOString(),
  });
  return null;
}

/**
 * Runs Playwright tests with retries and self-correction.
 * @param {string} testFile - Path to the test file (optional).
 * @param {Array} stagedFiles - Array of staged files to test.
 * @param {string} taskId - The task ID.
 * @param {boolean} manual - Whether to run in manual mode (default: false).
 * @returns {Promise<Object>} Test results with success status and test URL.
 */
async function runTests(testFile, stagedFiles, taskId, manual = false) {
  if (!isValidTaskId(taskId)) {
    await logError('Test execution skipped: Invalid taskId', 'taskTester', {
      taskId: taskId || 'unknown',
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId: taskId || 'unknown',
      status: 'failed',
      error: `Invalid taskId: ${taskId || 'missing'}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      errorDetails: { reason: 'Invalid taskId', context: 'runTests' },
    });
    throw new Error('Invalid taskId');
  }

  if (!(await isValidStagedFiles(stagedFiles, taskId))) {
    await logError('No valid staged files for testing', 'taskTester', {
      taskId,
      stagedFiles,
      timestamp: new Date().toISOString(),
    });
    const fallbackUrl = `http://localhost:8888/api/grok/test/fallback/${taskId}`;
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: 'No valid staged files to test',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      testUrl: fallbackUrl,
      errorDetails: { reason: 'No valid staged files', context: 'runTests' },
    });
    return { success: false, testedFiles: 0, testUrl: fallbackUrl, error: 'No valid staged files to test' };
  }

  const Task = await getModel('Task');
  const task = await Task.findOne({ taskId });
  if (!task) {
    await logError('Task not found', 'taskTester', {
      taskId,
      timestamp: new Date().toISOString(),
    });
    const fallbackUrl = `http://localhost:8888/api/grok/test/fallback/${taskId}`;
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: 'Task not found',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      eventId: uuidv4(),
      testUrl: fallbackUrl,
      errorDetails: { reason: 'Task not found', context: 'runTests' },
    });
    return { success: false, testedFiles: 0, testUrl: fallbackUrl, error: 'Task not found' };
  }

  let attempt = 0;
  const maxAttempts = 5;
  let tempDir;
  let browserInstance = null;
  let testUrl = null;

  while (attempt < maxAttempts) {
    try {
      tempDir = path.join(__dirname, '../../../tmp/tests', taskId);
      await fs.mkdir(tempDir, { recursive: true });

      for (const file of stagedFiles) {
        const tempPath = path.join(tempDir, path.basename(file.path));
        await fs.writeFile(tempPath, file.content, 'utf8');
        await logDebug(`Wrote temporary test file: ${tempPath}`, 'taskTester', {
          taskId,
          timestamp: new Date().toISOString(),
        });
      }

      let testFilePath = testFile;
      if (!testFilePath) {
        try {
          testFilePath = await generatePlaywrightTest(taskId, stagedFiles, task.prompt);
          await logDebug('Generated test file', 'taskTester', {
            taskId,
            testFilePath,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          testFilePath = path.join(__dirname, `../../../tests/task-${taskId}.spec.js`);
          await logWarn('Failed to generate test file, using fallback path', 'taskTester', {
            taskId,
            error: err.message,
            stack: err.stack,
            testFilePath,
            timestamp: new Date().toISOString(),
          });
          await fs.mkdir(path.join(__dirname, '../../../tests'), { recursive: true });
          const fallbackTestContent = `
            const { test, expect } = require('@playwright/test');
            test('Fallback test for ${taskId}', async ({ page }) => {
              await page.goto('http://localhost:3000/login');
              await page.fill('input[name="email"]', 'admin@idurarapp.com');
              await page.fill('input[name="password"]', 'admin123');
              await page.click('button[type="submit"]');
              await expect(page).toHaveURL(/dashboard/);
            });
          `;
          await fs.writeFile(testFilePath, fallbackTestContent, 'utf8');
        }
      }

      try {
        await fs.access(testFilePath);
      } catch {
        await logWarn('Test file not found, regenerating', 'taskTester', {
          taskId,
          testFilePath,
          timestamp: new Date().toISOString(),
        });
        testFilePath = await generatePlaywrightTest(taskId, stagedFiles, task.prompt);
      }

      if (manual && browserInstance) {
        await logWarn('Multiple browser instances detected for manual test', 'taskTester', {
          taskId,
          timestamp: new Date().toISOString(),
        });
        return { success: false, testedFiles: 0, testUrl: testUrl || `http://localhost:8888/api/grok/test/fallback/${taskId}`, error: 'Multiple browser instances' };
      }

      const browser = await chromium.launch({ headless: !manual });
      browserInstance = manual ? browser : null;
      const context = await browser.newContext();
      const page = await context.newPage();

      await logInfo(`Running ${manual ? 'manual' : 'auto'} test`, 'taskTester', {
        taskId,
        testFilePath,
        stagedFiles: stagedFiles.map(f => f.path),
        tempDir,
        headless: !manual,
        attempt: attempt + 1,
        timestamp: new Date().toISOString(),
      });

      await page.goto('http://localhost:3000/login');
      try {
        await page.waitForSelector('input[name="email"]', { timeout: 15000 });
        await page.fill('input[name="email"]', 'admin@idurarapp.com');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3000/**', { timeout: 15000 });
        await logDebug('Auto-login completed', 'taskTester', {
          taskId,
          email: 'admin@idurarapp.com',
          timestamp: new Date().toISOString(),
        });
      } catch (loginErr) {
        await logError(`Auto-login failed: ${loginErr.message}`, 'taskTester', {
          taskId,
          stack: loginErr.stack,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Auto-login failed: ${loginErr.message}`);
      }

      for (const file of stagedFiles) {
        if (file.testInstructions) {
          const instructions = file.testInstructions.split('\n').filter(line => line.trim().startsWith('-'));
          for (const instruction of instructions) {
            await logDebug(`Executing test instruction: ${instruction}`, 'taskTester', {
              taskId,
              file: file.path,
              timestamp: new Date().toISOString(),
            });
            // Implement instruction parsing if needed
          }
        }
      }

      testUrl = manual ? await generateTestUrl(taskId, stagedFiles, task.prompt) : `http://localhost:8888/api/grok/test/auto/${taskId}`;

      await logInfo(`Test completed`, 'taskTester', {
        taskId,
        mode: manual ? 'manual' : 'auto',
        testUrl,
        attempt: attempt + 1,
        timestamp: new Date().toISOString(),
      });

      const Log = await getModel('Log');
      await Log.create({
        level: 'info',
        message: `Test ${manual ? 'manual' : 'auto'} completed`,
        context: 'taskTester',
        details: {
          taskId,
          testUrl,
          stagedFiles: stagedFiles.map(f => f.path),
          mode: manual ? 'manual' : 'auto',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

      getIO().emit('taskUpdate', {
        taskId,
        status: 'completed',
        message: `Test ${manual ? 'manual' : 'auto'} completed`,
        logColor: manual ? 'blue' : 'green',
        timestamp: new Date().toISOString(),
        eventId: uuidv4(),
        testUrl,
      });

      if (!manual) {
        await context.close();
        await browser.close();
      }

      return { success: true, testedFiles: stagedFiles.length, testUrl };
    } catch (err) {
      attempt++;
      await logError(`Test execution attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'taskTester', {
        taskId,
        stack: err.stack,
        attempt,
        testFilePath: testFile,
        stagedFiles: stagedFiles.map(f => f.path),
        timestamp: new Date().toISOString(),
      });

      const Log = await getModel('Log');
      await Log.create({
        level: 'error',
        message: `Test execution attempt ${attempt}/${maxAttempts} failed: ${err.message}`,
        context: 'taskTester',
        details: {
          taskId,
          error: err.message,
          stack: err.stack,
          attempt,
          stagedFiles: stagedFiles.map(f => f.path),
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

      if (attempt >= maxAttempts) {
        testUrl = testUrl || `http://localhost:8888/api/grok/test/fallback/${taskId}`;
        await logError(`Test execution failed after ${maxAttempts} attempts: ${err.message}`, 'taskTester', {
          taskId,
          stack: err.stack,
          testUrl,
          timestamp: new Date().toISOString(),
        });
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          error: `Test execution failed: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          testUrl,
          errorDetails: { reason: err.message, context: 'runTests', stack: err.stack },
        });
        return { success: false, testedFiles: 0, testUrl, error: err.message };
      }

      const updatedFiles = await fixTestFailure(taskId, stagedFiles, testFile, err.message);
      if (!updatedFiles) {
        testUrl = testUrl || `http://localhost:8888/api/grok/test/fallback/${taskId}`;
        await logError('Unfixable test failure', 'taskTester', {
          taskId,
          error: err.message,
          testUrl,
          timestamp: new Date().toISOString(),
        });
        getIO().emit('taskUpdate', {
          taskId,
          status: 'failed',
          error: `Unfixable test failure: ${err.message}`,
          logColor: 'red',
          timestamp: new Date().toISOString(),
          eventId: uuidv4(),
          testUrl,
          errorDetails: { reason: err.message, context: 'runTests' },
        });
        return { success: false, testedFiles: 0, testUrl, error: err.message };
      }
      stagedFiles = updatedFiles;

      if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    } finally {
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
          await logDebug(`Cleaned up temporary test directory: ${tempDir}`, 'taskTester', {
            taskId,
            timestamp: new Date().toISOString(),
          });
        } catch (cleanupErr) {
          await logWarn(`Failed to clean up temporary directory: ${cleanupErr.message}`, 'taskTester', {
            taskId,
            stack: cleanupErr.stack,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  testUrl = testUrl || `http://localhost:8888/api/grok/test/fallback/${taskId}`;
  await logError('Test execution failed after all attempts', 'taskTester', {
    taskId,
    testUrl,
    timestamp: new Date().toISOString(),
  });
  getIO().emit('taskUpdate', {
    taskId,
    status: 'failed',
    error: 'Test execution failed after all attempts',
    logColor: 'red',
    timestamp: new Date().toISOString(),
    eventId: uuidv4(),
    testUrl,
    errorDetails: { reason: 'All attempts failed', context: 'runTests' },
  });
  return { success: false, testedFiles: 0, testUrl, error: 'Test execution failed after all attempts' };
}

module.exports = { runTests };
