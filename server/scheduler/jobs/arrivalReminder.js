/**
 * 예약 도착 리마인더 스케줄러
 *
 * 매 1분마다 실행:
 * - 30분 후 / 15분 후에 예약 시간이 도래하는 예약을 조회
 * - 해당 고객에게 도착 알림(DB + 푸시) 발송
 * - 이미 알림을 보낸 예약은 중복 발송하지 않음
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { sendPushNotification } = require('../../modules/notifications/pushService');

const JOB_NAME = '⏰ [예약 도착 리마인더]';

async function run() {
  try {
    // ─── 30분 전 알림 ───
    await sendReminder({
      minutesBefore: 30,
      notificationType: 'reservation_reminder_30min',
      titleTemplate: () => '🍽️ 예약 30분 전 알림',
      messageTemplate: (r) => `"${r.restaurant_name}" 예약 시간까지 30분 남았습니다. 출발 준비를 해주세요!`,
    });

    // ─── 15분 전 알림 ───
    await sendReminder({
      minutesBefore: 15,
      notificationType: 'reservation_reminder_15min',
      titleTemplate: () => '🍽️ 예약 15분 전 알림',
      messageTemplate: (r) => `"${r.restaurant_name}" 예약 시간까지 15분 남았습니다. 곧 도착해주세요!`,
    });

    // ─── 5분 전 알림 (PIVOT-PLAN: "매장 근처" 시점) ───
    await sendReminder({
      minutesBefore: 5,
      notificationType: 'reservation_reminder_5min',
      titleTemplate: () => '🍽️ 예약 5분 전 — 매장에서 준비 중!',
      messageTemplate: (r) => `"${r.restaurant_name}" 도착 즉시 식사 시작할 수 있도록 매장에서 마무리 조리 중입니다.`,
    });
  } catch (error) {
    logger.error(`${JOB_NAME} 오류:`, error);
  }
}

/**
 * 지정 분 전 리마인더 발송
 */
async function sendReminder({ minutesBefore, notificationType, titleTemplate, messageTemplate }) {
  try {
    // 오늘 날짜 + 해당 시간이 minutesBefore분 후인 예약 조회
    // 아직 해당 타입의 알림이 발송되지 않은 건만
    // reservation_id는 UUID이므로 텍스트 비교로 중복 체크
    const result = await pool.query(`
      SELECT r.id, r.user_id, r.reservation_date, r.reservation_time,
             r.party_size, r.restaurant_id,
             rst.name AS restaurant_name, rst.address AS restaurant_address
      FROM reservations r
      JOIN restaurants rst ON r.restaurant_id = rst.id
      WHERE r.status IN ('confirmed', 'preparing')
        AND r.reservation_date = CURRENT_DATE
        AND (r.reservation_date + r.reservation_time) > NOW()
        AND (r.reservation_date + r.reservation_time) <= NOW() + INTERVAL '${minutesBefore} minutes'
        AND r.id::text NOT IN (
          SELECT n.data->>'reservation_id'
          FROM notifications n
          WHERE n.type = $1
            AND n.data->>'reservation_id' IS NOT NULL
        )
    `, [notificationType]);

    if (result.rows.length === 0) {
      return;
    }

    logger.info(`${JOB_NAME} ${minutesBefore}분 전 알림: ${result.rows.length}건 처리`);

    let sentCount = 0;

    for (const reservation of result.rows) {
      const title = titleTemplate(reservation);
      const message = messageTemplate(reservation);

      try {
        // DB 알림 생성
        await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
          VALUES ($1, $2, $3, $4, $5, false, NOW())
        `, [
          reservation.user_id,
          notificationType,
          title,
          message,
          JSON.stringify({
            reservation_id: reservation.id,
            restaurant_id: reservation.restaurant_id,
            restaurant_name: reservation.restaurant_name,
            reservation_time: reservation.reservation_time,
          }),
        ]);

        // 푸시 알림 발송
        sendPushNotification(
          reservation.user_id,
          title,
          message,
          {
            type: notificationType,
            reservationId: String(reservation.id),
            restaurantId: String(reservation.restaurant_id),
          }
        ).catch(err => logger.error(`${JOB_NAME} 푸시 전송 실패 (reservation ${reservation.id}):`, err.message));

        sentCount++;
      } catch (insertErr) {
        logger.error(`${JOB_NAME} 알림 생성 실패 (reservation ${reservation.id}):`, insertErr.message);
      }
    }

    if (sentCount > 0) {
      logger.info(`${JOB_NAME} ${minutesBefore}분 전 알림 완료: ${sentCount}건 발송`);
    }
  } catch (error) {
    logger.error(`${JOB_NAME} ${minutesBefore}분 전 알림 처리 오류:`, error);
  }
}

module.exports = { run };
