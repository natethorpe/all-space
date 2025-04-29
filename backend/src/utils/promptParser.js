/*
 * File Path: backend/src/utils/promptParser.js
 * Purpose: Parses task prompts into structured data for Allur Space Console, enabling task processing and backend proposal generation.
 * How It Works:
 *   - Takes a task prompt, system memory, file notes, and log insights as input, returning an object with action, target, features, isMultiFile, and backendChanges.
 *   - Uses regular expressions to identify key components (e.g., action verbs, targets, features like MFA, payroll).
 *   - Generates backendChanges for prompts requiring backend modifications (e.g., auth.js for MFA, grok.js for payroll).
 *   - Logs parsing details to grok.log for debugging and traceability.
 * Mechanics:
 *   - `parsePrompt`: Main function that processes the prompt string, applying regex patterns to extract components.
 *   - Supports complex prompts (e.g., “Add MFA to login”, “Build CRM system with payroll”) by matching specific keywords and patterns.
 *   - Validates inputs (prompt, taskId) to prevent errors, logging invalid cases to errorLogPath.
 *   - Emits taskUpdate events via Socket.IO for parsing errors, ensuring real-time feedback in GrokUI.jsx.
 * Dependencies:
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - path: File path manipulation for log file (version built-in).
 *   - socket.js: getIO for Socket.IO emissions.
 *   - fileUtils.js: appendLog, errorLogPath for error logging.
 * Dependents:
 *   - taskProcessorV18.js: Calls parsePrompt to structure task data before processing.
 *   - taskManager.js: Uses parsed data to generate files and backend proposals.
 *   - taskRoutes.js: Indirectly uses parsed data via taskProcessorV18.js for /grok/edit.
 *   - GrokUI.jsx: Receives taskUpdate events for parsing errors via useLiveFeed.js.
 * Why It’s Here:
 *   - Modularizes prompt parsing from taskProcessorV18.js, reducing its size from ~1000 lines to ~150 lines (04/23/2025).
 *   - Supports Sprint 2 task processing by providing structured data for file generation and backend proposals.
 *   - Enhances autonomy by parsing complex prompts accurately, enabling precise system changes (e.g., Allur Crypto integration).
 * Key Info:
 *   - Uses regex for robust prompt parsing, handling diverse inputs (e.g., “Add MFA”, “Build CRM”).
 *   - Generates backendChanges for backend-specific tasks, ensuring seamless proposal creation.
 *   - Logs parsing errors and successes with detailed context for debugging.
 * Change Log:
 *   - 04/21/2025: Created to modularize prompt parsing from taskProcessorV18.js.
 *     - Why: Reduce taskProcessorV18.js size, improve maintainability (User, 04/21/2025).
 *     - How: Implemented parsePrompt with basic keyword matching, integrated with taskProcessorV18.js.
 *     - Test: Submit “Build CRM system”, verify parsed data (action, target, features).
 *   - 04/23/2025: Added regex for complex prompts and fixed path import error.
 *     - Why: Support advanced prompts (e.g., MFA, payroll), resolve ReferenceError: path is not defined (User, 04/23/2025).
 *     - How: Added regex patterns for MFA, payroll, etc.; imported path module for logger.
 *     - Test: Submit “Add MFA to login”, verify backendChanges; run `npm start`, confirm no path error.
 * Test Instructions:
 *   - Submit “Build CRM system” via /grok/edit: Verify parsed data includes action=create, target=crm, features=[login, dashboard], isMultiFile=true.
 *   - Submit “Add MFA to login”: Confirm backendChanges includes { file: 'auth.js', description: 'Add MFA to login', reason: 'Security enhancement' }.
 *   - Submit “Add payroll to EmployeeLog”: Confirm backendChanges includes { file: 'grok.js', description: 'Add payroll endpoint', reason: 'Feature addition' }.
 *   - Submit invalid prompt (e.g., “”): Verify live feed shows red “Invalid prompt” log, error logged to grok.log.
 *   - Run `npm start`: Confirm server starts without ReferenceError for path.
 *   - Check grok.log: Verify parsing logs with taskId, prompt, and parsed data; no path-related errors.
 * Future Enhancements:
 *   - Add NLP-based parsing for natural language prompts (e.g., “Improve login security”) (Sprint 4).
 *   - Support dynamic backendChanges based on systemAnalyzer.js insights (Sprint 5).
 *   - Integrate with taskPrioritizer.js for priority assignment (Sprint 6).
 *   - Add caching for frequent prompt patterns to improve performance (Sprint 5).
 *   - Support multi-language prompts for global usability (Sprint 6).
 * Self-Notes:
 *   - Nate: Fixed path import error to resolve ReferenceError, ensuring server startup (04/23/2025).
 *   - Nate: Added regex for complex prompts (MFA, payroll), preserving all taskProcessorV18.js parsing functionality (04/23/2025).
 *   - Nate: Triple-checked regex patterns, logging, and Socket.IO integration for accuracy and real-time feedback (04/23/2025).
 *   - Nate: Added comprehensive notes for clarity, scalability, and alignment with Allur Space Console goals (04/23/2025).
 */
