/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\utils\fileUtils.js
 * Purpose: Utility functions for file operations, log management, and site structure in Grok Programming Machine.
 * Dependencies: fs (node:fs/promises), path, winston (logging), zlib (compression), readline (streaming), child_process (npm)
 * Notes:
 *   - Manages logs, maintains dynamic site structure, handles dependencies.
 * Updates:
 *   - 04/08/2025: Integrated site structure logs, deduped bloat (Previous).
 *   - 04/08/2025: Added installDependency, site structure generation (Current).
 *     - Why: Circular dependency broke installDependency; need live site-structure.json (User feedback).
 *     - How: Moved installDependency here, added updateSiteStructure.
 *     - Impact: Resolves export errors, enables full system awareness.
 *     - Test: Submit tasks, check site-structure.json updates, deps install.
 * Self-Notes:
 *   - Nate: Test site structure updates with file adds/deletes—watch fs events?
 * Future Direction:
 *   - Log categorization (Hour 6).
 */

const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const zlib = require('zlib');
const { createReadStream } = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'grok.log', maxsize: 1024 * 1024 }),
    new winston.transports.Console()
  ]
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
 */
async function installDependency(dependency) {
  try {
    require.resolve(dependency);
    logger.debug(`${dependency} already installed`);
    return false;
  } catch (err) {
    try {
      execSync(`npm install ${dependency} --save`, { stdio: 'inherit', cwd: logDir });
      logger.info(`Installed dependency: ${dependency}`);
      return true;
    } catch (installErr) {
      logger.error(`Failed to install ${dependency}: ${installErr.message}`);
      return false;
    }
  }
}

/**
 * Updates site-structure.json based on current filesystem.
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
    logger.info(`Updated site-structure.json at ${siteStructurePath}`);
  } catch (err) {
    logger.warn(`Failed to update site-structure.json: ${err.message}`);
  }
  return structure;
}

/**
 * Reads site structure to find all log files.
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
    return logFiles;
  } catch (err) {
    logger.warn(`Failed to read site-structure.json: ${err.message}`);
    return [errorLogPath, featureLogPath, debugLogPath, connectivityLogPath, overviewLogPath, path.join(logDir, 'grok.log')];
  }
}

async function readLog(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.slice(-1024 * 1024);
  } catch (err) {
    return '# Log Not Found\nNo previous entries.';
  }
}

async function appendLog(filePath, entry) {
  const timestamp = new Date().toISOString();
  const formattedEntry = `\n\n## Entry - ${timestamp}\n${entry}`;
  await fs.appendFile(filePath, formattedEntry);
  await pruneLog(filePath);
}

async function dedupeLog(filePath) {
  try {
    const lines = [];
    const seen = new Set();
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
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
      logger.info(`Deduped ${filePath}: reduced from ${seen.size} to ${lines.length} lines`);
    }
  } catch (err) {
    logger.warn(`Failed to dedupe ${filePath}: ${err.message}`);
  }
}

async function pruneLog(filePath, maxLines = 1000) {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size <= 1024 * 1024) return;

    await dedupeLog(filePath);
    const lines = [];
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });

    for await (const line of rl) lines.push(line);
    if (lines.length <= maxLines) return;

    const criticalEntries = lines.filter(line => 
      line.includes('#') || line.includes('Error') || line.includes('Task ID')
    ).slice(-maxLines / 2);
    const recentEntries = lines.slice(-maxLines / 2);
    const prunedContent = [...new Set([...criticalEntries, ...recentEntries])].join('\n');
    
    const archivePath = `${filePath}.${Date.now()}.gz`;
    const compressed = zlib.gzipSync(await fs.readFile(filePath));
    await fs.writeFile(archivePath, compressed);
    await fs.writeFile(filePath, prunedContent);
    logger.info(`Pruned ${filePath}: kept ${maxLines} lines, archived to ${archivePath}`);
  } catch (err) {
    logger.warn(`Failed to prune ${filePath}: ${err.message}`);
  }
}

async function maintainLogFiles() {
  const report = { logs: [], archives: [] };
  const logFiles = await siteStructureLogs();
  
  for (const filePath of logFiles) {
    try {
      await pruneLog(filePath);
      report.logs.push(filePath);
      const stats = await fs.stat(filePath).catch(() => ({ size: 0 }));
      if (stats.size > 0) report.archives.push(`${filePath}.gz`);
    } catch (err) {
      logger.warn(`Failed to maintain ${filePath}: ${err.message}`);
    }
  }
  return report;
}

async function streamLogParse(filePath) {
  const insights = { errors: [], tasks: [], features: [] };
  try {
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.includes('Error')) insights.errors.push(line);
      if (line.includes('Task ID')) insights.tasks.push(line);
      if (line.includes('# Feature') || line.includes('Self-Enhancement')) insights.features.push(line);
    }
    return insights;
  } catch (err) {
    logger.warn(`Failed to parse ${filePath}: ${err.message}`);
    return { errors: [], tasks: [], features: [] };
  }
}

async function readSystemFiles(dir = 'C:/Users/nthorpe/Desktop/crm/idurar-erp-crm') {
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
          } catch (err) {
            await appendLog(errorLogPath, `# File Read Error\nPath: ${fullPath}\nDescription: ${err.message}`);
          }
        }
      }
    } catch (err) {
      await appendLog(errorLogPath, `# Directory Read Error\nDir: ${currentDir}\nDescription: ${err.message}`);
    }
  };
  await walkDir(dir);
  return fileContents;
}

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
    logger.debug(`Parsed notes from ${filePath}`);
    return notes;
  } catch (err) {
    logger.warn(`Failed to read notes from ${filePath}: ${err.message}`);
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
  overviewLogPath 
};
