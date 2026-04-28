const { z } = require('zod');

/**
 * Schema for creating an order (POST /orders)
 */
const createOrderSchema = z.object({
  reservation_id: z
    .string({ required_error: '예약 ID를 입력해주세요.' })
    .uuid('유효한 예약 ID를 입력해주세요.'),

  items: z
    .array(
      z.object({
        menu_id: z
          .string({ required_error: '메뉴 ID를 입력해주세요.' })
          .uuid('유효한 메뉴 ID를 입력해주세요.'),

        quantity: z
          .number({ required_error: '수량을 입력해주세요.', invalid_type_error: '수량은 숫자여야 합니다.' })
          .int('수량은 정수여야 합니다.')
          .min(1, '수량은 1개 이상이어야 합니다.')
          .max(99, '수량은 99개 이하여야 합니다.'),

        options: z
          .array(z.string())
          .optional(),
      }),
      { required_error: '주문 항목을 입력해주세요.' }
    )
    .min(1, '최소 1개 이상의 메뉴를 주문해야 합니다.'),
});

/**
 * Schema for updating cooking status (PUT /orders/:id/cooking-status) - merchant
 */
const updateCookingStatusSchema = z.object({
  cooking_status: z.enum(['preparing', 'cooking', 'ready', 'served'], {
    required_error: '조리 상태를 입력해주세요.',
    invalid_type_error: '유효한 조리 상태를 입력해주세요. (preparing, cooking, ready, served)',
  }),
});

module.exports = {
  createOrderSchema,
  updateCookingStatusSchema,
};
