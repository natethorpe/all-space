/*
 * File Path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\controllers\coreControllers\adminAuth\index.js
 * Purpose: Admin authentication controller for IDURAR ERP CRM.
 * Updates:
 *   - 04/07/2025: Synced token generation with auth.js, added debug logs.
 *     - Why: 401 Invalid token errors on /api/sponsors.
 *     - How: Ensured JWT_SECRET usage, aligned payload, logged token.
 *     - Impact: Tokens validate in auth.js, fixes dashboard access.
 *   - 04/08/2025 (Tonight): Updated imports to use db.js models, fixed OverwriteModelError.
 *     - Why: Duplicate Admin/AdminPassword models crashed server (User logs, 20:31 UTC).
 *     - How: Imported models from mongoose, removed local requires.
 *     - Test: npm start, login via /api/auth/login, expect 200.
 */

const mongoose = require('../../../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { appendLog } = require('../../../utils/fileUtils');

const Admin = mongoose.model('Admin');
const AdminPassword = mongoose.model('AdminPassword');

console.log('Loading adminAuth/index.js');

const login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email });

  const admin = await Admin.findOne({ email });
  if (!admin) {
    console.log('Admin not found');
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No account with this email has been registered.',
    });
  }

  const adminPassword = await AdminPassword.findOne({ user: admin._id });
  if (!adminPassword) {
    console.log('No password record found');
    return res.status(403).json({
      success: false,
      result: null,
      message: 'No password set for this account.',
    });
  }

  const isMatch = await bcrypt.compare(password, adminPassword.password);
  console.log('Password match:', isMatch);
  if (!isMatch) {
    console.log('Password validation failed');
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Incorrect email or password.',
    });
  }

  const token = jwt.sign(
    { _id: admin._id, email: admin.email, role: admin.role || 'owner' },
    process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome',
    { expiresIn: '24h' }
  );
  console.log('Token generated:', token);

  res.status(200).json({
    success: true,
    result: {
      token,
      role: admin.role || 'owner',
      _id: admin._id,
      name: admin.name || 'Admin',
      email: admin.email,
    },
    message: 'Successfully logged in.',
  });
};

const logout = async (req, res) => {
  console.log('Logout:', req.user.email);
  res.status(200).json({
    success: true,
    result: null,
    message: 'Successfully logged out.',
  });
};

const forgetPassword = async (req, res) => {
  const { email } = req.body;
  console.log('Forget password attempt:', { email });
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ success: false, message: 'No account with this email exists' });
    const adminPassword = await AdminPassword.findOne({ user: admin._id });
    if (!adminPassword) return res.status(403).json({ success: false, message: 'No password set for this account' });
    const resetToken = jwt.sign({ _id: admin._id, email }, process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome', { expiresIn: '1h' });
    console.log('Reset token:', resetToken);
    res.status(200).json({ success: true, result: { resetToken }, message: 'Password reset instructions sent (simulated)' });
  } catch (error) {
    console.error('Forget password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

const resetPassword = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
};

const isValidAuthToken = async (req, res, next) => {
  console.log('isValidAuthToken (adminAuth): Headers:', req.headers);
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    await appendLog('ERROR_LOG.md', `# Auth Error\nTimestamp: ${new Date().toISOString()}\nPath: ${req.path}\nMethod: ${req.method}\nError: No token provided`);
    return res.status(401).json({ success: false, message: 'Authentication required: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome');
    console.log('Token decoded:', decoded);
    const admin = await Admin.findById(decoded._id);
    if (!admin) {
      await appendLog('ERROR_LOG.md', `# Auth Error\nTimestamp: ${new Date().toISOString()}\nPath: ${req.path}\nMethod: ${req.method}\nError: User not found`);
      return res.status(401).json({ success: false, message: 'Invalid token: User not found' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    await appendLog('ERROR_LOG.md', `# Auth Error\nTimestamp: ${new Date().toISOString()}\nPath: ${req.path}\nMethod: ${req.method}\nError: ${err.message}`);
    return res.status(401).json({ success: false, message: `Authentication failed: ${err.message}` });
  }
};

module.exports = { login, logout, forgetPassword, resetPassword, isValidAuthToken };
