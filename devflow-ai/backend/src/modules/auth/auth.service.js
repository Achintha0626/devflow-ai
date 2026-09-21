const bcrypt = require("bcrypt");
const prisma = require("../../config/prisma");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
} = require("../../utils/token");

const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
};

const loginUserSelect = {
  ...safeUserSelect,
  passwordHash: true,
};

const refreshExpiresAt = (token) => new Date(verifyRefreshToken(token).exp * 1000);

const registerUser = async ({ firstName, lastName, email, password }) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
    },
    select: safeUserSelect,
  });

  return user;
};

const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: loginUserSelect,
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new Error("USER_INACTIVE");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: refreshExpiresAt(refreshToken),
    },
  });

  const { passwordHash, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
};

const refreshUserTokens = async (refreshToken) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const storedToken = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!storedToken || storedToken.userId !== payload.sub || storedToken.revokedAt || storedToken.expiresAt <= now) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }
    const user = await tx.user.findUnique({ where: { id: payload.sub }, select: safeUserSelect });
    if (!user || !user.isActive) throw new Error("INVALID_REFRESH_TOKEN");
    const newRefreshToken = generateRefreshToken(user.id);
    await tx.refreshToken.update({ where: { id: storedToken.id }, data: { revokedAt: now } });
    await tx.refreshToken.create({ data: { tokenHash: hashRefreshToken(newRefreshToken), userId: user.id, expiresAt: refreshExpiresAt(newRefreshToken) } });
    return { accessToken: generateAccessToken(user.id), refreshToken: newRefreshToken };
  });
  return result;
};

const getAuthenticatedUser = async (userId) => prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect });

const revokeRefreshToken = async (refreshToken) => {
  await prisma.refreshToken.updateMany({ where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
};

module.exports = {
  registerUser,
  loginUser,
  refreshUserTokens,
  getAuthenticatedUser,
  revokeRefreshToken,
};
