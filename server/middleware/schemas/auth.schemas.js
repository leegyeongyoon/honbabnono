const { z } = require('zod');

/**
 * Schema for email registration (POST /auth/register)
 */
const registerSchema = z.object({
  email: z
    .string({ required_error: '이메일을 입력해주세요.' })
    .email('올바른 이메일 형식이 아닙니다.')
    .max(255, '이메일은 255자 이하여야 합니다.')
    .transform((val) => val.trim().toLowerCase()),

  password: z
    .string({ required_error: '비밀번호를 입력해주세요.' })
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(128, '비밀번호는 128자 이하여야 합니다.'),

  name: z
    .string({ required_error: '이름을 입력해주세요.' })
    .min(1, '이름을 입력해주세요.')
    .max(50, '이름은 50자 이하여야 합니다.')
    .transform((val) => val.trim()),
});

/**
 * Schema for email login (POST /auth/login)
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: '이메일을 입력해주세요.' })
    .email('올바른 이메일 형식이 아닙니다.')
    .max(255, '이메일은 255자 이하여야 합니다.')
    .transform((val) => val.trim().toLowerCase()),

  password: z
    .string({ required_error: '비밀번호를 입력해주세요.' })
    .min(1, '비밀번호를 입력해주세요.')
    .max(128, '비밀번호는 128자 이하여야 합니다.'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
