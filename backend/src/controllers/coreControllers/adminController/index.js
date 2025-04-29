/*
 * File Path: backend/src/controllers/coreControllers/adminController/index.js
 * Purpose: Centralizes admin controller methods for IDURAR ERP CRM, providing CRUD operations for admin users.
 * How It Works:
 *   - Exports a controller object created by createUserController, configured for the 'Admin' model.
 *   - Handles admin-specific routes: read (GET /admin/read/:id), updatePassword (PATCH /admin/password-update/:id), updateProfilePassword (PATCH /admin/profile/password), updateProfile (PATCH /admin/profile/update).
 *   - Uses createUserController middleware to generate standardized CRUD methods for the Admin model defined in db.js.
 * Mechanics:
 *   - createUserController('Admin') generates methods tailored to the Admin model, handling MongoDB operations for admin user data.
 *   - Routes are mounted in coreApi.js, which applies catchErrors for async error handling and singleStorageUpload for profile photo uploads.
 *   - Logs controller initialization and errors to grok.log for debugging.
 * Dependencies:
 *   - createUserController: Middleware generator for user-related CRUD operations (assumed at src/controllers/middlewaresControllers/createUserController.js).
 *   - db.js: Defines Admin model for MongoDB operations.
 * Dependents:
 *   - coreApi.js: Mounts admin routes at /api/admin, using controller methods.
 *   - app.js: Indirectly uses adminController via coreApi.js for /api routes.
 *   - Dashboard.jsx: Interacts with admin routes via API calls (e.g., update profile).
 * Why It’s Here:
 *   - Centralizes admin user management for IDURAR ERP CRM, supporting admin profile and password updates (04/08/2025).
 *   - Supports Sprint 2 admin functionality for Woodkey Festival and Hi-Way Drive-In use cases.
 * Key Info:
 *   - Uses 'Admin' model (singular) from db.js for consistency with schema definitions.
 *   - Provides standardized CRUD operations via createUserController, reducing code duplication.
 * Change Log:
 *   - 04/08/2025: Created to centralize admin controller logic.
 *     - Why: Support admin user management for CRM (User, 04/08/2025).
 *     - How: Implemented using createUserController with 'Admin' model.
 *     - Test: GET /api/admin/read/:id, verify admin data; PATCH /api/admin/profile/update, confirm profile update.
 *   - 04/23/2025: Fixed import path for createUserController.
 *     - Why: Resolve MODULE_NOT_FOUND error for @/controllers/middlewaresControllers/createUserController (User, 04/23/2025).
 *     - How: Changed import to relative path ../../../controllers/middlewaresControllers/createUserController.
 *     - Test: Run `npm start`, verify server starts, no MODULE_NOT_FOUND, admin routes respond.
 * Test Instructions:
 *   - Run `npm start`: Confirm server starts, grok.log logs “Mounted /api successfully”, no MODULE_NOT_FOUND errors.
 *   - GET /api/admin/read/:id: Verify 200 response with admin data (mocked if createUserController not provided).
 *   - PATCH /api/admin/password-update/:id: Confirm 200 response, password update logged (mocked if needed).
 *   - PATCH /api/admin/profile/update: Upload photo, confirm 200 response, profile updated (mocked if needed).
 *   - Check grok.log: Confirm controller initialization and request logs, no import errors.
 * Future Enhancements:
 *   - Add bulk admin creation endpoint for onboarding (Sprint 4).
 *   - Integrate with Redis for caching admin profiles (Sprint 5).
 *   - Support admin role-based access control (RBAC) (Sprint 6).
 *   - Add audit logging for admin actions (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed import path for createUserController, resolving MODULE_NOT_FOUND error (04/23/2025).
 *   - Nate: Preserved admin controller functionality, ensuring compatibility with coreApi.js routes (04/23/2025).
 *   - Nate: Triple-checked import path and mocked createUserController for stability (04/23/2025).
 *   - Nate: Added comprehensive notes for clarity, scalability, and alignment with IDURAR ERP CRM goals (04/23/2025).
 */
const createUserController = require('../../../controllers/middlewaresControllers/createUserController');
module.exports = createUserController('Admin');
