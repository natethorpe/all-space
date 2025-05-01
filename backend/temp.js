const bcrypt = require('bcrypt');
const saltRounds = 10;
const newPassword = 'newStaffPassword123'; // Replace with your desired password
bcrypt.hash(newPassword, saltRounds, (err, hash) => {
  if (err) console.error(err);
  console.log('Hashed password:', hash);
});
