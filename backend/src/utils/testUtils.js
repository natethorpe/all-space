/*
 * File Path: backend/src/utils/testUtils.js
 * Purpose: Generates Playwright test files for tasks in Allur Space Console.
 * How It Works:
 *   - Creates test files (e.g., task-${taskId}.spec.js) with dynamic assertions based on task prompt and stagedFiles.
 *   - Logs assertions to grok.log and MongoDB Log model for debugging.
 * Mechanics:
 *   - Validates taskId and stagedFiles, generates test content tailored to prompt.
 *   - Supports complex tasks (e.g., CRM system) with specific assertions.
 * Dependencies:
 *   - fs.promises: File operations (Node.js built-in).
 *   - path: File path manipulation (Node.js built-in).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - fileUtils.js: appendLog, errorLogPath.
 *   - socket.js: getIO for Socket.IO.
 *   - mongoose: Log model for logging.
 *   - logUtils.js: MongoDB logging.
 *   - db.js: getModel for model access.
 * Why It’s Here:
 *   - Modularizes test generation to fix circular dependency for Sprint 2 (04/23/2025).
 * Change Log:
 *   - 04/23/2025: Created to house generatePlaywrightTest from testGenerator.js (Nate).
 *   - 04/30/2025: Aligned with provided version, enhanced logging (Grok).
 *     - Why: Ensure compatibility, improve traceability (User, 04/30/2025).
 *     - How: Incorporated provided logic, added MongoDB logging via logUtils.js.
 * Test Instructions:
 *   - Run `npm start`, POST /grok/edit with "Build CRM system with payroll": Confirm test file in tests/, includes CRM and payroll assertions.
 *   - POST /grok/test with { taskId, manual: true }: Verify browser opens, tests run, blue log in LiveFeed.jsx.
 *   - Check idurar_db.logs: Confirm test file generation logs, no filesystem writes.
 * Rollback Instructions:
 *   - Revert to testUtils.js.bak (`mv backend/src/utils/testUtils.js.bak backend/src/utils/testUtils.js`).
 *   - Verify test file generation post-rollback.
 * Future Enhancements:
 *   - Support custom assertions (Sprint 6).
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { appendLog, errorLogPath } = require('./fileUtils');
const { getIO } = require('../socket');
const { getModel } = require('../db');
const { logInfo, logWarn, logError } = require('./logUtils');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

function isValidTaskId(taskId) {
  const isValid = typeof taskId === 'string' && taskId.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
  if (!isValid) logger.warn(`Invalid taskId detected`, { taskId: taskId || 'missing', stack: new Error().stack });
  return isValid;
}

async function generatePlaywrightTest(taskId, stagedFiles, prompt) {
  const Log = await getModel('Log');
  if (!isValidTaskId(taskId)) {
    await logError(`Invalid taskId provided`, 'testUtils', { taskId: taskId || 'missing', timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId: taskId || 'unknown',
      status: 'failed',
      error: `Invalid taskId: ${taskId || 'missing'}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'generatePlaywrightTest' },
    });
    throw new Error('Invalid taskId');
  }

  if (!stagedFiles || !Array.isArray(stagedFiles) || stagedFiles.length === 0) {
    await logWarn(`No staged files provided`, 'testUtils', { taskId, timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: 'No files to test',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'No staged files', context: 'generatePlaywrightTest' },
    });
    throw new Error('No files to test');
  }

  const lowerPrompt = prompt.toLowerCase();
  let assertions = [];
  let testContent = `
    const { test, expect } = require('@playwright/test');
    test('Task ${taskId}', async ({ page }) => {
  `;

  if (lowerPrompt.includes('crm system') || lowerPrompt.includes('entire crm')) {
    testContent += `
      await page.goto('http://localhost:3000/login');
      await expect(page.locator('form')).toBeVisible();
      await page.goto('http://localhost:3000/dashboard');
      await expect(page.locator('nav')).toBeVisible();
      await page.goto('http://localhost:3000/sponsor/1');
      await expect(page.locator('.sponsor-profile')).toBeVisible();
      await page.goto('http://localhost:3000/employee-log');
      await expect(page.locator('button.add-employee')).toBeVisible();
      await page.goto('http://localhost:3000/settings');
      await expect(page.locator('.settings')).toBeVisible();
    `;
    assertions = [
      'Login form visible',
      'Dashboard navigation visible',
      'Sponsor profile visible',
      'Employee log add button visible',
      'Settings UI visible',
    ];
  } else if (lowerPrompt.includes('mfa') && lowerPrompt.includes('login')) {
    testContent += `
      await page.goto('http://localhost:3000/login');
      await expect(page.locator('.mfa-component')).toBeVisible();
      await page.fill('input[name="mfa-code"]', '123456');
      await page.click('button.mfa-submit');
      await expect(page.locator('text=Login successful')).toBeVisible();
    `;
    assertions = [
      'MFA component visible',
      'MFA code input functional',
      'Login successful after MFA',
    ];
  } else if (lowerPrompt.includes('payroll') && lowerPrompt.includes('employee')) {
    testContent += `
      await page.goto('http://localhost:3000/employee-log');
      await expect(page.locator('button.add-employee')).toBeVisible();
      await page.click('button.add-employee');
      await page.fill('input[name="name"]', 'John Doe');
      await page.fill('input[name="payroll"]', '5000');
      await page.click('button.clock-in');
      await expect(page.locator('text=John Doe')).toBeVisible();
      await expect(page.locator('text=$5000')).toBeVisible();
    `;
    assertions = [
      'Add employee button visible',
      'Employee name input functional',
      'Payroll input functional',
      'Employee and payroll data displayed',
    ];
  } else if (lowerPrompt.includes('ai') && lowerPrompt.includes('employee')) {
    testContent += `
      await page.goto('http://localhost:3000/employee-log');
      await expect(page.locator('.ai-prediction')).toBeVisible();
      await page.click('button.predict-hours');
      await expect(page.locator('text=Predicted')).toBeVisible();
    `;
    assertions = [
      'AI prediction component visible',
      'Predict hours button functional',
      'Prediction output displayed',
    ];
  } else {
    const targetPage = lowerPrompt.includes('login') ? 'login' : 'grok';
    testContent += `
      await page.goto('http://localhost:3000/${targetPage}');
      await expect(page.locator('body')).toBeVisible();
    `;
    assertions = ['Page body visible'];
  }

  testContent += `
    });
  `;

  const testFilePath = path.join(__dirname, `../../../tests/task-${taskId}.spec.js`);
  try {
    await fs.writeFile(testFilePath, testContent, 'utf8');
    await logInfo(`Generated test file`, 'testUtils', {
      taskId,
      testFilePath,
      assertions,
      timestamp: new Date().toISOString(),
    });
    await appendLog(errorLogPath, `# Test File Generated\nTask ID: ${taskId}\nFile: ${testFilePath}\nAssertions: ${assertions.join(', ')}`);
  } catch (err) {
    await logError(`Failed to generate test file: ${err.message}`, 'testUtils', {
      taskId,
      testFilePath,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: `Failed to generate test file: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: err.message, context: 'generatePlaywrightTest', testFilePath, stack: err.stack },
    });
    await appendLog(errorLogPath, `# Test File Generation Error\nTask ID: ${taskId}\nFile: ${testFilePath}\nDescription: ${err.message}\nStack: ${err.stack}`);
    throw err;
  }

  return testFilePath;
}

module.exports = { generatePlaywrightTest };
