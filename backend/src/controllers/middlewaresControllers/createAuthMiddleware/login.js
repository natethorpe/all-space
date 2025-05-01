// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\controllers\middlewaresControllers\createAuthMiddleware\login.js
console.log('Loading login.js (version 3 - confirmed load)');

const Joi = require('joi');
const mongoose = require('mongoose');
const authUser = require('./authUser');

const login = async (req, res, { userModel }) => {
  console.log('Executing login function for:', req.body.email);

  const UserModel = mongoose.model(userModel);
  const UserPasswordModel = mongoose.model('AdminPassword');

  const { email, password } = req.body;

  try {
    console.log('Login attempt:', { email });
    const user = await UserModel.findOne({ email, removed: false });
    if (!user) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No account with this email exists',
      });
    }
    console.log('User found:', user);

    let databasePassword = await UserPasswordModel.findOne({ user: user._id, removed: false });
    if (!databasePassword) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No password set for this account',
      });
    }
    console.log('Password found:', databasePassword);

    console.log('Before calling authUser');
    await authUser(req, res, { user, databasePassword, password, UserPasswordModel });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error,
    });
  }
};

module.exports = login;
