/**
 * 노쇼 자동 처리 스케줄러
 *
 * 매 1시간마다 실행:
 * - 완료된 모임 중 24시간 이상 경과한 모임의
 * - 출석 확인이 안 된 참가자를 노쇼로 자동 처리
 * - attendances 테이블에 기록이 없고, meetup_participants.attended = false인 참가자
 * - 밥알 점수(babal_score) 차감 처리
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { sendPushNotification } = require('../../modules/notifications/pushService');
const { updateBabalScore } = require('../../utils/babalScore');

const JOB_NAME = '🚫 [노쇼 처리]';

async function run() {
  const client = await pool.connect();

  try {
    // 완료 상태이면서 24시간 이상 경과한 모임 중
    // 아직 노쇼 처리가 되지 않은 모임 조회
    const completedMeetups = await client.query(`
      SELECT m.id, m.title, m.date, m.time, m.host_id
      FROM meetups m
      WHERE m.status = '종료'
        AND (m.date::date + m.time::time + INTERVAL '3 hours') < NOW() - INTERVAL '24 hours'
        AND m.id NOT IN (
          SELECT DISTINCT meetup_id
          FROM meetup_participants
          WHERE no_show = true
        )
    `);

    if (completedMeetups.rows.length === 0) {
      return;
    }

    logger.info(`${JOB_NAME} ${completedMeetups.rows.length}개 모임 노쇼 처리 시작`);

    let totalNoShows = 0;

    for (const meetup of completedMeetups.rows) {
      await client.query('BEGIN');

      try {
        // 승인된 참가자 중 출석하지 않은 사용자 조회
        // attendances 테이블에 confirmed 기록이 없고,
        // meetup_participants.attended = false인 참가자
        const noShowParticipants = await client.query(`
          SELECT mp.user_id, u.name, u.babal_score
          FROM meetup_participants mp
          JOIN users u ON mp.user_id = u.id
          LEFT JOIN attendances a ON mp.meetup_id = a.meetup_id AND mp.user_id = a.user_id AND a.status = 'confirmed'
          WHERE mp.meetup_id = $1
            AND mp.status IN ('참가승인', '승인', 'approved')
            AND COALESCE(mp.attended, false) = false
            AND a.id IS NULL
            AND mp.user_id != $2
        `, [meetup.id, meetup.host_id]);

        if (noShowParticipants.rows.length === 0) {
          await client.query('COMMIT');
          continue;
        }

        for (const participant of noShowParticipants.rows) {
          // 1. meetup_participants에 노쇼 표시
          await client.query(`
            UPDATE meetup_participants
            SET no_show = true, updated_at = NOW()
            WHERE meetup_id = $1 AND user_id = $2
          `, [meetup.id, participant.user_id]);

          // 2. 밥알지수 차감 (통합 알고리즘)
          await updateBabalScore(participant.user_id, 'NO_SHOW', {
            meetupId: meetup.id,
            client,
          });

          // 3. 노쇼 알림 생성
          const noShowMessage = `"${meetup.title}" 약속에 출석하지 않아 노쇼로 처리되었습니다. 밥알지수가 2.0 차감되었습니다.`;
          await client.query(`
            INSERT INTO notifications (user_id, type, title, message, meetup_id, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, false, NOW())
          `, [
            participant.user_id,
            'noshow_penalty',
            '⚠️ 노쇼 처리 안내',
            noShowMessage,
            meetup.id
          ]);

          // 4. 노쇼 푸시 알림 발송
          sendPushNotification(
            participant.user_id,
            '⚠️ 노쇼 처리 안내',
            noShowMessage,
            { type: 'noshow_penalty', meetupId: String(meetup.id) }
          ).catch(err => logger.error(`${JOB_NAME} 푸시 전송 실패:`, err.message));

          totalNoShows++;
        }

        // 5. 호스트에게 노쇼 결과 알림
        if (noShowParticipants.rows.length > 0) {
          const noShowNames = noShowParticipants.rows.map(p => p.name).join(', ');
          const hostMessage = `"${meetup.title}" 약속에서 ${noShowParticipants.rows.length}명이 노쇼로 처리되었습니다. (${noShowNames})`;
          await client.query(`
            INSERT INTO notifications (user_id, type, title, message, meetup_id, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, false, NOW())
          `, [
            meetup.host_id,
            'noshow_report',
            '📋 노쇼 처리 결과',
            hostMessage,
            meetup.id
          ]);

          // 호스트 푸시 알림 발송
          sendPushNotification(
            meetup.host_id,
            '📋 노쇼 처리 결과',
            hostMessage,
            { type: 'noshow_report', meetupId: String(meetup.id) }
          ).catch(err => logger.error(`${JOB_NAME} 호스트 푸시 전송 실패:`, err.message));
        }

        await client.query('COMMIT');

      } catch (meetupError) {
        await client.query('ROLLBACK');
        logger.error(`${JOB_NAME} 모임 ${meetup.id} 처리 중 오류:`, meetupError);
      }
    }

    if (totalNoShows > 0) {
      logger.info(`${JOB_NAME} 완료: ${totalNoShows}명 노쇼 처리`);
    }

  } catch (error) {
    logger.error(`${JOB_NAME} 오류:`, error);
  } finally {
    client.release();
  }
}

module.exports = { run };
