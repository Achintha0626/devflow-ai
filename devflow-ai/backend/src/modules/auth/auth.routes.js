const express = require("express");
const { register, login, refresh, me, logout } = require("./auth.controller");
const validate = require("../../middleware/validate");
const { registerSchema, loginSchema, refreshTokenSchema } = require("./auth.validation");
const authenticate = require("../../middleware/authenticate");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refresh);
router.get("/me", authenticate, me);
router.post("/logout", validate(refreshTokenSchema), logout);

module.exports = router;
