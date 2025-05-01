/*
 * File Path: backend/src/utils/repomixUtils.js
 * Purpose: Executes and parses Repomix output for Allur Space Console project scope analysis.
 * How It Works:
 *   - Runs `repomix --output all-space-codebase.txt` to generate codebase summary.
 *   - Parses plain text output to extract file paths and contents.
 *   - Caches results in MongoDB to reduce redundant runs.
 *   - Returns a summary with file count, total lines, and file details.
 *   - Logs execution and parsing to idurar_db.logs for traceability.
 * Mechanics:
 *   - Uses child_process to execute Repomix command synchronously.
 *   - Parses output using regex to extract file paths and contents.
 *   - Validates output format and handles errors gracefully.
 * Dependencies:
 *   - child_process: Executes Repomix command (Node.js built-in).
 *   - fs: Reads output file (Node.js built-in).
 *   - logUtils.js: MongoDB logging.
 *   - fileUtils.js: installDependency for Repomix installation.
 *   - db.js: MongoDB model access.
 * Dependents:
 *   - systemAnalyzer.js: Uses executeRepomix for codebase-memory comparison.
 *   - systemRoutes.js: Calls executeRepomix via /system/repomix endpoint.
 * Why It's Here:
 *   - Integrates Repomix for Sprint 2 project scope analysis (User, 04/30/2025).
 * Change Log:
 *   - 04/30/2025: Created to execute and parse Repomix output (Grok).
 *     - Why: Provide project scope analysis for systemAnalyzer.js (User, 04/30/2025).
 *     - How: Implemented execSync for Repomix, parsed plain text, added logging.
 *   - 05/01/2025: Added MongoDB caching for Repomix output (Grok).
 *     - Why: Reduce redundant Repomix runs, improve performance (User, 05/01/2025).
 *     - How: Stored results in Setting model, checked cache before execution.
 *     - Test: POST /system/repomix, verify cached results, no redundant runs.
 * Test Instructions:
 *   - Run `npm start`, POST /system/repomix: Verify 200 response with fileCount, totalLines, files array.
 *   - Run again, verify cached results used, no redundant Repomix execution.
 *   - Check idurar_db.logs: Confirm "Repomix analysis completed" or "Served cached Repomix results", no errors.
 *   - Verify all-space-codebase.txt exists, contains file paths and contents.
 * Rollback Instructions:
 *   - Delete repomixUtils.js if analysis fails.
 *   - Remove /system/repomix route from systemRoutes.js.
 *   - Verify /grok/analyze works post-rollback.
 * Future Enhancements:
 *   - Support incremental updates (Sprint 6).
 *   - Add cache invalidation based on codebase changes (Sprint 5).
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { logInfo, logError } = require('./logUtils');
const { installDependency } = require('./fileUtils');
const { getModel } = require('../db');

const OUTPUT_FILE = 'all-space-codebase.txt';
const CACHE_KEY = 'repomix_summary';

/**
 * Executes Repomix and parses its output to summarize the codebase, with MongoDB caching.
 * @returns {Promise<Object>} Summary with file count, total lines, and file details.
 */
async function executeRepomix() {
  try {
    await logInfo('Starting Repomix execution', 'repomixUtils', { timestamp: new Date().toISOString() });

    // Check cache
    const Setting = await getModel('Setting');
    const cachedResult = await Setting.findOne({ settingKey: CACHE_KEY });
    if (cachedResult) {
      await logInfo('Served cached Repomix results', 'repomixUtils', {
        fileCount: cachedResult.settingValue.fileCount,
        totalLines: cachedResult.settingValue.totalLines,
        timestamp: new Date().toISOString(),
      });
      return cachedResult.settingValue;
    }

    // Ensure Repomix is installed
    await installDependency('repomix');

    // Execute Repomix
    execSync(`npx repomix --output ${OUTPUT_FILE}`, { stdio: 'inherit', cwd: path.join(__dirname, '../../../') });
    await logInfo('Repomix command executed', 'repomixUtils', { outputFile: OUTPUT_FILE, timestamp: new Date().toISOString() });

    // Read output file
    const content = await fs.readFile(OUTPUT_FILE, 'utf8');
    if (!content) {
      throw new Error('Repomix output file is empty');
    }

    // Parse plain text output
    const files = [];
    let currentFile = null;
    let currentContent = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('<file path="')) {
        if (currentFile) {
          files.push({
            path: currentFile,
            content: currentContent.join('\n'),
            lines: currentContent.length,
          });
          currentContent = [];
        }
        const match = line.match(/<file path="([^"]+)">/);
        if (match) {
          currentFile = match[1];
        }
      } else if (line === '</file>') {
        if (currentFile) {
          files.push({
            path: currentFile,
            content: currentContent.join('\n'),
            lines: currentContent.length,
          });
          currentFile = null;
          currentContent = [];
        }
      } else if (currentFile) {
        currentContent.push(line);
      }
    }

    // Handle last file
    if (currentFile && currentContent.length > 0) {
      files.push({
        path: currentFile,
        content: currentContent.join('\n'),
        lines: currentContent.length,
      });
    }

    const summary = {
      fileCount: files.length,
      totalLines: files.reduce((sum, file) => sum + file.lines, 0),
      files: files.map(file => ({
        path: file.path,
        lines: file.lines,
      })),
    };

    // Cache results
    await Setting.findOneAndUpdate(
      { settingKey: CACHE_KEY },
      { settingValue: summary, settingCategory: 'repomix', updatedAt: new Date() },
      { upsert: true }
    );

    await logInfo('Repomix output parsed and cached', 'repomixUtils', {
      fileCount: summary.fileCount,
      totalLines: summary.totalLines,
      timestamp: new Date().toISOString(),
    });

    return summary;
  } catch (err) {
    await logError(`Repomix execution failed: ${err.message}`, 'repomixUtils', {
      stack: err.stack || 'No stack trace',
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

module.exports = { executeRepomix };
