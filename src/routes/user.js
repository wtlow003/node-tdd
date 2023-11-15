const express = require("express");
const UserService = require("../services/user");
// const validateUserMiddleware = require("../middlewares/user");
const { check, validationResult } = require("express-validator");

const router = express.Router();

router.post(
  "/api/1.0/users",
  // express-validator used in placed of custom validateUserMiddleware
  [
    check("username")
      .notEmpty()
      .withMessage("username_null")
      .bail()
      .isLength({ min: 4, max: 32 })
      .withMessage("username_length"),
    check("email")
      .notEmpty()
      .withMessage("email_null")
      .bail()
      .isEmail()
      .withMessage("email_format")
      .bail()
      .custom(async (email) => {
        const user = await UserService.findByEmail(email);
        if (user) {
          throw new Error("email_inuse");
        }
      }),
    check("password")
      .notEmpty()
      .withMessage("password_null")
      .bail()
      .isLength({ min: 6 })
      .withMessage("password_length")
      .bail()
      .matches(/^(?=.*[a-z])(?=[A-Z])(?=.*\d).*$/)
      .withMessage("password_pattern"),
  ],
  async (req, res) => {
    // if (req.validationErrors) {
    //   const response = { validationErrors: { ...req.validationErrors } };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors
        .array()
        .forEach((error) => (validationErrors[error.path] = req.t(error.msg)));
      return res.status(400).send({ validationErrors: validationErrors });
    }
    // hash and salt password
    await UserService.save(req.body);
    return res.status(201).send({ message: "User created!" });
  },
);

module.exports = router;
