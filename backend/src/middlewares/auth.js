/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\middlewares\auth.js
 * Updates:
 *   - 04/07/2025 (Grok 3): Fixed JWT_SECRET typo.
 *     - Why: Mismatch with .env (chelsiemygirl2025420isawsome vs chelsiemygir12025420isawsome).
 *     - How: Corrected default to match .env.
 *     - Impact: Should validate tokens from coreAuth.js.
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({
  email: String,
  role: String,
}));

const JWT_SECRET = process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome'; // Fixed typo

const isValidAuthToken = async (req, res, next) => {
  try {
    console.log('Auth middleware: Incoming request headers:', req.headers);
    const authHeader = req.headers.authorization;
    console.log('Auth middleware: Authorization header:', authHeader);

    if (!authHeader) {
      console.log('Auth middleware: No Authorization header present');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('Auth middleware: Malformed Authorization header');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    console.log('Auth middleware: Token extracted:', token);
    console.log('Auth middleware: Using JWT_SECRET:', JWT_SECRET);

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Auth middleware: Token decoded:', decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware: Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
  }
};

module.exports = { isValidAuthToken };
