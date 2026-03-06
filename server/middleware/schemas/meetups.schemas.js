const { z } = require('zod');

/**
 * Schema for meetup creation (POST /meetups)
 */
const createMeetupSchema = z.object({
  title: z
    .string({ required_error: '제목을 입력해주세요.' })
    .min(1, '제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.')
    .transform((val) => val.trim()),

  description: z
    .string()
    .max(2000, '설명은 2000자 이하여야 합니다.')
    .optional()
    .transform((val) => val?.trim()),

  category: z
    .string({ required_error: '카테고리를 선택해주세요.' })
    .min(1, '카테고리를 선택해주세요.')
    .max(50, '카테고리는 50자 이하여야 합니다.'),

  location: z
    .string({ required_error: '장소를 입력해주세요.' })
    .min(1, '장소를 입력해주세요.')
    .max(500, '장소는 500자 이하여야 합니다.')
    .transform((val) => val.trim()),

  address: z
    .string()
    .max(500, '주소는 500자 이하여야 합니다.')
    .optional()
    .transform((val) => val?.trim()),

  latitude: z
    .number()
    .min(-90, '유효한 위도가 아닙니다.')
    .max(90, '유효한 위도가 아닙니다.')
    .optional(),

  longitude: z
    .number()
    .min(-180, '유효한 경도가 아닙니다.')
    .max(180, '유효한 경도가 아닙니다.')
    .optional(),

  date: z
    .string({ required_error: '날짜를 입력해주세요.' })
    .min(1, '날짜를 입력해주세요.'),

  time: z
    .string({ required_error: '시간을 입력해주세요.' })
    .min(1, '시간을 입력해주세요.'),

  maxParticipants: z
    .number({ invalid_type_error: '최대 참가자 수는 숫자여야 합니다.' })
    .int('최대 참가자 수는 정수여야 합니다.')
    .min(2, '최소 2명 이상이어야 합니다.')
    .max(50, '최대 50명까지 가능합니다.')
    .optional()
    .default(4),

  priceRange: z
    .string()
    .max(100, '가격대는 100자 이하여야 합니다.')
    .optional(),

  ageRange: z
    .string()
    .max(50, '연령대는 50자 이하여야 합니다.')
    .optional(),

  genderPreference: z
    .string()
    .max(20, '성별 선호는 20자 이하여야 합니다.')
    .optional(),

  image: z
    .string()
    .url('유효한 이미지 URL이 아닙니다.')
    .max(2048, '이미지 URL은 2048자 이하여야 합니다.')
    .optional()
    .nullable(),
});

module.exports = {
  createMeetupSchema,
};
