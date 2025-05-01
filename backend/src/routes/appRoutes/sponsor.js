// File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\routes\appRoutes\sponsor.js
// Description:
// - Purpose: Defines API routes for sponsor-related operations.
// - Functionality: Maps HTTP methods (GET, POST, PUT) to controller functions.
// - Updates (04/02/2025): Added PUT /:id route for updating sponsors (Nate’s instruction), added PUT /:id/schedule/:eventId for calendar editing.
// - Connections:
//   - Controllers: sponsorController.js (handles logic for each route).
//   - Middleware: createAuthMiddleware (authenticates requests), catchErrors (error handling).
//   - Frontend: Dashboard.jsx (via actions.js calling these endpoints).
// - Current Features: Routes for getting sponsors, summaries, adding/updating schedules, sending emails, and CRUD operations.
// - Status: Fixed 404 error for updateSponsor on 04/02/2025.
// - Future Plans:
//   - Allur Crypto: Add /:id/payWithAllur route for crypto transactions.
//   - Frugal: Add /cost-summary route for budget tracking.
//   - Social Media: Add /:id/post route for social media updates.
// - Next Steps: Test PUT /:id with updated sponsor data, ensure profile_picture updates.

const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const sponsorController = require('@/controllers/appControllers/sponsorController');
const createAuthMiddleware = require('@/controllers/middlewaresControllers/createAuthMiddleware');
const Admin = require('@/models/coreModels/Admin');

const authMiddleware = createAuthMiddleware(Admin);

const router = express.Router();

console.log('sponsor.js loaded');

router.route('/')
  .get(authMiddleware.isValidAuthToken, catchErrors(sponsorController.getAll))
  .post(catchErrors(sponsorController.create));

router.route('/summary')
  .get(authMiddleware.isValidAuthToken, catchErrors(sponsorController.getSummary));

router.route('/:id')
  .put(authMiddleware.isValidAuthToken, catchErrors(sponsorController.update));

router.route('/:id/schedule')
  .post(authMiddleware.isValidAuthToken, catchErrors(sponsorController.addSchedule));

router.route('/:id/schedule/:eventId')
  .put(authMiddleware.isValidAuthToken, catchErrors(sponsorController.updateSchedule));

router.route('/:id/email')
  .post(authMiddleware.isValidAuthToken, catchErrors(sponsorController.sendEmail));

router.route('/fit-score')
  .post(authMiddleware.isValidAuthToken, catchErrors(sponsorController.updateFitScore));

module.exports = router;
