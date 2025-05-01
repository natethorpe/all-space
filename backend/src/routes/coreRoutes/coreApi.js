/*
 * File Path: backend/src/routes/coreRoutes/coreApi.js
 * Purpose: Defines core API routes for IDURAR ERP CRM, managing admin, settings, and sponsor CRUD operations.
 * How It Works:
 *   - Provides Express routes for:
 *     - Admin: GET /admin/read/:id, PATCH /admin/password-update/:id, PATCH /admin/profile/password, PATCH /admin/profile/update (profile updates with photo upload).
 *     - Settings: POST /settings/create, GET /settings/read/:id, PATCH /settings/update/:id, GET /settings/search, GET /settings/list, GET /settings/listAll, GET /settings/filter, GET /settings/readBySettingKey/:settingKey, GET /settings/listBySettingKey, PATCH /settings/updateBySettingKey/:settingKey.
 *     - Sponsors: GET /sponsors (list with pagination/filtering), GET /sponsors/summary (aggregate stats), DELETE /sponsors/:id, POST /sponsors (create), PUT /sponsors/:id (update), POST /sponsors/:id/schedule (add event).
 *   - Uses isValidAuthToken middleware for JWT authentication on sponsor routes.
 *   - Employs catchErrors for async error handling, ensuring consistent error responses.
 *   - Validates sponsor data (e.g., email required, tier_level mapping) before MongoDB operations.
 *   - Logs requests, responses, and errors to grok.log via winston for debugging and traceability.
 * Mechanics:
 *   - Sponsor routes use Mongoose for MongoDB CRUD operations, leveraging Sponsor model from db.js.
 *   - GET /sponsors supports pagination (?page, ?items) and filtering (?q for name, ?tier for tier_level).
 *   - GET /sponsors/summary aggregates stats (total sponsors, tier counts, average fit score, total cost, top prospects).
 *   - POST /sponsors and PUT /sponsors/:id map tier_level (e.g., 'Tier 1' to 'Very High') and convert likeliness to percentage string.
 *   - POST /sponsors/:id/schedule adds events with auto-generated _id to sponsor’s events array.
 *   - Error handling returns 400 (validation errors), 404 (not found), or 500 (server errors) with detailed messages.
 * Dependencies:
 *   - express: Router for API endpoints (version 4.21.0).
 *   - mongoose: MongoDB ORM for Sponsor model (version 8.7.0).
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - handlers/errorHandlers.js: catchErrors for async error handling.
 *   - middlewares/auth.js: isValidAuthToken for JWT validation.
 *   - middlewares/uploadMiddleware.js: singleStorageUpload for admin photo uploads.
 *   - controllers/coreControllers/adminController/index.js: Admin route logic.
 *   - controllers/coreControllers/settingController/index.js: Settings route logic.
 * Dependents:
 *   - app.js: Mounts coreApi at /api for admin, settings, sponsor requests.
 *   - Dashboard.jsx: Calls sponsor routes via useSponsorDashboard.js.
 *   - useSponsorDashboard.js: Interacts with /sponsors, /sponsors/summary via apiClient.
 * Why It’s Here:
 *   - Centralizes core API routes for IDURAR ERP CRM, supporting admin, settings, and sponsor operations (04/07/2025).
 *   - Supports Sprint 2 scalability for Woodkey Festival and Hi-Way Drive-In CRM (04/07/2025).
 *   - Eliminates schema duplication using Sponsor model from db.js for Sprint 2 schema consolidation (04/21/2025).
 * Key Info:
 *   - Input validation ensures data integrity (e.g., email required for sponsors, valid settingKey for settings).
 *   - Detailed logging provides traceability for Sprint 2 schema consolidation verification.
 *   - Routes are protected by JWT middleware for sponsor operations.
 * Change Log:
 *   - 04/07/2025: Added sponsor routes (GET /sponsors, DELETE /sponsors/:id).
 *     - Why: Enable sponsor management for CRM dashboard (Grok 3, 04/07/2025).
 *     - How: Implemented routes with Mongoose, added isValidAuthToken.
 *     - Test: GET /sponsors, verify sponsor list; DELETE /sponsors/:id, confirm deletion.
 *   - 04/07/2025: Added POST /sponsors, PUT /sponsors/:id, POST /sponsors/:id/schedule.
 *     - Why: Complete sponsor CRUD and event scheduling (Grok 3, 04/07/2025).
 *     - How: Added routes with validation, event array handling, _id generation.
 *     - Test: POST /sponsors, verify creation; PUT /sponsors/:id, confirm update; POST /sponsors/:id/schedule, check event added.
 *   - 04/07/2025: Enhanced validation and error handling.
 *     - Why: Prevent invalid data (e.g., missing email, invalid tier_level) (Grok 3, 04/07/2025).
 *     - How: Added email validation, tier mapping, likeliness formatting.
 *     - Test: POST /sponsors without email, expect 400; POST with invalid tier, verify mapping.
 *   - 04/10/2025: Added debug log, removed catch-all next() to fix /api/grok/edit 404.
 *     - Why: /api/grok/edit 404ed due to catch-all passing to notFound (User, 04/10/2025).
 *     - How: Removed next(), added console.log for router execution.
 *     - Test: Submit “Build CRM system” via /grok/edit, expect no 404, task queued.
 *   - 04/21/2025: Removed inline sponsorSchema, used db.js Sponsor model.
 *     - Why: Eliminate schema duplication for Sprint 2 maintainability (User, 04/21/2025).
 *     - How: Deleted sponsorSchema, updated routes to use Sponsor model.
 *     - Test: GET /sponsors, verify data; POST /sponsors, confirm creation, no schema errors.
 *   - 04/23/2025: Fixed import paths for errorHandlers, adminController, settingController, uploadMiddleware.
 *     - Why: MODULE_NOT_FOUND errors for @/ aliases (User, 04/23/2025).
 *     - How: Used relative paths (../../handlers/errorHandlers, etc.).
 *     - Test: Run `npm start`, verify server starts, no MODULE_NOT_FOUND, routes respond.
 *   - 04/23/2025: Fixed TypeError in /settings/updateBySettingKey/:settingKey route.
 *     - Why: Error due to invalid ? in route path causing path-to-regexp failure (User, 04/23/2025).
 *     - How: Removed optional ? syntax, added settingKey validation, ensured relative paths.
 *     - Test: Run `npm start`, verify server starts without TypeError; PATCH /settings/updateBySettingKey/:settingKey, confirm update.
 *   - 04/23/2025: Added debug logs for Sponsor queries to verify schema consolidation.
 *     - Why: Ensure Sponsor model usage for Sprint 2, provide traceability (User, 04/23/2025).
 *     - How: Added winston debug logs for GET, POST, PUT, DELETE /sponsors routes, logging query details and results.
 *     - Test: Run `npm start`, GET /sponsors, verify grok.log shows “Fetched X sponsors from idurar_db.sponsors”; POST /sponsors, verify creation log.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, grok.log logs “coreApi.js loaded” without TypeError or MODULE_NOT_FOUND errors.
 *   - GET /sponsors?page=1&items=10&q=test&tier=High: Confirm paginated, filtered sponsor list, grok.log shows “Fetched X sponsors from idurar_db.sponsors”.
 *   - GET /sponsors/summary: Verify aggregate stats (total, tiers, avgFitScore), grok.log shows “Fetched sponsor summary”.
 *   - POST /sponsors with { name: "Test Sponsor", email: "test@example.com", tier_level: "Tier 1" }: Confirm 201, email required, tier mapped to “Very High”, grok.log shows “Created sponsor”.
 *   - PUT /sponsors/:id with { likeliness: 50 }: Confirm likeliness formatted to “50%”, grok.log shows “Updated sponsor”.
 *   - DELETE /sponsors/:id: Confirm deletion, 404 for non-existent ID, grok.log shows “Deleted sponsor” or 404 error.
 *   - POST /sponsors/:id/schedule with { title: "Meeting", date: "2025-05-01" }: Verify event added with _id, grok.log shows “Added event to sponsor”.
 *   - PATCH /settings/updateBySettingKey/:settingKey with valid settingKey: Confirm setting updated, no TypeError, grok.log shows setting update.
 *   - PATCH /settings/updateBySettingKey/:settingKey with invalid settingKey (e.g., “http://test”): Confirm 400 response, no server crash.
 *   - Check idurar_db.sponsors: Verify data consistency after CRUD operations.
 *   - Check grok.log: Confirm detailed Sponsor query logs, no schema or import errors.
 * Future Enhancements:
 *   - Add advanced filtering for /sponsors (e.g., ?fitScore=50-80) (Sprint 4).
 *   - Cache /sponsors/summary with Redis to reduce MongoDB load (Sprint 4).
 *   - Add DELETE /sponsors/:id/schedule/:eventId to remove events (Sprint 5).
 *   - Implement sponsor versioning to track changes (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed TypeError in /settings/updateBySettingKey route, added settingKey validation (04/23/2025).
 *   - Nate: Fixed import paths to resolve MODULE_NOT_FOUND, ensuring backend stability (04/23/2025).
 *   - Nate: Added debug logs for Sponsor queries to verify schema consolidation for Sprint 2 (04/23/2025).
 *   - Nate: Preserved all sponsor CRUD and settings functionality, validated with Mongoose and JWT (04/23/2025).
 *   - Nate: Triple-checked MongoDB integration, logging, and error handling (04/23/2025).
 * Rollback Instructions:
 *   - If sponsor or settings routes fail, or server crashes: Copy coreApi.js.bak to coreApi.js (`mv backend/src/routes/coreRoutes/coreApi.js.bak backend/src/routes/coreRoutes/coreApi.js`).
 *   - Verify GET /sponsors returns data, PATCH /settings/updateBySettingKey works, and grok.log shows no errors after rollback.
 */
