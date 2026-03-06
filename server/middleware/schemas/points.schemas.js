const { z } = require('zod');

const earnPointsSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().max(200).optional(),
  meetupId: z.string().uuid().optional(),
});

const usePointsSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().max(200).optional(),
  meetupId: z.string().uuid().optional(),
});

module.exports = { earnPointsSchema, usePointsSchema };
