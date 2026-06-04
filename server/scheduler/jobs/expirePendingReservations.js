/**
 * 미결제 예약 자동 만료 스케줄러
 *
 * 매 5분마다 실행:
 * - 생성 후 15분이 지나도록 결제되지 않은 예약(pending_payment)을 자동 취소
 * - pending_payment 예약도 좌석 정원을 점유하므로, 방치 시 좌석이 잠기는 것을 방지
 *   (reservations/controller.js createReservation의 정원 카운트와 한 쌍)
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { createNotification } = require('../../modules/notifications/controller');

const JOB_NAME = '⏳ [미결제 예약 만료]';
const EXPIRE_MINUTES = 15;

async function run() {
  try {
    const { rows } = await pool.query(
      `UPDATE reservations
       SET status = 'cancelled', cancelled_by = 'system',
           cancel_reason = '결제 시간 초과(${EXPIRE_MINUTES}분) 자동 취소', updated_at = NOW()
       WHERE status = 'pending_payment'
         AND created_at < NOW() - INTERVAL '${EXPIRE_MINUTES} minutes'
       RETURNING id, user_id, restaurant_id`
    );

    if (rows.length === 0) return;

    logger.info(`${JOB_NAME} ${rows.length}건 자동 취소`);

    for (const r of rows) {
      createNotification(r.user_id, 'reservation', '예약 자동 취소',
        `결제가 완료되지 않아 예약이 자동 취소되었습니다. 다시 예약해주세요.`,
        { reservationId: r.id, restaurantId: r.restaurant_id }
      ).catch(() => {});
    }
  } catch (error) {
    logger.error(`${JOB_NAME} 오류:`, error);
  }
}

module.exports = { run };
