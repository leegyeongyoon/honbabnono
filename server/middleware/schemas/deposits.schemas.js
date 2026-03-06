const { z } = require('zod');

/**
 * Schema for payment preparation (POST /deposits/prepare)
 */
const preparePaymentSchema = z.object({
  amount: z
    .number({ required_error: '결제 금액을 입력해주세요.', invalid_type_error: '결제 금액은 숫자여야 합니다.' })
    .int('결제 금액은 정수여야 합니다.')
    .min(100, '최소 결제 금액은 100원입니다.')
    .max(1000000, '최대 결제 금액은 1,000,000원입니다.'),

  meetupId: z
    .union([
      z.number().int().positive('유효한 약속 ID가 아닙니다.'),
      z.string().min(1, '약속 ID를 입력해주세요.'),
    ], { required_error: '약속 ID를 입력해주세요.' }),

  paymentMethod: z
    .string()
    .max(50, '결제 수단은 50자 이하여야 합니다.')
    .optional(),
});

/**
 * Schema for payment verification (POST /deposits/verify)
 */
const verifyPaymentSchema = z.object({
  impUid: z
    .string({ required_error: 'impUid가 필요합니다.' })
    .min(1, 'impUid가 필요합니다.')
    .max(255, 'impUid는 255자 이하여야 합니다.'),

  merchantUid: z
    .string({ required_error: 'merchantUid가 필요합니다.' })
    .min(1, 'merchantUid가 필요합니다.')
    .max(255, 'merchantUid는 255자 이하여야 합니다.'),

  depositId: z
    .union([
      z.number().int().positive(),
      z.string().min(1),
    ])
    .optional(),
});

module.exports = {
  preparePaymentSchema,
  verifyPaymentSchema,
};