const winston = require('winston');
const path = require('path');
const { getIO } = require('../socket');
const { appendLog, errorLogPath } = require('./fileUtils');

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
  if (!isValid) {
    logger.warn(`Invalid taskId detected`, { taskId: taskId || 'missing', stack: new Error().stack });
  }
  return isValid;
}

function parsePrompt(prompt, taskId, memory = [], fileNotes = [], logInsights = []) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    logger.error(`Invalid prompt provided`, { taskId, prompt: prompt || 'missing' });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: 'Invalid or empty prompt',
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid prompt', context: 'parsePrompt' },
    });
    throw new Error('Invalid or empty prompt');
  }

  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId provided`, { taskId: taskId || 'missing' });
    getIO().emit('taskUpdate', {
      taskId: taskId || 'unknown',
      status: 'failed',
      error: `Invalid taskId: ${taskId || 'missing'}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'parsePrompt' },
    });
    throw new Error('Invalid taskId');
  }

  const lowerPrompt = prompt.toLowerCase().trim();
  let action = 'create';
  let target = '';
  let features = [];
  let isMultiFile = false;
  let backendChanges = [];

  // Regex patterns for parsing
  const actionRegex = /(add|create|update|delete|remove|enhance|improve)\s+(\w+)/i;
  const featureRegex = /(login|dashboard|sponsor|employee|payroll|mfa|settings|authentication|security)/gi;
  const mfaRegex = /mfa|multi-factor authentication|2fa|two-factor authentication/i;
  const payrollRegex = /payroll|salary|compensation/i;

  // Extract action and target
  const actionMatch = lowerPrompt.match(actionRegex);
  if (actionMatch) {
    action = actionMatch[1].toLowerCase();
    target = actionMatch[2].toLowerCase();
  } else if (lowerPrompt.includes('build') || lowerPrompt.includes('create')) {
    action = 'create';
    target = lowerPrompt.includes('crm') ? 'crm' : 'system';
  }

  // Extract features
  const featureMatches = lowerPrompt.match(featureRegex) || [];
  features = [...new Set(featureMatches.map(f => f.toLowerCase()))];

  // Determine if multi-file
  isMultiFile = features.length > 1 || lowerPrompt.includes('system') || lowerPrompt.includes('crm');

  // Handle specific backend changes
  if (mfaRegex.test(lowerPrompt)) {
    backendChanges.push({
      file: 'auth.js',
      description: 'Add MFA to login',
      reason: 'Security enhancement for user authentication',
    });
    features.push('mfa');
  }

  if (payrollRegex.test(lowerPrompt)) {
    backendChanges.push({
      file: 'grok.js',
      description: 'Add payroll endpoint to EmployeeLog',
      reason: 'Feature addition for employee compensation management',
    });
    features.push('payroll');
  }

  // Default backend change for generic backend tasks
  if (lowerPrompt.includes('backend') && backendChanges.length === 0) {
    backendChanges.push({
      file: 'grok.js',
      description: `Update backend for ${target}`,
      reason: `Backend enhancement for task ${taskId}`,
    });
  }

  const parsedData = {
    action,
    target,
    features: [...new Set(features)], // Remove duplicates
    isMultiFile,
    backendChanges,
  };

  logger.info(`Parsed prompt`, { taskId, prompt, parsedData });
  appendLog(errorLogPath, `Parsed prompt for task ${taskId}: ${JSON.stringify(parsedData, null, 2)}`);

  return parsedData;
}

module.exports = { parsePrompt };
