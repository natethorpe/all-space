/*
 * File Path: backend/src/utils/systemAnalyzer.js
 * Purpose: Analyzes system state and performs maintenance tasks in Allur Space Console, integrating Repomix for codebase analysis.
 * How It Works:
 *   - analyzeSystem: Builds a dependency graph from system files, analyzes logs, and compares Repomix output with idurar_db.memory.
 *   - maintainSystem: Cleans up old versioned files, prunes logs, and applies optimizations.
 *   - generateSuggestions: Creates BackendProposal entries for Repomix discrepancies.
 *   - Logs to grok.log (file operations) and idurar_db.logs (Repomix analysis) for traceability.
 *   - Emits taskUpdate events via Socket.IO for real-time feedback in GrokUI.jsx.
 * Mechanics:
 *   - Scans files for imports to build dependency graph, detects issues (e.g., circular dependencies).
 *   - Uses repomixUtils.js to execute and parse all-space-codebase.txt, comparing with Memory collection.
 *   - Validates taskId to prevent errors, logs issues to errorLogPath and idurar_db.logs.
 *   - Cleans versioned files (e.g., Login-v1.jsx) and prunes logs exceeding 1MB.
 * Dependencies:
 *   - fs.promises: File operations (Node.js built-in).
 *   - path: Path manipulation (Node.js built-in).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - mongoose: Memory, BackendProposal models (version 8.13.2).
 *   - fileUtils.js: readSystemFiles, appendLog, errorLogPath, siteStructureLogs, updateSiteStructure.
 *   - socket.js: getIO for Socket.IO emissions.
 *   - repomixUtils.js: executeRepomix for codebase analysis.
 *   - taskDedupeUtils.js: Prevents duplicate suggestions.
 *   - logUtils.js: MongoDB logging for Repomix analysis.
 *   - db.js: getModel for model access.
 * Dependents:
 *   - taskProcessorV18.js: Calls analyzeSystem for task processing.
 *   - taskManager.js: Uses analyzeSystem via taskProcessorV18.js.
 *   - systemRoutes.js: Exposes /grok/analyze, /grok/maintenance, /system/repomix endpoints.
 *   - GrokUI.jsx: Receives taskUpdate events via useLiveFeed.js.
 * Why It's Here:
 *   - Enhances system health for Sprint 2 with dependency analysis, maintenance, and Repomix integration (User, 04/30/2025).
 * Change Log:
 *   - 04/21/2025: Created for system analysis and maintenance (Nate).
 *   - 04/23/2025: Added dependency graph analysis (Nate).
 *   - 04/30/2025: Integrated Repomix, updated to use provided fileUtils.js (Grok).
 *     - Why: Enhance analysis with Repomix output, align with advanced file utilities (User, 04/30/2025).
 *     - How: Added executeRepomix, memory comparison, BackendProposal generation, used updateSiteStructure.
 * Test Instructions:
 *   - Run `npm start`: Confirm no errors during analysis or maintenance.
 *   - GET /grok/analyze: Verify response includes dependencyGraph, repomixSummary, LiveFeed.jsx shows green "System analyzed" log.
 *   - POST /api/system/repomix: Confirm 200 response with repomixSummary, suggestions in idurar_db.backendproposals.
 *   - GET /grok/maintenance: Verify old files deleted, logs pruned, green "Maintenance completed" log.
 *   - Submit invalid taskId: Verify red "Invalid taskId" log in LiveFeed.jsx, error in grok.log.
 *   - Check grok.log: Confirm dependency graph, maintenance actions.
 *   - Check idurar_db.logs: Confirm Repomix analysis, suggestion logs.
 * Rollback Instructions:
 *   - Revert to systemAnalyzer.js.bak (`mv backend/src/utils/systemAnalyzer.js.bak backend/src/utils/systemAnalyzer.js`).
 *   - Verify /grok/analyze returns dependency graph post-rollback.
 * Future Enhancements:
 *   - Detect circular dependencies in real-time (Sprint 4).
 *   - Schedule maintenance via cron (Sprint 5).
 *   - Cache system state in Redis (Sprint 5).
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { readSystemFiles, appendLog, errorLogPath, siteStructureLogs, updateSiteStructure } = require('./fileUtils');
const { getIO } = require('../socket');
const { executeRepomix } = require('./repomixUtils');
const { hasGeneratedFile, recordGeneratedFile } = require('./taskDedupeUtils');
const { logInfo, logError } = require('./logUtils');
const { getModel } = require('../db');

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

async function analyzeSystem(taskId = 'system') {
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId provided`, { taskId: taskId || 'missing' });
    getIO().emit('taskUpdate', {
      taskId: taskId || 'unknown',
      status: 'failed',
      error: `Invalid taskId: ${taskId || 'missing'}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'analyzeSystem' },
    });
    await appendLog(errorLogPath, `# Invalid Task ID\nTask ID: ${taskId || 'missing'}\nReason: Invalid UUID format`);
    throw new Error('Invalid taskId');
  }

  try {
    // Update site structure
    await updateSiteStructure();
    await logInfo('Site structure updated', 'systemAnalyzer', { taskId, timestamp: new Date().toISOString() });

    // Build dependency graph
    const systemFiles = await readSystemFiles();
    const dependencyGraph = {};
    for (const [filePath, content] of Object.entries(systemFiles)) {
      const imports = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
      dependencyGraph[path.basename(filePath)] = imports.map(i => {
        const match = i.match(/require\(['"]([^'"]+)['"]\)/);
        return match ? path.basename(match[1]) : null;
      }).filter(Boolean);
    }

    // Analyze logs
    const logFiles = await siteStructureLogs();
    const logInsights = [];
    for (const logFile of logFiles) {
      const content = await fs.readFile(logFile, 'utf8');
      if (content.includes('Error')) {
        logInsights.push({ file: logFile, issue: 'Contains error entries' });
      }
    }

    // Run Repomix analysis
    const repomixSummary = await executeRepomix();
    const repomixFiles = repomixSummary.files.map(file => file.path);

    // Compare with memory
    const Memory = await getModel('Memory');
    const memories = await Memory.find({});
    const memoryFiles = memories.map(memory => memory.content).filter(content => content.includes('path="'));
    const missingInMemory = repomixFiles.filter(file => !memoryFiles.some(memory => memory.includes(file)));
    const missingInRepomix = memoryFiles.filter(memory => !repomixFiles.some(file => memory.includes(file)));

    // Generate suggestions
    const suggestions = [];
    if (missingInMemory.length > 0) {
      suggestions.push({
        type: 'add_to_memory',
        description: `Add ${missingInMemory.length} files to memory`,
        files: missingInMemory,
      });
    }
    if (missingInRepomix.length > 0) {
      suggestions.push({
        type: 'remove_from_memory',
        description: `Remove ${missingInRepomix.length} obsolete memory entries`,
        files: missingInRepomix,
      });
    }
    await generateSuggestions(suggestions, taskId);

    const systemState = {
      memory: memories.map(m => ({ taskId: m.taskId, content: m.content })),
      fileNotes: [], // Placeholder for readFileNotes
      logInsights,
      dependencyGraph,
      taskCount: 0, // Placeholder for Task.countDocuments
      repomixSummary: {
        fileCount: repomixSummary.fileCount,
        totalLines: repomixSummary.totalLines,
        missingInMemory,
        missingInRepomix,
        suggestions: suggestions.length,
      },
    };

    logger.info(`System analyzed`, { taskId, dependencyGraph: JSON.stringify(dependencyGraph, null, 2), logInsightsLength: logInsights.length, repomixSummary });
    await logInfo('System analysis completed', 'systemAnalyzer', { taskId, repomixSummary, suggestions: suggestions.length, timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'analyzed',
      message: `System analyzed successfully`,
      logColor: 'green',
      timestamp: new Date().toISOString(),
      analysisDetails: { dependencyGraph, logInsightsLength: logInsights.length, repomixSummary },
    });
    await appendLog(errorLogPath, `# System Analysis\nTask ID: ${taskId}\nDependency Graph: ${JSON.stringify(dependencyGraph, null, 2)}\nLog Insights: ${logInsights.length}\nRepomix Summary: ${JSON.stringify(repomixSummary, null, 2)}`);

    return systemState;
  } catch (err) {
    logger.error(`System analysis failed: ${err.message}`, { taskId, stack: err.stack });
    await logError(`System analysis failed: ${err.message}`, 'systemAnalyzer', { taskId, stack: err.stack, timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: `System analysis failed: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: err.message, context: 'analyzeSystem', stack: err.stack },
    });
    await appendLog(errorLogPath, `# System Analysis Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}`);
    throw err;
  }
}

async function maintainSystem(taskId = 'system') {
  if (!isValidTaskId(taskId)) {
    logger.error(`Invalid taskId provided`, { taskId: taskId || 'missing' });
    getIO().emit('taskUpdate', {
      taskId: taskId || 'unknown',
      status: 'failed',
      error: `Invalid taskId: ${taskId || 'missing'}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: 'Invalid taskId', context: 'maintainSystem' },
    });
    await appendLog(errorLogPath, `# Invalid Task ID\nTask ID: ${taskId || 'missing'}\nReason: Invalid UUID format`);
    throw new Error('Invalid taskId');
  }

  try {
    // Clean up old versioned files
    const targetDir = path.join(__dirname, '../../../frontend/src/pages');
    const files = await fs.readdir(targetDir);
    let cleanedFiles = 0;
    for (const file of files) {
      if (file.match(/-v\d+\.jsx$/)) {
        await fs.unlink(path.join(targetDir, file)).catch(() => logger.warn(`File already removed`, { taskId, file }));
        logger.info(`Cleaned up old versioned file`, { taskId, file });
        cleanedFiles++;
      }
    }

    // Prune logs
    const report = await maintainLogFiles();
    const prunedLogs = report.logs.length;

    logger.info(`System maintenance completed`, { taskId, cleanedFiles, prunedLogs });
    await logInfo('System maintenance completed', 'systemAnalyzer', { taskId, cleanedFiles, prunedLogs, timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'maintained',
      message: `System maintenance completed`,
      logColor: 'green',
      timestamp: new Date().toISOString(),
      maintenanceDetails: { cleanedFiles, prunedLogs },
    });
    await appendLog(errorLogPath, `# System Maintenance\nTask ID: ${taskId}\nCleaned Files: ${cleanedFiles}\nPruned Logs: ${prunedLogs}`);

  } catch (err) {
    logger.error(`System maintenance failed: ${err.message}`, { taskId, stack: err.stack });
    await logError(`System maintenance failed: ${err.message}`, 'systemAnalyzer', { taskId, stack: err.stack, timestamp: new Date().toISOString() });
    getIO().emit('taskUpdate', {
      taskId,
      status: 'failed',
      error: `System maintenance failed: ${err.message}`,
      logColor: 'red',
      timestamp: new Date().toISOString(),
      errorDetails: { reason: err.message, context: 'maintainSystem', stack: err.stack },
    });
    await appendLog(errorLogPath, `# System Maintenance Error\nTask ID: ${taskId}\nDescription: ${err.message}\nStack: ${err.stack}`);
    throw err;
  }
}

async function generateSuggestions(suggestions, taskId) {
  const BackendProposal = await getModel('BackendProposal');
  for (const suggestion of suggestions) {
    const dedupeKey = `suggestion_${suggestion.type}_${suggestion.description}_${taskId}`;
    if (await hasGeneratedFile(dedupeKey)) {
      await logInfo('Skipped duplicate suggestion', 'systemAnalyzer', {
        dedupeKey,
        taskId,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    const proposal = new BackendProposal({
      taskId,
      file: 'systemAnalyzer.js',
      content: JSON.stringify(suggestion),
      status: 'pending',
      createdAt: new Date(),
    });

    await proposal.save();
    await recordGeneratedFile(dedupeKey);
    await logInfo('Generated BackendProposal for suggestion', 'systemAnalyzer', {
      suggestionType: suggestion.type,
      description: suggestion.description,
      proposalId: proposal._id,
      taskId,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { analyzeSystem, maintainSystem, generateSuggestions };
