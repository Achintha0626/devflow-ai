const express = require("express");
const { register } = require("./auth.controller");
const validate = require("../../middleware/validate");
const { registerSchema } = require("./auth.validation");

const router = express.Router();

router.post("/register", validate(registerSchema), register);

module.exports = router;
