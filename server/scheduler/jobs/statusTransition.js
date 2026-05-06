/**
 * 모임 상태 자동 전환 스케줄러
 *
 * 매 5분마다 실행:
 * 1. '모집중' 상태인 모임 중 시작 시간이 지난 것 -> '진행중'으로 전환
 * 2. '진행중' 상태인 모임 중 시작 시간 + 3시간이 지난 것 -> '종료'로 전환
 * 3. 종료된 모임의 호스트에게 참가 인원 기반 포인트 리워드 지급
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { updateBabalScore } = require('../../utils/babalScore');
const { createNotification } = require('../../modules/notifications/controller');

const JOB_NAME = '🔄 [상태 전환]';

async function run() {
  try {
    // 1. 모집중 -> 진행중: 모임 시작 시간이 지난 경우
    const toInProgressResult = await pool.query(`
      UPDATE meetups
      SET status = '진행중', updated_at = NOW()
      WHERE status IN ('모집중', '모집완료')
        AND (date::date + time::time) <= NOW()
      RETURNING id, title
    `);

    if (toInProgressResult.rows.length > 0) {
      logger.info(
        `${JOB_NAME} ${toInProgressResult.rows.length}개 모임 '진행중'으로 전환:`,
        toInProgressResult.rows.map(m => m.title).join(', ')
      );
    }

    // 2. 진행중 -> 종료: 모임 시작 시간 + 3시간이 지난 경우
    const toCompletedResult = await pool.query(`
      UPDATE meetups
      SET status = '종료', updated_at = NOW()
      WHERE status = '진행중'
        AND (date::date + time::time + INTERVAL '3 hours') <= NOW()
      RETURNING id, title
    `);

    if (toCompletedResult.rows.length > 0) {
      logger.info(
        `${JOB_NAME} ${toCompletedResult.rows.length}개 모임 '종료'로 전환:`,
        toCompletedResult.rows.map(m => m.title).join(', ')
      );

      // 종료된 모임의 참가자 자동 출석 처리 (GPS 체크인 미완료 시에도 리뷰 작성 가능하도록)
      const completedIds = toCompletedResult.rows.map(m => m.id);
      const attendanceResult = await pool.query(`
        UPDATE meetup_participants
        SET attended = true
        WHERE meetup_id = ANY($1)
          AND status = '참가승인'
          AND attended = false
        RETURNING meetup_id, user_id
      `, [completedIds]);

      if (attendanceResult.rows.length > 0) {
        logger.info(
          `${JOB_NAME} ${attendanceResult.rows.length}명 자동 출석 처리 완료`
        );

        // 자동 출석 처리된 참가자들에게 밥알지수 출석 보너스
        for (const participant of attendanceResult.rows) {
          updateBabalScore(participant.user_id, 'MEETUP_ATTENDED', {
            meetupId: participant.meetup_id,
          }).catch(
            (err) => logger.error(`${JOB_NAME} 출석 밥알지수 보너스 오류:`, err)
          );
        }
      }

      // 호스트 밥알지수 보너스 (모임 성공 완료) + 호스트 포인트 리워드
      const hostsResult = await pool.query(
        'SELECT id, title, host_id, current_participants FROM meetups WHERE id = ANY($1)',
        [completedIds]
      );
      for (const meetup of hostsResult.rows) {
        updateBabalScore(meetup.host_id, 'HOST_MEETUP_COMPLETED', { meetupId: meetup.id }).catch(
          (err) => logger.error(`${JOB_NAME} 호스트 밥알지수 보너스 오류:`, err)
        );

        // 호스트 포인트 리워드 (참가 인원 기반)
        awardHostRewardPoints(meetup).catch(
          (err) => logger.error(`${JOB_NAME} 호스트 리워드 포인트 오류:`, err)
        );
      }
    }

    const totalTransitions = toInProgressResult.rows.length + toCompletedResult.rows.length;
    if (totalTransitions > 0) {
      logger.info(`${JOB_NAME} 완료: 총 ${totalTransitions}개 모임 상태 전환`);
    }

  } catch (error) {
    logger.error(`${JOB_NAME} 오류:`, error);
  }
}

/**
 * 호스트 포인트 리워드 지급
 * - 2~3명 참가: 100P
 * - 4~5명 참가: 200P
 * - 6명 이상:   300P
 */
async function awardHostRewardPoints(meetup) {
  const participants = meetup.current_participants || 0;
  if (participants < 2) return; // 참가자가 2명 미만이면 리워드 없음

  let rewardAmount;
  if (participants <= 3) {
    rewardAmount = 100;
  } else if (participants <= 5) {
    rewardAmount = 200;
  } else {
    rewardAmount = 300;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // user_points에 포인트 적립
    await client.query(`
      INSERT INTO user_points (user_id, available_points, total_earned)
      VALUES ($1, $2, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET
        available_points = user_points.available_points + $2,
        total_earned = user_points.total_earned + $2,
        updated_at = NOW()
    `, [meetup.host_id, rewardAmount]);

    // point_transactions에 거래 내역 기록
    await client.query(`
      INSERT INTO point_transactions (user_id, type, amount, description, created_at)
      VALUES ($1, 'host_reward', $2, $3, NOW())
    `, [meetup.host_id, rewardAmount, `모임 호스팅 리워드 (${participants}명 참가)`]);

    await client.query('COMMIT');

    // 호스트에게 알림 발송
    const notifMessage = `'${meetup.title}' 호스팅 리워드 ${rewardAmount}P가 적립되었습니다`;
    createNotification(
      meetup.host_id,
      'host_reward',
      '🎉 호스팅 리워드 적립',
      notifMessage,
      { meetupId: meetup.id }
    );

    logger.info(`${JOB_NAME} 호스트 리워드: user=${meetup.host_id}, ${rewardAmount}P (${participants}명 참가)`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { run };
