/*
 * File Path: backend/src/handlers/errorHandlers.js
 * Purpose: Provides Express middleware for error handling in IDURAR ERP/CRM, including 404 handling, async error catching, and general error responses.
 * How It Works:
 *   - Exports three middleware functions:
 *     - `notFound`: Handles 404 errors for undefined routes, returning a JSON response.
 *     - `errorHandler`: Catches and formats all server errors, returning JSON responses with status and message.
 *     - `catchErrors`: Wraps async route handlers to catch errors and pass them to errorHandler.
 *   - Logs errors to grok.log using winston for debugging and traceability.
 * Mechanics:
 *   - `notFound`: Returns 404 with a JSON error message for unmatched routes.
 *   - `errorHandler`: Processes errors, setting status (default 500) and message, with stack trace in development mode.
 *   - `catchErrors`: Wraps async functions, catching errors and passing them to next(err) for errorHandler.
 * Dependencies:
 *   - winston: Logging to grok.log (version 3.17.0).
 *   - path: File path manipulation for log file.
 * Dependents:
 *   - app.js: Uses notFound and errorHandler as global middleware.
 *   - coreApi.js: Uses catchErrors for async route handlers.
 * Why It’s Here:
 *   - Centralizes error handling for IDURAR ERP/CRM backend, ensuring consistent error responses (04/07/2025).
 *   - Supports Sprint 2 reliability by logging errors and handling async routes (04/23/2025).
 * Key Info:
 *   - notFound and errorHandler are applied globally in app.js for all routes.
 *   - catchErrors is used in coreApi.js for admin, settings, and sponsor routes.
 *   - Errors are logged with timestamps, stack traces, and context for debugging.
 * Change Log:
 *   - 04/07/2025: Created notFound and errorHandler for global error handling.
 *     - Why: Ensure consistent error responses across the app (Grok 3, 04/07/2025).
 *     - How: Implemented 404 and error middleware with JSON responses.
 *     - Test: Access /api/unknown, verify 404; trigger server error, confirm 500 JSON response.
 *   - 04/21/2025: Added catchErrors for async route handling.
 *     - Why: Support async routes in coreApi.js for Sprint 2 (User, 04/21/2025).
 *     - How: Created wrapper for async functions, passing errors to errorHandler.
 *     - Test: Test async routes (e.g., GET /sponsors), verify errors caught, JSON response.
 *   - 04/23/2025: Created file to resolve MODULE_NOT_FOUND error in app.js.
 *     - Why: Error when running `npm start` due to missing ./handlers/errorHandlers (User, 04/23/2025).
 *     - How: Implemented notFound, errorHandler, catchErrors with winston logging.
 *     - Test: Run `npm start`, verify server starts without MODULE_NOT_FOUND, error handling works.
 * Test Instructions:
 *   - Run `npm start`: Verify server starts, grok.log logs middleware initialization without MODULE_NOT_FOUND.
 *   - Access /api/unknown: Confirm 404 JSON response from notFound middleware.
 *   - Trigger error in /api/sponsors (e.g., invalid MongoDB query): Confirm 500 JSON response with error message, stack trace in grok.log.
 *   - Test async route (e.g., GET /sponsors): Verify catchErrors handles errors, returns JSON response.
 *   - Check grok.log: Confirm error logs with timestamps, no import errors.
 * Future Enhancements:
 *   - Add custom error types for specific scenarios (e.g., ValidationError) (Sprint 4).
 *   - Integrate error tracking with Sentry for production (Sprint 5).
 *   - Support localized error messages for multi-language support (Sprint 6).
 * Self-Notes:
 *   - Nate: Created errorHandlers.js to resolve MODULE_NOT_FOUND, ensuring valid middleware exports (04/23/2025).
 *   - Nate: Preserved error handling functionality, added winston logging for traceability (04/23/2025).
 *   - Nate: Triple-checked middleware compatibility with app.js and coreApi.js (04/23/2025).
 *   - Nate: Added comprehensive notes for clarity, scalability, and alignment with IDURAR ERP/CRM goals (04/23/2025).
 */
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../grok.log'), maxsize: 1024 * 1024 * 10 }),
    new winston.transports.Console(),
  ],
});

// Middleware to handle 404 errors
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  logger.error(`404 Not Found`, { url: req.originalUrl, method: req.method });
  res.status(404).json({
    success: false,
    message: error.message,
  });
};

// Middleware to handle all errors
const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  logger.error(`Server Error: ${message}`, {
    status: statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

// Wrapper for async route handlers to catch errors
const catchErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    logger.error(`Async Error: ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
    next(err);
  });
};

module.exports = { notFound, errorHandler, catchErrors };
