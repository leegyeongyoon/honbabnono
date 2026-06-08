const { z } = require('zod');
const { CUSTOMER_SETTABLE } = require('../../constants/arrivalStatus');

/**
 * Schema for creating a reservation (POST /reservations)
 */
const createReservationSchema = z.object({
  restaurant_id: z
    .string({ required_error: '식당 ID를 입력해주세요.' })
    .uuid('유효한 식당 ID를 입력해주세요.'),

  reservation_date: z
    .string({ required_error: '예약 날짜를 입력해주세요.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.'),

  reservation_time: z
    .string({ required_error: '예약 시간을 입력해주세요.' })
    .regex(/^\d{2}:\d{2}$/, '시간 형식은 HH:MM이어야 합니다.'),

  party_size: z
    .number({ required_error: '인원 수를 입력해주세요.', invalid_type_error: '인원 수는 숫자여야 합니다.' })
    .int('인원 수는 정수여야 합니다.')
    .min(1, '인원 수는 1명 이상이어야 합니다.')
    .max(20, '인원 수는 20명 이하여야 합니다.'),

  special_request: z
    .string()
    .max(500, '요청사항은 500자 이하여야 합니다.')
    .optional(),
});

/**
 * Schema for updating arrival status (PUT /reservations/:id/arrival)
 */
const updateArrivalSchema = z.object({
  // 고객이 설정 가능한 도착 상태 (on_the_way, nearby, arrived) — constants/arrivalStatus 단일 소스
  arrival_status: z.enum(CUSTOMER_SETTABLE, {
    required_error: '도착 상태를 입력해주세요.',
    invalid_type_error: `유효한 도착 상태를 입력해주세요. (${CUSTOMER_SETTABLE.join(', ')})`,
  }),
});

/**
 * Schema for modifying a reservation (PUT /reservations/:id/modify)
 * 변경분만 전송 — 모든 필드 optional, 미지정 시 기존값 유지.
 */
const modifyReservationSchema = z.object({
  reservation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.')
    .optional(),
  reservation_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '시간 형식은 HH:MM이어야 합니다.')
    .optional(),
  party_size: z
    .number()
    .int('인원 수는 정수여야 합니다.')
    .min(1, '인원 수는 1명 이상이어야 합니다.')
    .max(20, '인원 수는 20명 이하여야 합니다.')
    .optional(),
  special_request: z
    .string()
    .max(500, '요청사항은 500자 이하여야 합니다.')
    .optional(),
});

/**
 * Schema for updating reservation status (PUT /reservations/:id/status) - merchant
 */
const updateStatusSchema = z.object({
  status: z.enum(['preparing', 'ready', 'seated', 'completed'], {
    required_error: '상태를 입력해주세요.',
    invalid_type_error: '유효한 상태를 입력해주세요. (preparing, ready, seated, completed)',
  }),
});

/**
 * Schema for cancelling a reservation (PUT /reservations/:id/cancel)
 */
const cancelReservationSchema = z.object({
  cancel_reason: z
    .string()
    .max(500, '취소 사유는 500자 이하여야 합니다.')
    .optional(),
});

/**
 * Schema for merchant manual reservation (POST /reservations/manual)
 * 전화 예약 — 게스트 이름/전화로 등록 (restaurant_id는 merchant 토큰에서)
 */
const manualReservationSchema = z.object({
  reservation_date: z
    .string({ required_error: '예약 날짜를 입력해주세요.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.'),

  reservation_time: z
    .string({ required_error: '예약 시간을 입력해주세요.' })
    .regex(/^\d{2}:\d{2}$/, '시간 형식은 HH:MM이어야 합니다.'),

  party_size: z
    .number({ required_error: '인원 수를 입력해주세요.', invalid_type_error: '인원 수는 숫자여야 합니다.' })
    .int('인원 수는 정수여야 합니다.')
    .min(1, '인원 수는 1명 이상이어야 합니다.')
    .max(20, '인원 수는 20명 이하여야 합니다.'),

  guest_name: z
    .string({ required_error: '예약자 이름을 입력해주세요.' })
    .min(1, '예약자 이름을 입력해주세요.')
    .max(50, '예약자 이름은 50자 이하여야 합니다.'),

  guest_phone: z
    .string()
    .max(20, '전화번호는 20자 이하여야 합니다.')
    .optional(),

  special_request: z
    .string()
    .max(500, '요청사항은 500자 이하여야 합니다.')
    .optional(),
});

module.exports = {
  createReservationSchema,
  updateArrivalSchema,
  updateStatusSchema,
  cancelReservationSchema,
  manualReservationSchema,
  modifyReservationSchema,
};
