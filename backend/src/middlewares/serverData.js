// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\backend\src\middlewares\serverData.js
const mongoose = require('mongoose');
exports.getData = ({ model }) => {
  const Model = mongoose.model(model);
  const result = Model.find({ removed: false, enabled: true });
  return result;
};

exports.getOne = ({ model, id }) => {
  const Model = mongoose.model(model);
  const result = Model.findOne({ _id: id, removed: false });
  return result;
};
