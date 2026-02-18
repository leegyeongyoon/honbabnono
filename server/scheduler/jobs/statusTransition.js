/**
 * 모임 상태 자동 전환 스케줄러
 *
 * 매 5분마다 실행:
 * 1. '모집중' 상태인 모임 중 시작 시간이 지난 것 -> '진행중'으로 전환
 * 2. '진행중' 상태인 모임 중 시작 시간 + 3시간이 지난 것 -> '종료'로 전환
 */

const pool = require('../../config/database');

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
      console.log(
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
      console.log(
        `${JOB_NAME} ${toCompletedResult.rows.length}개 모임 '종료'로 전환:`,
        toCompletedResult.rows.map(m => m.title).join(', ')
      );
    }

    const totalTransitions = toInProgressResult.rows.length + toCompletedResult.rows.length;
    if (totalTransitions > 0) {
      console.log(`${JOB_NAME} 완료: 총 ${totalTransitions}개 모임 상태 전환`);
    }

  } catch (error) {
    console.error(`${JOB_NAME} 오류:`, error);
  }
}

module.exports = { run };