const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
const { catchErrors } = require('../../handlers/errorHandlers');
const adminController = require('../../controllers/coreControllers/adminController');
const settingController = require('../../controllers/coreControllers/settingController');
const { singleStorageUpload } = require('../../middlewares/uploadMiddleware');
const { isValidAuthToken } = require('../../middlewares/auth');
const Sponsor = mongoose.model('Sponsor');

const router = express.Router();

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'grok.log', maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

console.log('coreApi.js loaded and router initialized');

// Admin Routes
router.route('/admin/read/:id').get(catchErrors(adminController.read));
router.route('/admin/password-update/:id').patch(catchErrors(adminController.updatePassword));
router.route('/admin/profile/password').patch(catchErrors(adminController.updateProfilePassword));
router
  .route('/admin/profile/update')
  .patch(singleStorageUpload({ entity: 'admin', fieldName: 'photo', fileType: 'image' }), catchErrors(adminController.updateProfile));

// Settings Routes
router.route('/settings/create').post(catchErrors(settingController.create));
router.route('/settings/read/:id').get(catchErrors(settingController.read));
router.route('/settings/update/:id').patch(catchErrors(settingController.update));
router.route('/settings/search').get(catchErrors(settingController.search));
router.route('/settings/list').get(catchErrors(settingController.list));
router.get('/settings/listAll', (req, res, next) => {
  logger.debug('Route /settings/listAll hit - Query:', req.query);
  next();
}, catchErrors(settingController.listAll));
router.route('/settings/filter').get(catchErrors(settingController.filter));
router.route('/settings/readBySettingKey/:settingKey').get(catchErrors(settingController.readBySettingKey));
router.route('/settings/listBySettingKey').get((req, res, next) => {
  logger.debug('Route /settings/listBySettingKey hit - Query:', req.query);
  next();
}, catchErrors(settingController.listBySettingKey));
router.route('/settings/updateBySettingKey/:settingKey').patch((req, res, next) => {
  const { settingKey } = req.params;
  // Validate settingKey to prevent invalid values (e.g., URLs)
  if (!settingKey || typeof settingKey !== 'string' || settingKey.includes('http') || settingKey.includes('?')) {
    logger.warn('Invalid settingKey detected', { settingKey });
    return res.status(400).json({ success: false, message: 'Invalid settingKey' });
  }
  logger.debug('Route /settings/updateBySettingKey/:settingKey hit - settingKey:', settingKey);
  next();
}, catchErrors(settingController.updateBySettingKey));

