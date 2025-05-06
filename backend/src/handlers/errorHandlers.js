/*
 * File Path: backend/src/handlers/errorHandlers.js
 * Purpose: Provides middleware for error handling and token verification in Allur Space Console.
 * How It Works:
 *   - catchErrors: Wraps async route handlers to catch and log errors.
 *   - verifyToken: Validates JWT tokens in Authorization headers for protected routes.
 *   - notFound: Handles 404 errors for undefined routes.
 *   - errorHandler: Formats and logs errors for API responses.
 * Mechanics:
 *   - catchErrors logs errors to MongoDB and passes them to errorHandler.
 *   - verifyToken decodes JWT tokens, checks expiration, and attaches user data to req.user.
 *   - notFound returns a 404 JSON response.
 *   - errorHandler logs errors and returns formatted JSON responses.
 * Dependencies:
 *   - jsonwebtoken: JWT validation (version 9.0.2).
 *   - logUtils.js: MongoDB logging.
 *   - db.js: Access to Log model.
 * Dependents:
 *   - taskRoutes.js: Uses verifyToken and catchErrors for task endpoints.
 *   - authRouter.js: Uses catchErrors for auth endpoints.
 *   - systemRoutes.js: Uses catchErrors for system endpoints.
 *   - proposalRoutes.js: Uses verifyToken and catchErrors for proposal endpoints.
 *   - app.js: Uses notFound and errorHandler globally.
 * Why It’s Here:
 *   - Centralizes error handling and token verification for Sprint 2 (04/07/2025).
 * Change Log:
 *   - 04/07/2025: Initialized error handlers and token verification (Nate).
 *   - 05/08/2025: Added detailed token verification logging (Grok).
 *   - 05/08/2025: Enhanced token error logging with JWT_SECRET details (Grok).
 *     - Why: Persistent 401 errors due to invalid token signature (User, 05/08/2025).
 *     - How: Added logging of token payload and JWT_SECRET (redacted), preserved logic.
 *     - Test: Run `npm start`, call /api/grok/tasks with invalid token, verify detailed log in grok.log.
 * Test Instructions:
 *   - Apply updated errorHandlers.js, run `npm start` in backend/.
 *   - Call GET /api/grok/tasks with invalid Authorization header, verify 401 response.
 *   - Check grok.log for "Token verification failed" with token payload and secret details.
 *   - Call /api/grok/edit with valid token, verify 200 or 400 response, no 401 errors.
 * Rollback Instructions:
 *   - Revert to errorHandlers.js.bak (`copy backend\src\handlers\errorHandlers.js.bak backend\src\handlers\errorHandlers.js`).
 *   - Verify API endpoints work (may lack detailed token error logs).
 * Future Enhancements:
 *   - Add custom error types for specific API failures (Sprint 3).
 *   - Implement token refresh endpoint integration (Sprint 4).
 * Self-Notes:
 *   - Nate: Initialized error handling for robust API responses (04/07/2025).
 *   - Grok: Enhanced token verification logging for debugging (05/08/2025).
 */

const jwt = require('jsonwebtoken');
const { logError, logDebug } = require('../utils/logUtils');
const { getModel } = require('../db');

/**
 * Middleware to catch async route errors and pass to error handler.
 * @param {Function} fn - Async route handler function.
 * @returns {Function} Middleware function.
 */
const catchErrors = (fn) => {
  console.log('errorHandlers: Initializing catchErrors', { timestamp: new Date().toISOString() });
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(async (err) => {
      await logError(`Route error: ${err.message}`, 'errorHandlers', {
        method: req.method,
        url: req.originalUrl,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      next(err);
    });
  };
};

/**
 * Middleware to verify JWT token in Authorization header.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const verifyToken = async (req, res, next) => {
  console.log('verifyToken: Initializing', { timestamp: new Date().toISOString() });
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    await logError('No token provided', 'verifyToken', {
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { email: decoded.email || decoded.current?.email };
    await logDebug('Token verified successfully', 'verifyToken', {
      token: token.slice(0, 20) + '...',
      userEmail: req.user.email,
      payload: decoded,
      secret: process.env.JWT_SECRET.slice(0, 5) + '...',
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
    next();
  } catch (err) {
    await logError('Token verification failed', 'verifyToken', {
      error: err.message,
      token: token.slice(0, 20) + '...',
      secret: process.env.JWT_SECRET.slice(0, 5) + '...',
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Middleware to handle 404 errors.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const notFound = async (req, res, next) => {
  await logError('Route not found', 'errorHandlers', {
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
  res.status(404).json({ success: false, message: 'Route not found' });
};

/**
 * Global error handler middleware.
 * @param {Error} err - Error object.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const errorHandler = async (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  await logError(`Error handler triggered: ${err.message}`, 'errorHandlers', {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = { catchErrors, verifyToken, notFound, errorHandler };
