/*
 * File Path: backend/src/utils/fileUtils.js
 * Purpose: Utility functions for file operations, log management, and site structure in Allur Space Console.
 * How It Works:
 *   - Manages file reading, log appending, and site structure generation for system analysis and maintenance.
 *   - Installs dependencies via npm, updates site-structure.json, and handles log deduplication and pruning.
 *   - Logs operations to grok.log (filesystem) and idurar_db.logs (MongoDB) for traceability.
 * Mechanics:
 *   - Recursively scans directories for files and logs, excluding node_modules.
 *   - Uses zlib for log compression, readline for streaming, and child_process for npm installs.
 *   - Maintains multiple log files (ERROR_LOG.md, FEATURE_LOG.md, etc.) and site-structure.json.
 * Dependencies:
 *   - fs.promises: File operations (Node.js built-in).
 *   - path: Path manipulation (Node.js built-in).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - zlib: Log compression (Node.js built-in).
 *   - readline: Log streaming (Node.js built-in).
 *   - child_process: npm installs (Node.js built-in).
 *   - logUtils.js: MongoDB logging.
 * Dependents:
 *   - systemAnalyzer.js: Uses readSystemFiles, appendLog, siteStructureLogs, errorLogPath.
 *   - taskTesterV18.js, testUtils.js, selfEnhancer.js, testGenerator.js, testExecutionUtils.js: Use appendLog, errorLogPath.
 * Why It's Here:
 *   - Supports system analysis, maintenance, and dependency management for Sprint 2 (User, 04/30/2025).
 * Change Log:
 *   - 04/08/2025: Integrated site structure logs, added dedupeLog (Nate).
 *   - 04/08/2025: Added installDependency, updateSiteStructure (Nate).
 *   - 04/30/2025: Aligned with provided version, added MongoDB logging (Grok).
 *     - Why: Enhance system awareness with site-structure.json, ensure traceability (User, 04/30/2025).
 *     - How: Incorporated provided functions, added logUtils.js for MongoDB logging.
 * Test Instructions:
 *   - Run `npm start`, GET /grok/analyze: Verify grok.log contains dependency graph, site-structure.json updates.
 *   - GET /grok/maintenance: Confirm ERROR_LOG.md, grok.log pruned, no permission errors.
 *   - POST /api/grok/edit with "Build CRM system": Verify site-structure.json reflects new files, idurar_db.logs shows file operations.
 *   - Check idurar_db.logs: Confirm file operation logs, no errors.
 * Rollback Instructions:
 *   - Revert to fileUtils.js.bak (`mv backend/src/utils/fileUtils.js.bak backend/src/utils/fileUtils.js`).
 *   - Verify /grok/analyze works post-rollback.
 * Future Enhancements:
 *   - Cache site structure for performance (Sprint 5).
 *   - Support multi-project log directories (Sprint 6).
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const zlib = require('zlib');
const { createReadStream } = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');
const { logInfo, logWarn, logError } = require('./logUtils');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../../grok.log'), maxsize: 1024 * 1024 }),
    new winston.transports.Console(),
  ],
});

const logDir = path.resolve(__dirname, '../../../');
const errorLogPath = path.join(logDir, 'ERROR_LOG.md');
const featureLogPath = path.join(logDir, 'FEATURE_LOG.md');
const debugLogPath = path.join(logDir, 'DEBUG_LOG.md');
const connectivityLogPath = path.join(logDir, 'CONNECTIVITY_LOG.md');
const overviewLogPath = path.join(logDir, 'Comprehensive_Project_Overview.md');
const siteStructurePath = path.join(logDir, 'site-structure.json');

/**
 * Installs a dependency via npm if not present.
 * @param {string} dependency - The dependency to install.
 * @returns {Promise<boolean>} True if installed, false if already present or failed.
 */
