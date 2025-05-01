/*
 * File Path: backend/src/routes/auth/index.js
 * Purpose: Defines authentication API routes for IDURAR ERP CRM, enabling secure admin access through login, logout, password reset, and profile management.
 * How It Works:
 *   - Provides Express routes:
 *     - POST /api/auth/login: Authenticates admins, returns JWT with user data (email, role, name, tierAccess).
 *     - POST /api/auth/logout: Clears client-side auth token (localStorage).
 *     - POST /api/auth/forgetpassword: Initiates password reset with a token.
 *     - POST /api/auth/resetpassword: Resets password using a valid token.
 *     - GET /api/auth/validate: Validates JWT tokens.
 *     - POST /api/auth/register: Registers new admins.
 *     - PUT /api/auth/updateprofile: Updates admin profiles.
 *     - GET /api/auth/debug: Inspects/resets Admin and AdminPassword documents.
 *   - Uses bcrypt for password hashing and jsonwebtoken for token generation/verification.
 *   - Logs requests and errors to MongoDB Log model via logUtils.js.
 * Mechanics:
 *   - Login queries Admin and AdminPassword models for authentication.
 *   - Creates default admin (admin@idurarapp.com/admin123) with retry logic.
 *   - Error handling returns appropriate HTTP status codes (400, 401, 404, 500, 503).
 * Dependencies:
 *   - express: Web framework for routing (version 5.1.0).
 *   - bcrypt: Password hashing (version 5.1.1).
 *   - jsonwebtoken: JWT token generation/verification (version 9.0.2).
 *   - ../../db: MongoDB ORM via getModel (version 8.7.3).
 *   - ../../utils/logUtils: MongoDB logging utilities.
 * Dependents:
 *   - app.js: Mounts this router at /api/auth.
 *   - Frontend components (e.g., GrokUI.jsx, Login.jsx): Use these endpoints.
 * Why It’s Here:
 *   - Enables secure admin access for IDURAR ERP CRM, fixing login issues (10/23/2024).
 *   - Supports Sprint 2 by fixing 401 and 500 errors (04/23/2025).
 * Change Log:
 *   - 10/23/2024: Updated to handle Admin schema with password, name, tierAccess fields.
 *   - 04/23/2025: Fixed 401 Unauthorized by verifying password hash.
 *   - 04/23/2025: Fixed 500 error due to domesticate reference.
 *   - 04/28/2025: Fixed MissingSchemaError with getModel.
 *   - 04/30/2025: Fixed 401 by adding default admin creation.
 *   - 05/01/2025: Fixed persistent 401 with AdminPassword retry logic.
 *   - 05/02/2025: Enhanced AdminPassword fix with invalid document deletion, added /debug endpoint.
 *   - 05/03/2025: Fixed 500 error due to transactions; removed for standalone MongoDB.
 *   - 05/03/2025: Fixed Admin.findOne is not a function error.
 *     - Why: Admin model lacked findOne method, causing login failure (User, 05/03/2025).
 *     - How: Moved getModel calls inside routes, used logUtils.js, added model validation, simplified default admin creation.
 *     - Test: Run `npm start`, POST /api/auth/login with admin@idurarapp.com/admin123, verify 200 response, idurar_db.logs shows login, no Admin.findOne errors.
 * Test Instructions:
 *   - Run `npm start`, check idurar_db.logs for “Mounted /api/auth successfully”.
 *   - POST /api/auth/login with { email: "admin@idurarapp.com", password: "admin123" }: Expect 200, token with name, tierAccess.
 *   - POST with invalid credentials: Expect 401, “Invalid credentials” in idurar_db.logs.
 *   - GET /api/auth/debug: Verify Admin and AdminPassword documents.
 *   - POST /api/auth/forgetpassword with { email: "admin@idurarapp.com" }: Expect 200, token in AdminPassword.
 *   - POST /api/auth/resetpassword with valid token: Expect 200, updated password.
 *   - Check idurar_db: Verify Admin and AdminPassword documents.
 *   - Check idurar_db.logs: Confirm login attempts, no grok.log writes.
 * Future Enhancements:
 *   - Add nodemailer for password reset emails (Sprint 4).
 *   - Implement MFA (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed 500, 401 errors and added default admin (04/23/2025–05/02/2025).
 *   - Nate: Fixed Admin.findOne error with deferred model access (05/03/2025).
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getModel } = require('../../db');
const { logInfo, logWarn, logError, logDebug } = require('../../utils/logUtils');

const router = express.Router();

async function validateModels() {
  try {
    const Admin = await getModel('Admin');
    const AdminPassword = await getModel('AdminPassword');
    if (typeof Admin.findOne !== 'function' || typeof AdminPassword.create !== 'function') {
      throw new Error('Invalid Admin or AdminPassword model: Missing required methods');
    }
    return { Admin, AdminPassword };
  } catch (err) {
    await logError('Failed to validate authentication models', 'auth', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });
    throw err;
  }
}

// POST /api/auth/login - Authenticate admin user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  await logInfo(`Login attempt: ${email}`, 'auth', { timestamp: new Date().toISOString() });

  if (!email || !password) {
    await logWarn('Missing email or password', 'auth', { email, timestamp: new Date().toISOString() });
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const { Admin, AdminPassword } = await validateModels();
    let admin = await Admin.findOne({ email, removed: false, enabled: true });

    if (!admin) {
      // Create default admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = new Admin({
        email: 'admin@idurarapp.com',
        password: hashedPassword,
        role: 'admin',
        name: 'Default Admin',
        tierAccess: [],
        removed: false,
        enabled: true,
        created: new Date(),
      });
      await admin.save();
      await AdminPassword.create({
        email: 'admin@idurarapp.com',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await logInfo('Created default admin: admin@idurarapp.com', 'auth', {
        adminId: admin._id,
        timestamp: new Date().toISOString(),
      });
    }
    await logDebug(`Admin found: ${admin._id}`, 'auth', { timestamp: new Date().toISOString() });

    // Delete invalid AdminPassword documents
    const deleteResult = await AdminPassword.deleteMany({ email, password: { $in: [null, ''] } });
    await logInfo(`Deleted ${deleteResult.deletedCount} invalid AdminPassword documents for ${email}`, 'auth', {
      timestamp: new Date().toISOString(),
    });

    let adminPassword = await AdminPassword.findOne({ email });
    if (!adminPassword || !adminPassword.password) {
      // Create or update AdminPassword with retry
      const hashedPassword = await bcrypt.hash('admin123', 10);
      let retries = 0;
      const maxRetries = 5;
      while (retries < maxRetries) {
        try {
          const result = await AdminPassword.updateOne(
            { email },
            {
              $set: {
                email,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
          await logInfo(`Created/updated AdminPassword for ${email}`, 'auth', {
            attempt: retries + 1,
            result,
            timestamp: new Date().toISOString(),
          });
          break;
        } catch (err) {
          retries++;
          await logWarn(`AdminPassword creation attempt ${retries}/${maxRetries} failed: ${err.message}`, 'auth', {
            email,
            timestamp: new Date().toISOString(),
          });
          if (retries >= maxRetries) {
            throw new Error(`Failed to create AdminPassword after ${maxRetries} attempts: ${err.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
      adminPassword = await AdminPassword.findOne({ email });
    }

    if (!adminPassword || !adminPassword.password) {
      await logError(`Failed to create valid AdminPassword for ${email}`, 'auth', {
        adminPassword: adminPassword ? adminPassword._id : 'null',
        timestamp: new Date().toISOString(),
      });
      return res.status(500).json({ success: false, message: 'Failed to initialize admin password' });
    }
    await logDebug(`AdminPassword found: ${adminPassword._id}`, 'auth', { timestamp: new Date().toISOString() });

    const isMatch = await bcrypt.compare(password, adminPassword.password);
    await logDebug(`Password comparison result: ${isMatch}`, 'auth', { timestamp: new Date().toISOString() });
    if (!isMatch) {
      await logWarn('Invalid password', 'auth', { email, timestamp: new Date().toISOString() });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const tokenPayload = {
      _id: admin._id,
      email: admin.email,
      role: admin.role || 'admin',
      name: admin.name || '',
      tierAccess: admin.tierAccess || [],
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome',
      { expiresIn: '1h' }
    );

    const authData = {
      success: true,
      result: {
        _id: admin._id,
        email: admin.email,
        role: admin.role || 'admin',
        name: admin.name || '',
        tierAccess: admin.tierAccess || [],
        token,
      },
    };

    await logInfo('Login successful', 'auth', {
      email,
      adminId: admin._id,
      token: token.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    });
    res.status(200).json(authData);
  } catch (error) {
    await logError(`Login error: ${error.message}`, 'auth', {
      email,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    if (error.message.includes('Invalid Admin or AdminPassword model')) {
      return res.status(503).json({ success: false, message: 'Authentication service temporarily unavailable' });
    }
    if (error.name === 'MongoServerError' && (error.code === 11000 || error.code === 112)) {
      await logWarn(`MongoDB write conflict: ${error.message}`, 'auth', { email, timestamp: new Date().toISOString() });
      return res.status(500).json({ success: false, message: 'Database write conflict, please try again' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/auth/debug - Debug Admin and AdminPassword documents
router.get('/debug', async (req, res) => {
  try {
    const { Admin, AdminPassword } = await validateModels();
    const admins = await Admin.find({ email: 'admin@idurarapp.com' });
    const adminPasswords = await AdminPassword.find({ email: 'admin@idurarapp.com' });
    const adminCount = await Admin.countDocuments({ email: 'admin@idurarapp.com' });
    const adminPasswordCount = await AdminPassword.countDocuments({ email: 'admin@idurarapp.com' });

    if (req.query.reset) {
      await Admin.deleteMany({ email: 'admin@idurarapp.com' });
      await AdminPassword.deleteMany({ email: 'admin@idurarapp.com' });
      await logInfo('Reset Admin and AdminPassword documents for admin@idurarapp.com', 'auth', {
        timestamp: new Date().toISOString(),
      });
      return res.status(200).json({ success: true, message: 'Admin and AdminPassword documents reset' });
    }

    await logInfo('Debug endpoint accessed', 'auth', { adminCount, adminPasswordCount, timestamp: new Date().toISOString() });
    res.status(200).json({
      success: true,
      adminCount,
      adminPasswordCount,
      admins,
      adminPasswords,
    });
  } catch (error) {
    await logError(`Debug endpoint error: ${error.message}`, 'auth', {
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/auth/logout - Log out admin user
router.post('/logout', async (req, res) => {
  try {
    await logInfo('Logout requested', 'auth', { timestamp: new Date().toISOString() });
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    await logError(`Logout error: ${error.message}`, 'auth', {
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/auth/forgetpassword - Initiate password reset
router.post('/forgetpassword', async (req, res) => {
  const { email } = req.body;
  await logInfo(`Password reset requested for ${email}`, 'auth', { timestamp: new Date().toISOString() });

  if (!email) {
    await logWarn('Missing email for password reset', 'auth', { timestamp: new Date().toISOString() });
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const { Admin, AdminPassword } = await validateModels();
    const admin = await Admin.findOne({ email });
    if (!admin) {
      await logWarn('Admin not found for password reset', 'auth', { email, timestamp: new Date().toISOString() });
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const token = jwt.sign(
      { _id: admin._id, email: admin.email },
      process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome',
      { expiresIn: '1h' }
    );

    const result = await AdminPassword.updateOne(
      { email },
      { $set: { token, updatedAt: new Date() } },
      { upsert: true }
    );
    await logInfo('Password reset token generated', 'auth', {
      email,
      result,
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ success: true, message: 'Password reset token generated' });
  } catch (error) {
    await logError(`Password reset error: ${error.message}`, 'auth', {
      email,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/auth/resetpassword - Reset password with token
router.post('/resetpassword', async (req, res) => {
  const { email, token, newPassword } = req.body;
  await logInfo(`Password reset attempt for ${email}`, 'auth', { timestamp: new Date().toISOString() });

  if (!email || !token || !newPassword) {
    await logWarn('Missing reset data', 'auth', { timestamp: new Date().toISOString() });
    return res.status(400).json({ success: false, message: 'Email, token, and new password are required' });
  }

  try {
    const { Admin, AdminPassword } = await validateModels();
    const passwordReset = await AdminPassword.findOne({ email, token });
    if (!passwordReset) {
      await logWarn('Invalid or expired reset token', 'auth', { email, timestamp: new Date().toISOString() });
      return res.status(401).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome');
    const admin = await Admin.findOne({ _id: decoded._id, email });
    if (!admin) {
      await logWarn('Admin not found for password reset', 'auth', { email, timestamp: new Date().toISOString() });
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await AdminPassword.updateOne(
      { email },
      { $set: { password: hashedPassword, token: null, updatedAt: new Date() } }
    );
    await logInfo('Password reset successful', 'auth', {
      email,
      result,
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    await logError(`Password reset error: ${error.message}`, 'auth', {
      email,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/auth/validate - Validate JWT token
router.get('/validate', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  await logInfo('Token validation attempt', 'auth', { timestamp: new Date().toISOString() });

  if (!token) {
    await logWarn('No token provided', 'auth', { timestamp: new Date().toISOString() });
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const { Admin } = await validateModels();
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chelsiemygirl2025420isawsome');
    const admin = await Admin.findOne({ _id: decoded._id, email: decoded.email });
    if (!admin) {
      await logWarn('Admin not found for token validation', 'auth', {
        email: decoded.email,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    await logInfo('Token validation successful', 'auth', {
      email: decoded.email,
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({ success: true });
  } catch (error) {
    await logError(`Token validation error: ${error.message}`, 'auth', {
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
  }
});

// POST /api/auth/register - Register new admin user
router.post('/register', async (req, res) => {
  const { email, password, role, name, tierAccess } = req.body;
  await logInfo(`Registration attempt for ${email}`, 'auth', { timestamp: new Date().toISOString() });

  if (!email || !password) {
    await logWarn('Missing registration data', 'auth', { timestamp: new Date().toISOString() });
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const { Admin, AdminPassword } = await validateModels();
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      await logWarn('Admin already exists', 'auth', { email, timestamp: new Date().toISOString() });
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      email,
      password: hashedPassword,
      role: role || 'admin',
      name: name || '',
      tierAccess: tierAccess || [],
      removed: false,
      enabled: true,
      created: new Date(),
    });
    await admin.save();
    const result = await AdminPassword.create({ email, password: hashedPassword });
    await logInfo('Registration successful', 'auth', {
      email,
      adminId: admin._id,
      result,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json({ success: true, message: 'Admin registered successfully' });
  } catch (error) {
    await logError(`Registration error: ${error.message}`, 'auth', {
      email,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/auth/updateprofile - Update admin profile
router.put('/updateprofile', async (req, res) => {
  const { email, newEmail, role, name, tierAccess } = req.body;
  await logInfo(`Profile update attempt for ${email}`, 'auth', { timestamp: new Date().toISOString() });

  if (!email) {
    await logWarn('Missing email for profile update', 'auth', { timestamp: new Date().toISOString() });
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const { Admin, AdminPassword } = await validateModels();
    const admin = await Admin.findOne({ email });
    if (!admin) {
      await logWarn('Admin not found for profile update', 'auth', { email, timestamp: new Date().toISOString() });
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (newEmail && newEmail !== email) {
      const existingAdmin = await Admin.findOne({ email: newEmail });
      if (existingAdmin) {
        await logWarn('New email already in use', 'auth', { newEmail, timestamp: new Date().toISOString() });
        return res.status(400).json({ success: false, message: 'New email already in use' });
      }
      admin.email = newEmail;
      await AdminPassword.updateOne({ email }, { $set: { email: newEmail } });
    }

    if (role) admin.role = role;
    if (name) admin.name = name;
    if (tierAccess) admin.tierAccess = tierAccess;
    admin.updatedAt = new Date();
    await admin.save();

    await logInfo('Profile update successful', 'auth', {
      email: admin.email,
      adminId: admin._id,
      timestamp: new Date().toISOString(),
    });
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      result: { email: admin.email, role: admin.role, name: admin.name, tierAccess: admin.tierAccess },
    });
  } catch (error) {
    await logError(`Profile update error: ${error.message}`, 'auth', {
      email,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
