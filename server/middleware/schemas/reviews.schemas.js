const { z } = require('zod');

const createReviewSchema = z.object({
  meetupId: z.string().uuid(),
  revieweeId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(1000).optional(),
  tags: z.array(z.string()).max(10).optional(),
  isAnonymous: z.boolean().optional().default(false),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(1000).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

module.exports = { createReviewSchema, updateReviewSchema };
