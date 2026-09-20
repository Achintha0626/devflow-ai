const bcrypt = require("bcrypt");
const prisma = require("../../config/prisma");

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
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
};

module.exports = {
  registerUser,
};