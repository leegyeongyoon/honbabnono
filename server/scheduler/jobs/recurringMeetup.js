/**
 * 반복 모임 자동 생성 스케줄러
 *
 * 매일 자정 실행:
 * 1. is_recurring=true인 부모 모임 조회
 * 2. 가장 최근 자식 모임이 7일 이내면 다음 회차 자동 생성
 * 3. 기존 참가자에게 알림 발송
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');
const { createNotification } = require('../../modules/notifications/controller');

const JOB_NAME = '🔄 [반복 모임]';

/**
 * recurrence_rule 파싱
 * @param {string} rule - 'weekly:mon', 'biweekly:wed', 'monthly:15'
 * @returns {{ type: string, value: string }}
 */
function parseRecurrenceRule(rule) {
  if (!rule) return null;
  const [type, value] = rule.split(':');
  return { type, value };
}

/**
 * 다음 모임 날짜 계산
 * @param {Date} lastDate - 마지막 모임 날짜
 * @param {string} rule - recurrence_rule
 * @returns {Date}
 */
function calculateNextDate(lastDate, rule) {
  const parsed = parseRecurrenceRule(rule);
  if (!parsed) return null;

  const next = new Date(lastDate);

  switch (parsed.type) {
    case 'weekly': {
      next.setDate(next.getDate() + 7);
      break;
    }
    case 'biweekly': {
      next.setDate(next.getDate() + 14);
      break;
    }
    case 'monthly': {
      next.setMonth(next.getMonth() + 1);
      const targetDay = parseInt(parsed.value, 10);
      if (targetDay && targetDay <= 28) {
        next.setDate(targetDay);
      }
      break;
    }
    default:
      return null;
  }

  return next;
}

async function run() {
  try {
    // 1. 반복 설정된 부모 모임 조회
    const parentMeetups = await pool.query(`
      SELECT m.id, m.title, m.category, m.location, m.latitude, m.longitude,
             m.address, m.max_participants, m.description, m.host_id,
             m.recurrence_rule, m.promise_deposit_amount, m.tags,
             m.dining_preferences, m.image,
             (SELECT MAX(date) FROM meetups WHERE parent_meetup_id = m.id OR id = m.id) as latest_date
      FROM meetups m
      WHERE m.is_recurring = true
        AND m.status != '취소'
        AND m.recurrence_rule IS NOT NULL
    `);

    if (parentMeetups.rows.length === 0) {
      return;
    }

    logger.info(`${JOB_NAME} 반복 모임 ${parentMeetups.rows.length}개 확인`);

    const now = new Date();
    let created = 0;

    for (const parent of parentMeetups.rows) {
      try {
        const latestDate = new Date(parent.latest_date);
        const daysUntilLatest = (latestDate - now) / (1000 * 60 * 60 * 24);

        // 가장 최근 모임이 7일 이내일 때만 다음 회차 생성
        if (daysUntilLatest > 7) continue;

        const nextDate = calculateNextDate(latestDate, parent.recurrence_rule);
        if (!nextDate || nextDate <= now) continue;

        // 이미 해당 날짜에 모임이 있는지 확인
        const existing = await pool.query(`
          SELECT id FROM meetups
          WHERE parent_meetup_id = $1
            AND DATE(date) = DATE($2)
        `, [parent.id, nextDate]);

        if (existing.rows.length > 0) continue;

        // 시간 유지 (원본 모임의 시간대)
        const originalTime = new Date(parent.latest_date);
        nextDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);

        // 다음 회차 모임 생성
        const result = await pool.query(`
          INSERT INTO meetups (
            id, title, category, location, latitude, longitude, address,
            max_participants, description, host_id, date, status,
            recurrence_rule, parent_meetup_id, is_recurring,
            promise_deposit_amount, tags, dining_preferences, image,
            current_participants, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, '모집중',
            $11, $12, false,
            $13, $14, $15, $16,
            0, NOW()
          ) RETURNING id
        `, [
          parent.title, parent.category, parent.location,
          parent.latitude, parent.longitude, parent.address,
          parent.max_participants, parent.description, parent.host_id,
          nextDate, parent.recurrence_rule, parent.id,
          parent.promise_deposit_amount || 0,
          parent.tags || '[]', parent.dining_preferences || '[]',
          parent.image
        ]);

        created++;
        const newMeetupId = result.rows[0].id;

        logger.info(`${JOB_NAME} '${parent.title}' 다음 회차 생성: ${nextDate.toISOString().split('T')[0]}`);

        // 기존 참가자에게 알림
        const participants = await pool.query(`
          SELECT DISTINCT user_id FROM meetup_participants
          WHERE meetup_id IN (
            SELECT id FROM meetups WHERE parent_meetup_id = $1
            UNION SELECT $1
          ) AND status = '참가승인'
        `, [parent.id]);

        for (const p of participants.rows) {
          try {
            await createNotification(
              p.user_id,
              'meetup_recurring',
              '정기 모임 알림',
              `'${parent.title}' 다음 정기 모임이 생성되었습니다.`,
              { meetupId: newMeetupId, parentMeetupId: parent.id }
            );
          } catch (notifErr) {
            logger.warn(`${JOB_NAME} 알림 발송 실패: ${notifErr.message}`);
          }
        }
      } catch (meetupErr) {
        logger.error(`${JOB_NAME} 모임 ${parent.id} 처리 실패:`, meetupErr);
      }
    }

    if (created > 0) {
      logger.info(`${JOB_NAME} 총 ${created}개 반복 모임 생성 완료`);
    }
  } catch (error) {
    logger.error(`${JOB_NAME} 실행 실패:`, error);
  }
}

module.exports = { run };
