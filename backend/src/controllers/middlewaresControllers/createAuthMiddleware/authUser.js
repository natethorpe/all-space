// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\controllers\middlewaresControllers\createAuthMiddleware\authUser.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

console.log('Loading authUser.js (version 12 - confirmed load)');

const authUser = async (req, res, { user, databasePassword, password, UserPasswordModel }) => {
  console.log('Inside authUser function for:', user.email);
  try {
    console.log('Comparing passwords:', { provided: password, stored: databasePassword.password });
    const isMatch = await bcrypt.compare(password, databasePassword.password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1y' }
    );
    console.log('Token generated:', token);

    // Store token in loggedSessions
    if (!databasePassword.loggedSessions) databasePassword.loggedSessions = [];
    databasePassword.loggedSessions.push(token);
    await databasePassword.save();
    console.log('Token saved to loggedSessions:', databasePassword.loggedSessions);

    return res.status(200).json({
      success: true,
      result: {
        _id: user._id,
        name: user.name,
        surname: user.surname || null,
        role: user.role,
        email: user.email,
        photo: user.photo || null,
        token,
        maxAge: user.role === 'manager' ? 365 : null,
      },
      message: 'Successfully login user',
    });
  } catch (error) {
    console.error('Error in authUser:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error,
    });
  }
};

module.exports = authUser;
