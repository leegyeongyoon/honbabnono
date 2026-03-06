/**
 * 모임 후 리뷰 요청 스케줄러
 *
 * 매 10분마다 실행:
 * - 종료 후 2시간 이상 지난 모임을 찾아서
 * - 리뷰 요청 알림이 아직 발송되지 않은 모임의 참가자들에게
 * - 리뷰 작성 요청 알림을 생성 + 푸시 알림 발송
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { sendMultiplePush } = require('../../modules/notifications/pushService');

const JOB_NAME = '📝 [리뷰 요청]';

async function run() {
  try {
    // 종료 후 2시간 이상 경과한 모임 중, 리뷰 요청 알림이 미발송된 모임 조회
    // 모임 시간 + 3시간을 모임 종료 시점으로 간주
    const endedMeetups = await pool.query(`
      SELECT m.id, m.title, m.host_id
      FROM meetups m
      WHERE m.status IN ('종료', '진행중', '모집완료')
        AND (m.date::date + m.time::time + INTERVAL '3 hours') < NOW()
        AND (m.date::date + m.time::time + INTERVAL '5 hours') > NOW() - INTERVAL '24 hours'
        AND m.id NOT IN (
          SELECT DISTINCT n.meetup_id
          FROM notifications n
          WHERE n.type = 'review_request'
            AND n.meetup_id IS NOT NULL
        )
    `);

    if (endedMeetups.rows.length === 0) {
      return;
    }

    logger.info(`${JOB_NAME} ${endedMeetups.rows.length}개 모임 리뷰 요청 처리 시작`);

    let totalNotifications = 0;

    for (const meetup of endedMeetups.rows) {
      // 해당 모임의 승인된 참가자 조회 (호스트 포함)
      const participants = await pool.query(`
        SELECT mp.user_id
        FROM meetup_participants mp
        WHERE mp.meetup_id = $1
          AND mp.status IN ('참가승인', '승인', 'approved', '참가완료')
      `, [meetup.id]);

      if (participants.rows.length === 0) {
        continue;
      }

      // 참가자들에게 리뷰 요청 알림 생성
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      const userIds = [];

      for (const participant of participants.rows) {
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, false, NOW())`
        );
        values.push(
          participant.user_id,
          'review_request',
          '⭐ 리뷰를 작성해주세요!',
          `"${meetup.title}" 밥약속은 어떠셨나요? 함께한 분들에 대한 리뷰를 남겨주세요.`,
          meetup.id
        );
        userIds.push(participant.user_id);
        paramIndex += 5;
      }

      if (placeholders.length > 0) {
        await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, meetup_id, is_read, created_at)
          VALUES ${placeholders.join(', ')}
        `, values);

        // 푸시 알림 발송
        sendMultiplePush(
          userIds,
          '⭐ 리뷰를 작성해주세요!',
          `"${meetup.title}" 밥약속은 어떠셨나요? 함께한 분들에 대한 리뷰를 남겨주세요.`,
          { type: 'review_request', meetupId: String(meetup.id) }
        ).catch(err => logger.error(`${JOB_NAME} 푸시 전송 실패:`, err.message));

        totalNotifications += participants.rows.length;
      }
    }

    if (totalNotifications > 0) {
      logger.info(`${JOB_NAME} 완료: ${totalNotifications}개 리뷰 요청 알림 생성 (푸시 포함)`);
    }

  } catch (error) {
    logger.error(`${JOB_NAME} 오류:`, error);
  }
}

module.exports = { run };