// Sponsor Routes (with isValidAuthToken)
router.get('/sponsors', isValidAuthToken, catchErrors(async (req, res) => {
  const { page = 1, items = 10, q = '', tier = '' } = req.query;
  logger.debug('GET /sponsors - Query params:', { page, items, q, tier });

  const query = {};
  if (q) query.name = { $regex: q, $options: 'i' };
  if (tier) query.tier_level = tier;

  try {
    const sponsors = await Sponsor.find(query)
      .skip((page - 1) * items)
      .limit(parseInt(items))
      .lean();
    const total = await Sponsor.countDocuments(query);
    logger.debug(`Fetched ${sponsors.length} sponsors from idurar_db.sponsors`, { query, page, items, total });
    res.json({ success: true, result: { sponsors, total }, message: 'Sponsors fetched successfully' });
  } catch (err) {
    logger.error(`Failed to fetch sponsors: ${err.message}`, { query, page, items, stack: err.stack });
    throw new Error(`Failed to fetch sponsors: ${err.message}`);
  }
}));

router.get('/sponsors/summary', isValidAuthToken, catchErrors(async (req, res) => {
  try {
    const totalSponsors = await Sponsor.countDocuments();
    const tiers = await Sponsor.aggregate([
      { $group: { _id: '$tier_level', count: { $sum: 1 } } },
    ]);
    const avgFitScore = await Sponsor.aggregate([
      { $project: { likelinessStr: { $cond: { if: { $isNumber: '$likeliness' }, then: { $toString: '$likeliness' }, else: '$likeliness' } } } },
      { $group: { _id: null, avgFit: { $avg: { $toDouble: { $replaceAll: { input: '$likelinessStr', find: '%', replacement: '' } } } } } },
    ]);
    const totalEstCost = await Sponsor.aggregate([
      { $group: { _id: null, totalCost: { $sum: '$est_cost' } } },
    ]);
    const topProspects = await Sponsor.find()
      .sort({ likeliness: -1 })
      .limit(5)
      .select('name likeliness')
      .lean();

    const summary = {
      totalSponsors,
      tiers: tiers.map(t => ({ _id: t._id, count: t.count })),
      avgFitScore: avgFitScore[0]?.avgFit || 0,
      totalEstCost: totalEstCost[0]?.totalCost || 0,
      topProspects: topProspects.map(p => ({ _id: p._id, name: p.name, fit_score: p.likeliness })),
    };

    logger.debug('Fetched sponsor summary from idurar_db.sponsors', { summary });
    res.json({ success: true, result: summary, message: 'Summary fetched successfully' });
  } catch (err) {
    logger.error(`Failed to fetch sponsor summary: ${err.message}`, { stack: err.stack });
    throw new Error(`Failed to fetch sponsor summary: ${err.message}`);
  }
}));

