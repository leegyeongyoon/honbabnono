/**
 * 모임 리마인더 스케줄러
 *
 * 매 1분마다 실행:
 * - 30분 이내에 시작하는 모임을 찾아서
 * - 해당 모임의 참가자들에게 알림을 생성
 * - 푸시 알림도 함께 발송
 * - 이미 알림을 보낸 모임은 중복 발송하지 않음
 */

const pool = require('../../config/database');
const { sendMultiplePush } = require('../../modules/notifications/pushService');

const JOB_NAME = '⏰ [모임 리마인더]';

async function run() {
  try {
    // 30분 이내에 시작하는 모임 조회 (아직 리마인더 알림이 발송되지 않은 것만)
    const upcomingMeetups = await pool.query(`
      SELECT m.id, m.title, m.date, m.time, m.location
      FROM meetups m
      WHERE m.status IN ('모집중', '모집완료')
        AND (m.date::date + m.time::time) > NOW()
        AND (m.date::date + m.time::time) <= NOW() + INTERVAL '30 minutes'
        AND m.id NOT IN (
          SELECT DISTINCT n.meetup_id
          FROM notifications n
          WHERE n.type = 'meetup_reminder_30min'
            AND n.meetup_id IS NOT NULL
        )
    `);

    if (upcomingMeetups.rows.length === 0) {
      return;
    }

    console.log(`${JOB_NAME} ${upcomingMeetups.rows.length}개 모임 리마인더 처리 시작`);

    let totalNotifications = 0;

    for (const meetup of upcomingMeetups.rows) {
      // 해당 모임의 승인된 참가자 조회
      const participants = await pool.query(`
        SELECT mp.user_id
        FROM meetup_participants mp
        WHERE mp.meetup_id = $1
          AND mp.status IN ('참가승인', '승인', 'approved')
      `, [meetup.id]);

      if (participants.rows.length === 0) {
        continue;
      }

      // 참가자들에게 DB 알림 생성
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
          'meetup_reminder_30min',
          '🍚 약속 30분 전 알림',
          `"${meetup.title}" 약속이 곧 시작됩니다! 장소: ${meetup.location}`,
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
          '🍚 약속 30분 전 알림',
          `"${meetup.title}" 약속이 곧 시작됩니다! 장소: ${meetup.location}`,
          { type: 'meetup_reminder_30min', meetupId: String(meetup.id) }
        ).catch(err => console.error(`${JOB_NAME} 푸시 전송 실패:`, err.message));

        totalNotifications += participants.rows.length;
      }
    }

    if (totalNotifications > 0) {
      console.log(`${JOB_NAME} 완료: ${totalNotifications}개 알림 생성 (푸시 포함)`);
    }

  } catch (error) {
    console.error(`${JOB_NAME} 오류:`, error);
  }
}

module.exports = { run };
