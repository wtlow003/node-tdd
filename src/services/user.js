const bcrypt = require("bcrypt");
const User = require("../models/user");

async function save(body) {
  const hash = await bcrypt.hash(body.password, 10);
  const user = { ...body, password: hash };
  // save user in db
  await User.create(user);
}

async function findByEmail(email) {
  return await User.findOne({ where: { email: email } });
}

module.exports = { save, findByEmail };
