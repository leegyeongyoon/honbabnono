const { z } = require('zod');

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
  arrival_status: z.enum(['on_time', 'delayed', 'nearby', 'arrived'], {
    required_error: '도착 상태를 입력해주세요.',
    invalid_type_error: '유효한 도착 상태를 입력해주세요. (on_time, delayed, nearby, arrived)',
  }),
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

module.exports = {
  createReservationSchema,
  updateArrivalSchema,
  updateStatusSchema,
  cancelReservationSchema,
};
