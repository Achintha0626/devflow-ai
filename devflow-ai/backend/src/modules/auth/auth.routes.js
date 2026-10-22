const express = require("express");
const { register, login, refresh, me, logout } = require("./auth.controller");
const validate = require("../../middleware/validate");
const { registerSchema, loginSchema, refreshTokenSchema } = require("./auth.validation");
const authenticate = require("../../middleware/authenticate");
const { createRateLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

const authWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const loginMax = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || process.env.AUTH_RATE_LIMIT_MAX) || 20;
const registerMax = Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX || process.env.AUTH_RATE_LIMIT_MAX) || 20;
const refreshMax = Number(process.env.AUTH_REFRESH_RATE_LIMIT_MAX) || 60;

const loginLimiter = createRateLimiter({
  windowMs: authWindowMs,
  max: loginMax,
  message: "Too many login attempts. Please try again later.",
});

const registerLimiter = createRateLimiter({
  windowMs: authWindowMs,
  max: registerMax,
  message: "Too many registration attempts. Please try again later.",
});

const refreshLimiter = createRateLimiter({
  windowMs: authWindowMs,
  max: refreshMax,
  message: "Too many token refresh attempts. Please try again later.",
});

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refreshLimiter, validate(refreshTokenSchema), refresh);
router.get("/me", authenticate, me);
router.post("/logout", validate(refreshTokenSchema), logout);

module.exports = router;
