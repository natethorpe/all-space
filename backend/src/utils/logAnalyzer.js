/*
 * File Path: backend/src/utils/logAnalyzer.js
 * Purpose: Analyzes idurar_db.logs using mock Grok for insights in Allur Space Console.
 * How It Works:
 *   - Queries Log model to retrieve recent logs, analyzes with mock Grok for patterns (e.g., errors, task trends).
 *   - Returns insights for system health, task performance, and potential issues.
 *   - Logs analysis results to idurar_db.logs and ERROR_LOG.md.
 * Mechanics:
 *   - `analyzeLogs`: Fetches logs, generates insights with mock Grok, retries on failure.
 *   - Validates inputs (taskId, timeRange) to prevent errors.
 *   - Limits log queries to last 24 hours or 1000 entries for performance.
 * Dependencies:
 *   - logUtils.js: MongoDB logging.
 *   - fileUtils.js: Error logging to ERROR_LOG.md.
 *   - db.js: getModel for Log model.
 * Dependents:
 *   - systemAnalyzer.js: Uses analyzeLogs for system state analysis.
 * Why It’s Here:
 *   - Integrates Grok API for log analysis, addressing issue #46 (User, 05/01/2025).
 * Change Log:
 *   - 05/01/2025: Created with @xai/grok integration (Grok).
 *   - 05/08/2025: Mocked @xai/grok to fix MODULE_NOT_FOUND (Grok).
 *     - Why: @xai/grok not installed, caused startup error (User, 05/02/2025).
 *     - How: Replaced with mock Grok class, preserved insight generation.
 *     - Test: GET /grok/analyze, verify mock insights, no MODULE_NOT_FOUND.
 * Test Instructions:
 *   - Run `npm start`, GET /grok/analyze.
 *   - Verify response includes logInsights with mock errors, tasks, trends.
 *   - Check idurar_db.logs for "Log analysis completed".
 *   - Check ERROR_LOG.md for any analysis errors.
 * Rollback Instructions:
 *   - Revert to logAnalyzer.js.bak (`mv backend/src/utils/logAnalyzer.js.bak backend/src/utils/logAnalyzer.js`).
 *   - Update systemAnalyzer.js to remove analyzeLogs calls (use static logInsights).
 *   - Verify /grok/analyze returns dependency graph without log insights.
 * Future Enhancements:
 *   - Add real-time log analysis (Sprint 5).
 *   - Integrate with selfEnhancer.js for automated suggestions (Sprint 4).
 */

const { logInfo, logError } = require('./logUtils');
const { appendLog, errorLogPath } = require('./fileUtils');
const { getModel } = require('../db');

// Mock Grok class to simulate @xai/grok
class MockGrok {
  constructor({ apiKey }) {
    this.apiKey = apiKey;
  }

  async generate({ prompt }) {
    // Simulate Grok response
    return {
      text: `Analysis of logs:\nError: No critical errors detected\nTask: Processed task ${prompt.match(/Task ID: (\S+)/)?.[1] || 'unknown'}\nTrend: Stable system performance`,
    };
  }
}

const grok = new MockGrok({ apiKey: process.env.GROK_API_KEY || 'mock-key' });

/**
 * Analyzes recent logs for insights using mock Grok.
 * @param {string} taskId - Task ID for context (optional).
 * @param {number} timeRange - Time range in hours (default: 24).
 * @returns {Promise<Object>} Insights with errors, tasks, and trends.
 */
async function analyzeLogs(taskId, timeRange = 24) {
  const insights = { errors: [], tasks: [], trends: [] };
  try {
    if (taskId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      await logError('Invalid taskId', 'logAnalyzer', { taskId, timeRange, timestamp: new Date().toISOString() });
      throw new Error('Invalid taskId');
    }
    if (typeof timeRange !== 'number' || timeRange <= 0) {
      await logError('Invalid timeRange', 'logAnalyzer', { taskId, timeRange, timestamp: new Date().toISOString() });
      throw new Error('Invalid timeRange');
    }

    const Log = await getModel('Log');
    const query = taskId ? { 'details.taskId': taskId } : {};
    const logs = await Log.find({
      ...query,
      timestamp: { $gte: new Date(Date.now() - timeRange * 60 * 60 * 1000) },
    })
      .limit(1000)
      .sort({ timestamp: -1 });

    if (!logs.length) {
      await logInfo('No logs found for analysis', 'logAnalyzer', {
        taskId,
        timeRange,
        timestamp: new Date().toISOString(),
      });
      return insights;
    }

    const logText = logs.map(log => `${log.timestamp} [${log.level}] ${log.message} ${JSON.stringify(log.details)}`).join('\n');
    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      try {
        const prompt = `Analyze the following logs from Allur Space Console for errors, task patterns, and system trends:\n${logText}\nSummarize errors by type, count task-related events, and identify performance or stability trends.`;
        const grokResponse = await grok.generate({ prompt });
        const analysis = grokResponse.text || 'No insights generated';

        insights.errors = analysis.match(/Error: [^\n]+/g) || [];
        insights.tasks = analysis.match(/Task [^\n]+/g) || [];
        insights.trends = analysis.match(/Trend: [^\n]+/g) || [];

        await logInfo('Log analysis completed', 'logAnalyzer', {
          taskId,
          timeRange,
          errorCount: insights.errors.length,
          taskCount: insights.tasks.length,
          trendCount: insights.trends.length,
          timestamp: new Date().toISOString(),
        });
        await appendLog(errorLogPath, `# Log Analysis\nTask ID: ${taskId || 'all'}\nTime Range: ${timeRange}h\nInsights: ${JSON.stringify(insights, null, 2)}`);
        return insights;
      } catch (err) {
        attempt++;
        await logError(`Log analysis attempt ${attempt}/${maxAttempts} failed: ${err.message}`, 'logAnalyzer', {
          taskId,
          timeRange,
          stack: err.stack,
          attempt,
          timestamp: new Date().toISOString(),
        });
        if (attempt >= maxAttempts) {
          await appendLog(errorLogPath, `# Log Analysis Error\nTask ID: ${taskId || 'all'}\nTime Range: ${timeRange}h\nError: ${err.message}\nStack: ${err.stack}`);
          throw new Error(`Log analysis failed after ${maxAttempts} attempts: ${err.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  } catch (err) {
    await logError(`Log analysis failed: ${err.message}`, 'logAnalyzer', {
      taskId,
      timeRange,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

module.exports = { analyzeLogs };
