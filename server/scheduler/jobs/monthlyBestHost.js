/**
 * 월간 우수 호스트 자동 선정 스케줄러
 *
 * 매월 1일 00:00에 실행:
 * - 전월 호스팅 3회 이상 + 평균 평점 4.0 이상
 * - 선정된 호스트에게:
 *   1. '우수 호스트' 뱃지 부여 (user_badges)
 *   2. 보너스 포인트 500P
 *   3. users.is_best_host = true, best_host_until = 다음달 말일
 *   4. 알림 발송
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { createNotification } = require('../../modules/notifications/controller');

const JOB_NAME = '🏆 [월간 우수 호스트]';
const BEST_HOST_BONUS = 500;
const MIN_HOSTING_COUNT = 3;
const MIN_AVG_RATING = 4.0;

async function run() {
  const client = await pool.connect();

  try {
    // 전월 기간 계산
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // 우수 호스트 자격 유효기간: 이번 달 마지막 날까지
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    logger.info(`${JOB_NAME} 전월 우수 호스트 선정 시작 (${firstDayLastMonth.toISOString()} ~ ${firstDayThisMonth.toISOString()})`);

    // 전월에 3회 이상 호스팅 완료 + 평균 평점 4.0 이상인 호스트 조회
    const eligibleHosts = await client.query(`
      SELECT
        m.host_id,
        u.name,
        COUNT(m.id) as hosting_count,
        COALESCE(AVG(r.rating), 0) as avg_rating
      FROM meetups m
      JOIN users u ON m.host_id = u.id
      LEFT JOIN reviews r ON r.meetup_id = m.id AND r.reviewer_id != m.host_id
      WHERE m.status = '종료'
        AND m.updated_at >= $1
        AND m.updated_at < $2
      GROUP BY m.host_id, u.name
      HAVING COUNT(m.id) >= $3
        AND COALESCE(AVG(r.rating), 0) >= $4
    `, [firstDayLastMonth, firstDayThisMonth, MIN_HOSTING_COUNT, MIN_AVG_RATING]);

    if (eligibleHosts.rows.length === 0) {
      logger.info(`${JOB_NAME} 이번 달 우수 호스트 해당자 없음`);
      return;
    }

    logger.info(`${JOB_NAME} 우수 호스트 후보: ${eligibleHosts.rows.length}명`);

    // 이전 우수 호스트 상태 초기화 (만료된 것만)
    await client.query(`
      UPDATE users
      SET is_best_host = false
      WHERE is_best_host = true
        AND (best_host_until IS NULL OR best_host_until < NOW())
    `);

    // '우수 호스트' 뱃지 조회 (없으면 생성)
    let bestHostBadge = await client.query(
      "SELECT id FROM badges WHERE name = '우수 호스트' AND is_active = true"
    );

    if (bestHostBadge.rows.length === 0) {
      const newBadge = await client.query(`
        INSERT INTO badges (name, description, category, required_count, icon, is_active)
        VALUES ('우수 호스트', '월간 우수 호스트로 선정된 호스트에게 부여되는 뱃지', 'hosting', 0, '🏆', true)
        RETURNING id
      `);
      bestHostBadge = { rows: [newBadge.rows[0]] };
    }

    const badgeId = bestHostBadge.rows[0].id;
    let awardedCount = 0;

    for (const host of eligibleHosts.rows) {
      await client.query('BEGIN');

      try {
        // 1. 우수 호스트 상태 업데이트
        await client.query(`
          UPDATE users
          SET is_best_host = true,
              best_host_until = $2,
              updated_at = NOW()
          WHERE id = $1
        `, [host.host_id, lastDayThisMonth]);

        // 2. 뱃지 부여 (이미 있으면 earned_at 갱신)
        await client.query(`
          INSERT INTO user_badges (user_id, badge_id, earned_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (user_id, badge_id)
          DO UPDATE SET earned_at = NOW()
        `, [host.host_id, badgeId]);

        // 3. 보너스 포인트 500P 지급
        await client.query(`
          INSERT INTO user_points (user_id, available_points, total_earned)
          VALUES ($1, $2, $2)
          ON CONFLICT (user_id)
          DO UPDATE SET
            available_points = user_points.available_points + $2,
            total_earned = user_points.total_earned + $2,
            updated_at = NOW()
        `, [host.host_id, BEST_HOST_BONUS]);

        await client.query(`
          INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
          VALUES ($1, 'best_host_bonus', $2, '월간 우수 호스트 보너스 포인트', NOW())
        `, [host.host_id, BEST_HOST_BONUS]);

        await client.query('COMMIT');

        // 4. 알림 발송 (트랜잭션 외부에서)
        const avgRatingStr = parseFloat(host.avg_rating).toFixed(1);
        createNotification(
          host.host_id,
          'best_host',
          '🏆 월간 우수 호스트 선정!',
          `축하합니다! 전월 ${host.hosting_count}회 호스팅, 평균 평점 ${avgRatingStr}으로 우수 호스트로 선정되었습니다. 보너스 ${BEST_HOST_BONUS}P가 적립되었습니다!`,
          {}
        );

        awardedCount++;
        logger.info(
          `${JOB_NAME} 우수 호스트 선정: ${host.name} (${host.hosting_count}회, 평점 ${avgRatingStr})`
        );

      } catch (hostError) {
        await client.query('ROLLBACK');
        logger.error(`${JOB_NAME} 호스트 ${host.host_id} 처리 오류:`, hostError);
      }
    }

    logger.info(`${JOB_NAME} 완료: ${awardedCount}명 우수 호스트 선정`);

  } catch (error) {
    logger.error(`${JOB_NAME} 오류:`, error);
  } finally {
    client.release();
  }
}

module.exports = { run };