router.delete('/sponsors/:id', isValidAuthToken, catchErrors(async (req, res) => {
  const { id } = req.params;
  logger.debug('DELETE /sponsors/:id - Deleting sponsor:', id);

  try {
    const sponsor = await Sponsor.findByIdAndDelete(id);
    if (!sponsor) {
      logger.warn('Sponsor not found for deletion', { sponsorId: id });
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }
    logger.debug(`Deleted sponsor from idurar_db.sponsors`, { sponsorId: id, name: sponsor.name });
    res.json({ success: true, message: 'Sponsor deleted successfully' });
  } catch (err) {
    logger.error(`Failed to delete sponsor: ${err.message}`, { sponsorId: id, stack: err.stack });
    throw new Error(`Failed to delete sponsor: ${err.message}`);
  }
}));

router.post('/sponsors', isValidAuthToken, catchErrors(async (req, res) => {
  const sponsorData = req.body;
  logger.debug('POST /sponsors - Creating sponsor with data:', sponsorData);

  if (!sponsorData.email) {
    logger.warn('Missing required field: email', { sponsorData });
    return res.status(400).json({
      success: false,
      message: 'Validation failed: email is required',
    });
  }

  if (typeof sponsorData.likeliness === 'number') {
    sponsorData.likeliness = `${sponsorData.likeliness}%`;
  }

  const tierMap = {
    'Tier 1': 'Very High',
    'Tier 2': 'High',
    'Tier 3': 'Moderate-High'
  };
  if (tierMap[sponsorData.tier_level]) {
    sponsorData.tier_level = tierMap[sponsorData.tier_level];
  }

  try {
    const sponsor = new Sponsor(sponsorData);
    await sponsor.save();
    logger.debug(`Created sponsor in idurar_db.sponsors`, { sponsorId: sponsor._id, name: sponsorData.name, tier: sponsorData.tier_level });
    res.status(201).json({ success: true, result: sponsor, message: 'Sponsor created successfully' });
  } catch (err) {
    logger.error(`Failed to create sponsor: ${err.message}`, { sponsorData, stack: err.stack });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: err.errors || err.message,
    });
  }
}));

