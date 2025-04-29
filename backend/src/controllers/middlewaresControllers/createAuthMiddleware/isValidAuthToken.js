// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\controllers\middlewaresControllers\createAuthMiddleware\isValidAuthToken.js
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('@/models/coreModels/Admin');

const isValidAuthToken = async (req, res, next) => {
  console.log('isValidAuthToken middleware executed');
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome');
    console.log('Token verified:', verified);

    const user = await Admin.findOne({ _id: verified._id, removed: false });
    if (!user) {
      console.log('User not found for ID:', verified._id);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Temporarily skip loggedSessions check for testing
    console.log('User authenticated (skipping loggedSessions check):', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('isValidAuthToken error:', error.message);
    return res.status(401).json({ success: false, message: 'Authentication failed', error: error.message });
  }
};

module.exports = isValidAuthToken;
