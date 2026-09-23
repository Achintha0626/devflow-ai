const { z } = require("zod");

const commentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
}).strict();

module.exports = {
  createCommentSchema: commentSchema,
  updateCommentSchema: commentSchema,
};
