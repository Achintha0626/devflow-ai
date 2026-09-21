const prisma = require("../config/prisma");
const { verifyAccessToken } = require("../utils/token");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return res.status(401).json({ success: false, message: "Authentication required" });
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, isActive: true, createdAt: true } });
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Authentication required" });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
};

module.exports = authenticate;
