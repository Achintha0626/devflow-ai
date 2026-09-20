const { z } = require("zod");

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(72),
});

module.exports = {
  registerSchema,
};