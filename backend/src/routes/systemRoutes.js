/*
 * File Path: backend/src/routes/systemRoutes.js
 * Purpose: Defines system utility routes for Allur Space Console, including sponsors, client errors, and Repomix analysis.
 * How It Works:
 *   - Provides endpoints: GET /sponsors, POST /grok/client-error, POST /system/repomix, GET /sponsors/summary.
 *   - Uses db.js for MongoDB model access (Sponsor, Log, Setting).
 *   - Integrates repomixUtils.js for codebase analysis.
 *   - Logs operations to idurar_db.logs using logUtils.js.
 * Mechanics:
 *   - Validates inputs (e.g., taskId, error data) to prevent errors.
 *   - Uses catchErrors from errorHandlers.js for async error handling.
 *   - Returns sponsor summaries for frontend components like SponsorshipSummary.jsx.
 * Dependencies:
 *   - express: Web framework (version 5.1.0).
 *   - db.js: MongoDB model access.
 *   - logUtils.js: MongoDB logging.
 *   - errorHandlers.js: catchErrors for error handling.
 *   - repomixUtils.js: Repomix execution and parsing.
 * Dependents:
 *   - app.js: Mounts routes at /api.
 *   - SponsorshipSummary.jsx: Consumes /sponsors/summary.
 * Why It's Here:
 *   - Provides system utilities for Sprint 2, fixing /sponsors/summary 404 (User, 05/02/2025).
 * Change Log:
 *   - 04/30/2025: Initialized with /sponsors and /grok/client-error (Grok).
 *   - 04/30/2025: Added /system/repomix for codebase analysis (Grok).
 *   - 05/01/2025: Added /sponsors/summary redirect to /sponsors (Grok).
 *   - 05/02/2025: Implemented proper /sponsors/summary endpoint (Grok).
 *   - 05/08/2025: Added email configuration endpoint (Grok).
 *     - Why: Email delivery failure to admin@idurarapp.com (User, 05/08/2025).
 *     - How: Added GET /email-config to return valid sender/recipient, preserved existing routes.
 *     - Test: GET /api/email-config, verify response with valid email settings.
 * Test Instructions:
 *   - Run `npm start`, GET /api/sponsors/summary: Verify 200 response with { totalSponsors, activeSponsors, totalRevenue }.
 *   - GET /api/email-config: Verify 200 response with valid email settings.
 *   - Navigate to frontend page using SponsorshipSummary.jsx, confirm no 404 errors.
 *   - Check idurar_db.logs: Verify "Fetched sponsor summary" and "Fetched email config" logs, no errors.
 * Rollback Instructions:
 *   - Revert to systemRoutes.js.bak (`mv backend/src/routes/systemRoutes.js.bak backend/src/routes/systemRoutes.js`).
 *   - Verify /sponsors works post-rollback.
 * Future Enhancements:
 *   - Add pagination for /sponsors (Sprint 3).
 *   - Cache sponsor summaries (Sprint 4).
 */

const express = require('express');
const { catchErrors } = require('../handlers/errorHandlers');
const { getModel } = require('../db');
const { logInfo, logError } = require('../utils/logUtils');
const { executeRepomix } = require('../utils/repomixUtils');

const router = express.Router();

// GET /sponsors - Fetch all sponsors
router.get(
  '/sponsors',
  catchErrors(async (req, res) => {
    const Sponsor = await getModel('Sponsor');
    const sponsors = await Sponsor.find({});
    await logInfo('Fetched sponsors', 'systemRoutes', {
      count: sponsors.length,
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, sponsors });
  })
);

// GET /sponsors/summary - Fetch sponsor summary
router.get(
  '/sponsors/summary',
  catchErrors(async (req, res) => {
    try {
      const Sponsor = await getModel('Sponsor');
      const sponsors = await Sponsor.find({});
      const totalSponsors = sponsors.length;
      const activeSponsors = sponsors.filter(s => s.status === 'active').length;
      const totalRevenue = sponsors.reduce((sum, s) => sum + (s.revenue || 0), 0);

      const summary = {
        totalSponsors,
        activeSponsors,
        totalRevenue,
      };

      await logInfo('Fetched sponsor summary', 'systemRoutes', {
        summary,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, summary });
    } catch (err) {
      await logError(`Failed to fetch sponsor summary: ${err.message}`, 'systemRoutes', {
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({ success: false, message: `Failed to fetch sponsor summary: ${err.message}` });
    }
  })
);

// POST /grok/client-error - Log client-side errors
router.post(
  '/grok/client-error',
  catchErrors(async (req, res) => {
    const { message, context, details, timestamp } = req.body;
    if (!message || typeof message !== 'string' || !timestamp || typeof timestamp !== 'string') {
      await logError('Invalid client error data', 'systemRoutes', {
        received: req.body,
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ success: false, message: 'Invalid error data: message and timestamp are required' });
    }

    const validatedDetails = typeof details === 'string' && details.trim() ? details : '{}';
    await logError(`Client error reported: ${message}`, context || 'systemRoutes', {
      details: validatedDetails,
      timestamp,
    });

    res.status(200).json({ success: true, message: 'Error logged' });
  })
);

// POST /system/repomix - Run Repomix analysis
router.post(
  '/system/repomix',
  catchErrors(async (req, res) => {
    try {
      const summary = await executeRepomix();
      await logInfo('Repomix analysis completed', 'systemRoutes', {
        fileCount: summary.fileCount,
        totalLines: summary.totalLines,
        timestamp: new Date().toISOString(),
      });
      res.json({ success: true, summary });
    } catch (err) {
      await logError(`Repomix analysis failed: ${err.message}`, 'systemRoutes', {
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({ success: false, message: err.message });
    }
  })
);

// GET /email-config - Fetch email configuration
router.get(
  '/email-config',
  catchErrors(async (req, res) => {
    try {
      const emailConfig = {
        sender: 'hiwaydriveintheater@gmail.com',
        recipient: 'admin@hiwaydriveintheater.com', // Replace with valid recipient
      };
      await logInfo('Fetched email config', 'systemRoutes', {
        emailConfig,
        timestamp: new Date().toISOString(),
      });
      res.json({ success: true, emailConfig });
    } catch (err) {
      await logError(`Failed to fetch email config: ${err.message}`, 'systemRoutes', {
        stack: err.stack || 'No stack trace',
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({ success: false, message: `Failed to fetch email config: ${err.message}` });
    }
  })
);

module.exports = router;
