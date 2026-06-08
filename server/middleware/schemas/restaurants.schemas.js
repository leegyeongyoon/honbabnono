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

  auto_accept_orders: z
    .boolean()
    .optional(),

  default_prep_time: z
    .number()
    .int('조리시간은 정수여야 합니다.')
    .min(1, '조리시간은 1분 이상이어야 합니다.')
    .max(120, '조리시간은 120분 이하여야 합니다.')
    .optional(),

  // ── 운영 정책 (마이그레이션 106) — validate가 미정의 키를 strip하므로 반드시 스키마에 선언 ──
  is_accepting_reservations: z
    .boolean()
    .optional(),

  pause_reason: z
    .string()
    .max(200, '일시중지 사유는 200자 이하여야 합니다.')
    .nullable()
    .optional(),

  paused_until: z
    .string()
    .datetime({ offset: true, message: '재개 시각은 ISO 형식이어야 합니다.' })
    .nullable()
    .optional(),

  holidays: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '휴무일은 YYYY-MM-DD 형식이어야 합니다.'))
    .max(60, '휴무일은 최대 60개까지 지정 가능합니다.')
    .optional(),

  max_advance_days: z
    .number()
    .int('예약 가능 일수는 정수여야 합니다.')
    .min(1, '예약 가능 일수는 1일 이상이어야 합니다.')
    .max(365, '예약 가능 일수는 365일 이하여야 합니다.')
    .nullable()
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

  sort: z
    .enum(['rating', 'reviews', 'name', 'newest', 'distance'])
    .optional(),

  // 위치 기반
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0).max(50000).optional(), // 미터

  // 가격대 (매장 최저 메뉴가 기준)
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),

  // 평점 필터
  min_rating: z.coerce.number().min(0).max(5).optional(),

  // 예약 가능 매장만
  available: z.enum(['true', 'false']).optional(),

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
