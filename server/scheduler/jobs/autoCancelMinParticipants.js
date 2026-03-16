/**
 * 최소 인원 미달 자동 취소 스케줄러
 *
 * 매 5분마다 실행:
 * - 모임 시작 2시간 전까지 참가 확정 인원이 최소 인원(2명) 미달인 모임 자동 취소
 * - 참가자 전원에게 알림 발송
 * - 약속금 자동 환불 처리
 *
 * 최소 인원 기준:
 * - 호스트 포함 최소 2명 이상 참가승인 상태여야 모임 진행 가능
 * - 호스트 혼자인 경우(current_participants <= 1) 자동 취소
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { notifyMeetupCancelled, refundDepositsForMeetup } = require('../../modules/meetups/helpers/notification.helper');

const JOB_NAME = '🚨 [최소인원 자동취소]';

// 최소 참가 인원 (호스트 포함)
const MIN_PARTICIPANTS = 2;

// 모임 시작 전 자동취소 체크 시간 (시간 단위)
const HOURS_BEFORE_MEETUP = 2;

async function run() {
  const client = await pool.connect();

  try {
    // 모임 시작 2시간 이내이면서, 아직 모집중/모집완료 상태이고,
    // 참가 확정 인원이 최소 인원 미만인 모임 조회
    // 이미 자동취소 알림을 보낸 모임은 제외
    const underMinMeetups = await client.query(`
      SELECT m.id, m.title, m.host_id, m.date, m.time,
             m.current_participants, m.max_participants
      FROM meetups m
      WHERE m.status IN ('모집중', '모집완료')
        AND (m.date::date + m.time::time) > NOW()
        AND (m.date::date + m.time::time) <= NOW() + INTERVAL '${HOURS_BEFORE_MEETUP} hours'
        AND m.id NOT IN (
          SELECT DISTINCT n.meetup_id
          FROM notifications n
          WHERE n.type = 'meetup_auto_cancelled'
            AND n.meetup_id IS NOT NULL
        )
    `);

    if (underMinMeetups.rows.length === 0) {
      return;
    }

    logger.info(`${JOB_NAME} ${underMinMeetups.rows.length}개 모임 최소인원 체크 시작`);

    let totalCancelled = 0;

    for (const meetup of underMinMeetups.rows) {
      // 실제 참가승인 인원 카운트 (current_participants가 정확하지 않을 수 있으므로 직접 쿼리)
      const participantCount = await client.query(`
        SELECT COUNT(*) as count
        FROM meetup_participants
        WHERE meetup_id = $1
          AND status IN ('참가승인', '승인', 'approved')
      `, [meetup.id]);

      const confirmedCount = parseInt(participantCount.rows[0].count);

      if (confirmedCount >= MIN_PARTICIPANTS) {
        continue;
      }

      await client.query('BEGIN');

      try {
        // 모임 상태를 '취소'로 변경
        await client.query(`
          UPDATE meetups SET status = '취소', updated_at = NOW() WHERE id = $1
        `, [meetup.id]);

        // 참가자 전원에게 자동 취소 알림 발송
        await notifyMeetupCancelled(meetup, 'auto', client);

        // 약속금 자동 환불
        await refundDepositsForMeetup(meetup.id, client);

        await client.query('COMMIT');

        totalCancelled++;
        logger.info(
          `${JOB_NAME} 자동 취소: "${meetup.title}" (참가 확정 ${confirmedCount}명 < 최소 ${MIN_PARTICIPANTS}명)`
        );
      } catch (meetupError) {
        await client.query('ROLLBACK');
        logger.error(`${JOB_NAME} 모임 ${meetup.id} 자동 취소 처리 중 오류:`, meetupError);
      }
    }

    if (totalCancelled > 0) {
      logger.info(`${JOB_NAME} 완료: ${totalCancelled}개 모임 자동 취소`);
    }

  } catch (error) {
    logger.error(`${JOB_NAME} 오류:`, error);
  } finally {
    client.release();
  }
}

module.exports = { run };
