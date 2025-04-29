// Quick setup script
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
mongoose.connect('mongodb://localhost:27017/idurar_db');
const Admin = mongoose.model('Admin', { email: String, name: String, role: String });
const AdminPassword = mongoose.model('AdminPassword', { password: String, user: mongoose.Schema.Types.ObjectId });
(async () => {
  const admin = await Admin.create({ email: 'admin@idurarapp.com', name: 'IDURAR', role: 'owner' });
  const hash = await bcrypt.hash('admin123', 10);
  await AdminPassword.create({ password: hash, user: admin._id });
  console.log('Admin created');
  mongoose.connection.close();
})();
