const validateUser = (req, res, next) => {
  const user = req.body;
  if (user.username === null) {
    req.validationErrors = {
      username: "Username cannot be null",
    };
  }
  if (user.email === null) {
    req.validationErrors = {
      ...req.validationErrors,
      email: "Email cannot be null",
    };
  }
  if (user.password === null) {
    req.validationErrors = {
      ...req.validationErrors,
      password: "Password cannot be null",
    };
  }
  next();
};

module.exports = validateUser;