async function installDependency(dependency) {
  try {
    require.resolve(dependency);
    await logInfo(`${dependency} already installed`, 'fileUtils', { timestamp: new Date().toISOString() });
    return false;
  } catch (err) {
    try {
      execSync(`npm install ${dependency} --save`, { stdio: 'inherit', cwd: logDir });
      await logInfo(`Installed dependency: ${dependency}`, 'fileUtils', { timestamp: new Date().toISOString() });
      return true;
    } catch (installErr) {
      await logError(`Failed to install ${dependency}: ${installErr.message}`, 'fileUtils', {
        stack: installErr.stack,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }
}

/**
 * Updates site-structure.json based on current filesystem.
 * @param {string} rootDir - Root directory to scan (default: logDir).
 * @returns {Promise<Object>} The generated site structure.
 */
async function updateSiteStructure(rootDir = logDir) {
  const structure = {};
  const walkDir = async (dir, obj) => {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      const relPath = path.relative(rootDir, fullPath);
      if (file.isDirectory() && !fullPath.includes('node_modules')) {
        obj[file.name] = {};
        await walkDir(fullPath, obj[file.name]);
      } else {
        obj[file.name] = null;
      }
    }
  };

  try {
    await walkDir(rootDir, structure);
    await fs.writeFile(siteStructurePath, JSON.stringify(structure, null, 2), 'utf8');
    await logInfo(`Updated site-structure.json`, 'fileUtils', {
      path: siteStructurePath,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await logWarn(`Failed to update site-structure.json: ${err.message}`, 'fileUtils', {
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }
  return structure;
}

/**
 * Reads site structure to find all log files.
 * @returns {Promise<string[]>} Array of log file paths.
 */
async function siteStructureLogs() {
  try {
    const structure = JSON.parse(await fs.readFile(siteStructurePath, 'utf8'));
    const logFiles = [];
    const walkStructure = (obj, currentPath = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path.join(currentPath, key);
        if (typeof value === 'object' && value !== null) {
          walkStructure(value, fullPath);
        } else if (fullPath.match(/\.(log|md)$/i)) {
          logFiles.push(fullPath);
        }
      }
    };
    walkStructure(structure, logDir);
    await logInfo(`Found ${logFiles.length} log files`, 'fileUtils', {
      logFiles,
      timestamp: new Date().toISOString(),
    });
    return logFiles;
  } catch (err) {
    await logWarn(`Failed to read site-structure.json: ${err.message}`, 'fileUtils', {
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    return [errorLogPath, featureLogPath, debugLogPath, connectivityLogPath, overviewLogPath, path.join(logDir, 'grok.log')];
  }
}

/**
 * Reads the last 1MB of a log file.
 * @param {string} filePath - Path to the log file.
 * @returns {Promise<string>} Log content.
 */
async function readLog(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    await logInfo(`Read log file`, 'fileUtils', {
      filePath,
      size: content.length,
      timestamp: new Date().toISOString(),
    });
    return content.slice(-1024 * 1024);
  } catch (err) {
    await logWarn(`Failed to read log: ${err.message}`, 'fileUtils', {
      filePath,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    return '# Log Not Found\nNo previous entries.';
  }
}

/**
 * Appends a log entry to the specified file with timestamp.
 * @param {string} filePath - Path to the log file.
 * @param {string} entry - Log entry to append.
 * @returns {Promise<void>}
 */
async function appendLog(filePath, entry) {
  const timestamp = new Date().toISOString();
  const formattedEntry = `\n\n## Entry - ${timestamp}\n${entry}`;
  try {
    await fs.appendFile(filePath, formattedEntry);
    await pruneLog(filePath);
    await logInfo(`Appended log entry`, 'fileUtils', {
      filePath,
      contentLength: formattedEntry.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await logError(`Failed to append log: ${err.message}`, 'fileUtils', {
      filePath,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

/**
 * Deduplicates log entries based on content, preserving errors and task IDs.
 * @param {string} filePath - Path to the log file.
 * @returns {Promise<void>}
 */
async function dedupeLog(filePath) {
  try {
    const lines = [];
    const seen = new Set();
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const key = line.replace(/timestamp":"[^"]+"/, '');
      if (!seen.has(key) || line.includes('Error') || line.includes('Task ID')) {
        lines.push(line);
        seen.add(key);
      }
    }

    if (lines.length !== seen.size) {
      await fs.writeFile(filePath, lines.join('\n'));
      await logInfo(`Deduped log file`, 'fileUtils', {
        filePath,
        reducedFrom: seen.size,
        reducedTo: lines.length,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    await logWarn(`Failed to dedupe log: ${err.message}`, 'fileUtils', {
      filePath,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Prunes log file to keep last 1000 lines, archiving excess to .gz.
 * @param {string} filePath - Path to the log file.
 * @param {number} maxLines - Maximum lines to keep (default: 1000).
 * @returns {Promise<void>}
 */
async function pruneLog(filePath, maxLines = 1000) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size <= 1024 * 1024) return;

    await dedupeLog(filePath);
    const lines = [];
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) lines.push(line);
    if (lines.length <= maxLines) return;

    const criticalEntries = lines
      .filter(line => line.includes('#') || line.includes('Error') || line.includes('Task ID'))
      .slice(-maxLines / 2);
    const recentEntries = lines.slice(-maxLines / 2);
    const prunedContent = [...new Set([...criticalEntries, ...recentEntries])].join('\n');

    const archivePath = `${filePath}.${Date.now()}.gz`;
    const compressed = zlib.gzipSync(await fs.readFile(filePath));
    await fs.writeFile(archivePath, compressed);
    await fs.writeFile(filePath, prunedContent);
    await logInfo(`Pruned log file`, 'fileUtils', {
      filePath,
      keptLines: maxLines,
      archivedTo: archivePath,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await logWarn(`Failed to prune log: ${err.message}`, 'fileUtils', {
      filePath,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Maintains all log files by pruning and archiving.
 * @returns {Promise<Object>} Report of maintained logs and archives.
 */
async function maintainLogFiles() {
  const report = { logs: [], archives: [] };
  const logFiles = await siteStructureLogs();

  for (const filePath of logFiles) {
    try {
      await pruneLog(filePath);
      report.logs.push(filePath);
      const stats = await fs.stat(filePath).catch(() => ({ size: 0 }));
      if (stats.size > 0) report.archives.push(`${filePath}.gz`);
      await logInfo(`Maintained log file`, 'fileUtils', {
        filePath,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      await logWarn(`Failed to maintain log: ${err.message}`, 'fileUtils', {
        filePath,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return report;
}

/**
 * Parses log file for insights (errors, tasks, features).
 * @param {string} filePath - Path to the log file.
 * @returns {Promise<Object>} Insights with errors, tasks, and features.
 */
async function streamLogParse(filePath) {
  const insights = { errors: [], tasks: [], features: [] };
  try {
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.includes('Error')) insights.errors.push(line);
      if (line.includes('Task ID')) insights.tasks.push(line);
      if (line.includes('# Feature') || line.includes('Self-Enhancement')) insights.features.push(line);
    }
    await logInfo(`Parsed log for insights`, 'fileUtils', {
      filePath,
      errorCount: insights.errors.length,
      taskCount: insights.tasks.length,
      featureCount: insights.features.length,
      timestamp: new Date().toISOString(),
    });
    return insights;
  } catch (err) {
    await logWarn(`Failed to parse log: ${err.message}`, 'fileUtils', {
      filePath,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    return { errors: [], tasks: [], features: [] };
  }
}

/**
 * Reads system files (.js, .jsx, .css, .md, .json) from project directory.
 * @param {string} dir - Directory to scan (default: project root).
 * @returns {Promise<Object>} Map of file paths to contents.
 */
async function readSystemFiles(dir = path.join(__dirname, '../../../')) {
  const fileContents = {};
  const walkDir = async (currentDir) => {
    try {
      const files = await fs.readdir(currentDir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(currentDir, file.name);
        if (file.isDirectory() && !fullPath.includes('node_modules')) {
          await walkDir(fullPath);
        } else if (fullPath.match(/\.(js|jsx|css|md|json)$/)) {
          try {
            fileContents[fullPath] = await fs.readFile(fullPath, 'utf8');
            await logInfo(`Read system file`, 'fileUtils', {
              filePath: fullPath,
              size: fileContents[fullPath].length,
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            await logError(`Failed to read file: ${err.message}`, 'fileUtils', {
              filePath: fullPath,
              stack: err.stack,
              timestamp: new Date().toISOString(),
            });
            await appendLog(errorLogPath, `# File Read Error\nPath: ${fullPath}\nDescription: ${err.message}`);
          }
        }
      }
    } catch (err) {
      await logError(`Failed to scan directory: ${err.message}`, 'fileUtils', {
        directory: currentDir,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      await appendLog(errorLogPath, `# Directory Read Error\nDir: ${currentDir}\nDescription: ${err.message}`);
    }
  };
  await walkDir(dir);
  return fileContents;
}

/**
 * Parses file header for notes (Purpose, Goals, Enhancements, Future).
 * @param {string} filePath - Path to the file.
 * @returns {Promise<Object>} Parsed notes.
 */
async function readFileNotes(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const headerMatch = content.match(/\/\*\s*\n([^*]*\*\/)?/);
    if (!headerMatch) return { purpose: '', goals: [], enhancements: [], future: [] };

    const header = headerMatch[1] || '';
    const lines = header.split('\n').map(line => line.trim().replace(/^\*\s*/, ''));

    const notes = { purpose: '', goals: [], enhancements: [], future: [] };
    let currentSection = '';
    lines.forEach(line => {
      if (line.startsWith('Purpose:')) {
        currentSection = 'purpose';
        notes.purpose = line.replace('Purpose:', '').trim();
      } else if (line.startsWith('Notes:')) {
        currentSection = 'notes';
      } else if (line.startsWith('- Goals:')) {
        currentSection = 'goals';
      } else if (line.startsWith('- Enhancements:')) {
        currentSection = 'enhancements';
      } else if (line.startsWith('- Future:')) {
        currentSection = 'future';
      } else if (currentSection && line.startsWith('-')) {
        const note = line.replace('-', '').trim();
        if (currentSection === 'goals') notes.goals.push(note);
        else if (currentSection === 'enhancements') notes.enhancements.push(note);
        else if (currentSection === 'future') notes.future.push(note);
      }
    });
    await logInfo(`Parsed file notes`, 'fileUtils', {
      filePath,
      purpose: notes.purpose,
      timestamp: new Date().toISOString(),
    });
    return notes;
  } catch (err) {
    await logWarn(`Failed to read file notes: ${err.message}`, 'fileUtils', {
      filePath,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    return { purpose: '', goals: [], enhancements: [], future: [] };
  }
}

module.exports = {
  readLog,
  appendLog,
  readSystemFiles,
  readFileNotes,
  pruneLog,
  maintainLogFiles,
  streamLogParse,
  siteStructureLogs,
  updateSiteStructure,
  installDependency,
  dedupeLog,
  errorLogPath,
  featureLogPath,
  debugLogPath,
  connectivityLogPath,
  overviewLogPath,
};
