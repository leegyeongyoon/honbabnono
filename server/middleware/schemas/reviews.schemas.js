const { z } = require('zod');

const createReviewSchema = z.object({
  meetupId: z.string().uuid().optional(),
  revieweeId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10, '리뷰는 최소 10자 이상 작성해주세요').max(500).optional(),
  comment: z.string().min(1).max(1000).optional(),
  tags: z.array(z.string()).max(10).optional(),
  images: z.array(z.string().url()).max(3, '사진은 최대 3장까지 첨부할 수 있습니다').optional().default([]),
  isAnonymous: z.boolean().optional().default(false),
  targetUserId: z.string().uuid().optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  content: z.string().min(10).max(500).optional(),
  comment: z.string().min(1).max(1000).optional(),
  tags: z.array(z.string()).max(10).optional(),
  images: z.array(z.string().url()).max(3, '사진은 최대 3장까지 첨부할 수 있습니다').optional(),
});

const replyReviewSchema = z.object({
  reply: z.string().min(1, '답변을 입력해주세요').max(300),
});

module.exports = { createReviewSchema, updateReviewSchema, replyReviewSchema };
