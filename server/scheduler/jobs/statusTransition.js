/**
 * 모임 상태 자동 전환 스케줄러
 *
 * 매 5분마다 실행:
 * 1. '모집중' 상태인 모임 중 시작 시간이 지난 것 -> '진행중'으로 전환
 * 2. '진행중' 상태인 모임 중 시작 시간 + 3시간이 지난 것 -> '종료'로 전환
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { updateBabalScore } = require('../../utils/babalScore');

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

      // 호스트 밥알지수 보너스 (모임 성공 완료)
      const completedIds = toCompletedResult.rows.map(m => m.id);
      const hostsResult = await pool.query(
        'SELECT id, host_id FROM meetups WHERE id = ANY($1)',
        [completedIds]
      );
      for (const meetup of hostsResult.rows) {
        updateBabalScore(meetup.host_id, 'HOST_MEETUP_COMPLETED', { meetupId: meetup.id }).catch(
          (err) => logger.error(`${JOB_NAME} 호스트 밥알지수 보너스 오류:`, err)
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

module.exports = { run };
