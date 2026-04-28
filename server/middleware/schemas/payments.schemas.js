const { z } = require('zod');

/**
 * Schema for payment preparation (POST /payments/prepare)
 */
const preparePaymentSchema = z.object({
  reservation_id: z
    .string({ required_error: '예약 ID를 입력해주세요.' })
    .uuid('유효한 예약 ID 형식이 아닙니다.'),

  amount: z
    .number({ required_error: '결제 금액을 입력해주세요.', invalid_type_error: '결제 금액은 숫자여야 합니다.' })
    .int('결제 금액은 정수여야 합니다.')
    .min(100, '최소 결제 금액은 100원입니다.'),

  payment_method: z
    .string()
    .optional()
    .default('card'),
});

/**
 * Schema for payment verification (POST /payments/verify)
 */
const verifyPaymentSchema = z.object({
  imp_uid: z
    .string({ required_error: 'imp_uid가 필요합니다.' })
    .min(1, 'imp_uid가 필요합니다.'),

  merchant_uid: z
    .string({ required_error: 'merchant_uid가 필요합니다.' })
    .min(1, 'merchant_uid가 필요합니다.'),
});

/**
 * Schema for payment refund (POST /payments/:id/refund)
 */
const refundPaymentSchema = z.object({
  reason: z
    .string()
    .optional(),
});

module.exports = {
  preparePaymentSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
};