router.put('/sponsors/:id', isValidAuthToken, catchErrors(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  logger.debug('PUT /sponsors/:id - Updating sponsor:', id, 'with data:', updateData);

  if (typeof updateData.likeliness === 'number') {
    updateData.likeliness = `${updateData.likeliness}%`;
  }

  const tierMap = {
    'Tier 1': 'Very High',
    'Tier 2': 'High',
    'Tier 3': 'Moderate-High'
  };
  if (tierMap[updateData.tier_level]) {
    updateData.tier_level = tierMap[updateData.tier_level];
  }

  try {
    const sponsor = await Sponsor.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!sponsor) {
      logger.warn('Sponsor not found for update', { sponsorId: id });
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }
    logger.debug(`Updated sponsor in idurar_db.sponsors`, { sponsorId: id, updates: updateData });
    res.json({ success: true, result: sponsor, message: 'Sponsor updated successfully' });
  } catch (err) {
    logger.error(`Failed to update sponsor: ${err.message}`, { sponsorId: id, stack: err.stack });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: err.errors || err.message,
    });
  }
}));

router.post('/sponsors/:id/schedule', isValidAuthToken, catchErrors(async (req, res) => {
  const { id } = req.params;
  const eventData = req.body;
  logger.debug('POST /sponsors/:id/schedule - Adding event to sponsor:', id, 'with data:', eventData);

  try {
    const sponsor = await Sponsor.findById(id);
    if (!sponsor) {
      logger.warn('Sponsor not found for event scheduling', { sponsorId: id });
      return res.status(404).json({ success: false, message: 'Sponsor not found' });
    }

    const newEvent = {
      _id: new mongoose.Types.ObjectId(),
      title: eventData.title,
      date: eventData.date,
      description: eventData.description
    };
    sponsor.events.push(newEvent);
    await sponsor.save();

    logger.debug(`Added event to sponsor in idurar_db.sponsors`, { sponsorId: id, eventId: newEvent._id, title: newEvent.title });
    res.status(201).json({ success: true, result: sponsor, message: 'Event added successfully' });
  } catch (err) {
    logger.error(`Failed to add event to sponsor: ${err.message}`, { sponsorId: id, stack: err.stack });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: err.errors || err.message,
    });
  }
}));

// Debug log for router execution (no next() to avoid passing to notFound)
router.use((req, res) => {
  logger.debug('coreApi catch-all reached:', req.method, req.originalUrl);
});

module.exports = router;
