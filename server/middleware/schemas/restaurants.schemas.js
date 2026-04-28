const { z } = require('zod');

/**
 * Schema for creating a restaurant (POST /restaurants)
 */
const createRestaurantSchema = z.object({
  name: z
    .string({ required_error: '식당 이름을 입력해주세요.' })
    .min(1, '식당 이름을 입력해주세요.')
    .max(100, '식당 이름은 100자 이하여야 합니다.'),

  description: z
    .string()
    .max(2000, '설명은 2000자 이하여야 합니다.')
    .optional(),

  category: z
    .string()
    .max(50, '카테고리는 50자 이하여야 합니다.')
    .optional(),

  phone: z
    .string()
    .max(20, '전화번호는 20자 이하여야 합니다.')
    .optional(),

  address: z
    .string({ required_error: '주소를 입력해주세요.' })
    .min(1, '주소를 입력해주세요.')
    .max(500, '주소는 500자 이하여야 합니다.'),

  address_detail: z
    .string()
    .max(200, '상세 주소는 200자 이하여야 합니다.')
    .optional(),

  latitude: z
    .number()
    .min(-90, '유효한 위도를 입력해주세요.')
    .max(90, '유효한 위도를 입력해주세요.')
    .optional(),

  longitude: z
    .number()
    .min(-180, '유효한 경도를 입력해주세요.')
    .max(180, '유효한 경도를 입력해주세요.')
    .optional(),

  image_url: z
    .string()
    .url('유효한 이미지 URL을 입력해주세요.')
    .optional(),

  images: z
    .array(z.string().url('유효한 이미지 URL을 입력해주세요.'))
    .max(10, '이미지는 최대 10개까지 등록 가능합니다.')
    .optional(),

  operating_hours: z
    .object({})
    .passthrough()
    .optional(),

  seat_count: z
    .number()
    .int('좌석 수는 정수여야 합니다.')
    .min(1, '좌석 수는 1 이상이어야 합니다.')
    .max(9999, '좌석 수는 9999 이하여야 합니다.')
    .optional(),
});

/**
 * Schema for updating a restaurant (PUT /restaurants/:id)
 */
const updateRestaurantSchema = createRestaurantSchema.partial();

/**
 * Schema for nearby restaurant query (GET /restaurants/nearby)
 */
const nearbyQuerySchema = z.object({
  lat: z.coerce
    .number({ required_error: '위도(lat)를 입력해주세요.', invalid_type_error: '위도는 숫자여야 합니다.' })
    .min(-90, '유효한 위도를 입력해주세요.')
    .max(90, '유효한 위도를 입력해주세요.'),

  lng: z.coerce
    .number({ required_error: '경도(lng)를 입력해주세요.', invalid_type_error: '경도는 숫자여야 합니다.' })
    .min(-180, '유효한 경도를 입력해주세요.')
    .max(180, '유효한 경도를 입력해주세요.'),

  radius: z.coerce
    .number()
    .min(100, '반경은 최소 100m 이상이어야 합니다.')
    .max(50000, '반경은 최대 50km 이하여야 합니다.')
    .default(3000)
    .optional(),

  category: z
    .string()
    .max(50)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .optional(),
});

/**
 * Schema for search query (GET /restaurants/search)
 */
const searchQuerySchema = z.object({
  keyword: z
    .string()
    .max(100, '검색어는 100자 이하여야 합니다.')
    .optional(),

  category: z
    .string()
    .max(50)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .optional(),
});

module.exports = {
  createRestaurantSchema,
  updateRestaurantSchema,
  nearbyQuerySchema,
  searchQuerySchema,
};
