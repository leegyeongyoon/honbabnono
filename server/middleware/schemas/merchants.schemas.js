const { z } = require('zod');

/**
 * Schema for merchant registration (POST /merchants/register)
 */
const registerMerchantSchema = z.object({
  business_number: z
    .string({ required_error: '사업자등록번호를 입력해주세요.' })
    .min(10, '사업자등록번호는 10자 이상이어야 합니다.')
    .max(12, '사업자등록번호는 12자 이하여야 합니다.'),

  business_name: z
    .string()
    .max(100, '상호명은 100자 이하여야 합니다.')
    .optional(),

  representative_name: z
    .string()
    .max(50, '대표자명은 50자 이하여야 합니다.')
    .optional(),

  bank_name: z
    .string()
    .max(50, '은행명은 50자 이하여야 합니다.')
    .optional(),

  bank_account: z
    .string()
    .max(50, '계좌번호는 50자 이하여야 합니다.')
    .optional(),

  bank_holder: z
    .string()
    .max(50, '예금주명은 50자 이하여야 합니다.')
    .optional(),

  verification_doc_url: z
    .string()
    .url('유효한 서류 URL을 입력해주세요.')
    .optional(),
});

/**
 * Schema for updating merchant info (PUT /merchants/me)
 */
const updateMerchantSchema = z.object({
  bank_name: z
    .string()
    .max(50, '은행명은 50자 이하여야 합니다.')
    .optional(),

  bank_account: z
    .string()
    .max(50, '계좌번호는 50자 이하여야 합니다.')
    .optional(),

  bank_holder: z
    .string()
    .max(50, '예금주명은 50자 이하여야 합니다.')
    .optional(),
});

/**
 * Schema for admin merchant verification (POST /merchants/:id/verify)
 */
const verifyMerchantSchema = z.object({
  verification_status: z
    .enum(['verified', 'rejected'], {
      required_error: '인증 상태를 선택해주세요.',
      invalid_type_error: '인증 상태는 verified 또는 rejected 이어야 합니다.',
    }),

  reason: z
    .string()
    .max(500, '사유는 500자 이하여야 합니다.')
    .optional(),
});

module.exports = {
  registerMerchantSchema,
  updateMerchantSchema,
  verifyMerchantSchema,
};
