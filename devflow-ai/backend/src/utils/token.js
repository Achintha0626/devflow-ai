const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const generateAccessToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] });

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
};
