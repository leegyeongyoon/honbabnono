/**
 * 모임 알림 헬퍼 함수
 *
 * 모임 취소, 변경, 자동 취소 시 참가자들에게 알림을 발송하는 유틸리티.
 * DB 알림 레코드 생성 + FCM 푸시 알림을 함께 처리한다.
 */

const pool = require('../../../config/database');
const logger = require('../../../config/logger');
const { sendMultiplePush, sendPushNotification } = require('../../notifications/pushService');

/**
 * 모임의 승인된 참가자 목록 조회 (호스트 제외 옵션)
 * @param {string} meetupId - 모임 ID
 * @param {Object} options - 옵션
 * @param {string} options.excludeUserId - 제외할 사용자 ID (호스트 등)
 * @param {Object} options.client - DB 트랜잭션 클라이언트 (optional)
 * @returns {Promise<Array<{user_id: string}>>}
 */
const getApprovedParticipants = async (meetupId, options = {}) => {
  const { excludeUserId = null, client = null } = options;
  const db = client || pool;

  let query = `
    SELECT mp.user_id
    FROM meetup_participants mp
    WHERE mp.meetup_id = $1
      AND mp.status IN ('참가승인', '승인', 'approved')
  `;
  const params = [meetupId];

  if (excludeUserId) {
    query += ` AND mp.user_id != $2`;
    params.push(excludeUserId);
  }

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * 여러 사용자에게 일괄 알림 생성 (DB + 푸시)
 * @param {Array<string>} userIds - 사용자 ID 배열
 * @param {string} type - 알림 타입
 * @param {string} title - 알림 제목
 * @param {string} message - 알림 메시지
 * @param {string} meetupId - 관련 모임 ID
 * @param {Object} extraData - 추가 데이터 (optional)
 * @param {Object} client - DB 트랜잭션 클라이언트 (optional)
 */
const notifyMultipleUsers = async (userIds, type, title, message, meetupId, extraData = {}, client = null) => {
  if (!userIds || userIds.length === 0) {
    return;
  }

  const db = client || pool;

  // DB 알림 레코드 일괄 생성
  const values = [];
  const placeholders = [];
  let paramIndex = 1;

  for (const userId of userIds) {
    placeholders.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, false, NOW())`
    );
    values.push(
      userId,
      type,
      title,
      message,
      meetupId,
      JSON.stringify(extraData)
    );
    paramIndex += 6;
  }

  if (placeholders.length > 0) {
    await db.query(`
      INSERT INTO notifications (user_id, type, title, message, meetup_id, data, is_read, created_at)
      VALUES ${placeholders.join(', ')}
    `, values);
  }

  // FCM 푸시 알림 (비동기, 실패해도 DB 알림은 유지)
  sendMultiplePush(
    userIds,
    title,
    message,
    { type, meetupId: String(meetupId), ...extraData }
  ).catch(err => logger.error('모임 알림 푸시 전송 실패:', err.message));
};

/**
 * 모임 취소 시 참가자 전원에게 알림 발송
 * @param {Object} meetup - 모임 객체 (id, title, host_id)
 * @param {string} cancelType - 취소 유형 ('host' | 'auto')
 * @param {Object} client - DB 트랜잭션 클라이언트 (optional)
 */
const notifyMeetupCancelled = async (meetup, cancelType = 'host', client = null) => {
  const participants = await getApprovedParticipants(meetup.id, {
    excludeUserId: meetup.host_id,
    client,
  });
  const userIds = participants.map(p => p.user_id);

  if (cancelType === 'host') {
    await notifyMultipleUsers(
      userIds,
      'meetup_cancelled',
      '모임이 취소되었습니다',
      `'${meetup.title}' 모임이 호스트에 의해 취소되었습니다.`,
      meetup.id,
      { cancelType: 'host' },
      client
    );
  } else {
    await notifyMultipleUsers(
      userIds,
      'meetup_auto_cancelled',
      '모임이 자동 취소되었습니다',
      `'${meetup.title}' 모임이 최소 인원 미달로 취소되었습니다.`,
      meetup.id,
      { cancelType: 'auto_min_participants' },
      client
    );

    // 자동 취소 시 호스트에게도 알림
    if (meetup.host_id) {
      await notifyMultipleUsers(
        [meetup.host_id],
        'meetup_auto_cancelled',
        '모임이 자동 취소되었습니다',
        `'${meetup.title}' 모임이 최소 인원 미달로 자동 취소되었습니다.`,
        meetup.id,
        { cancelType: 'auto_min_participants', isHost: 'true' },
        client
      );
    }
  }

  return userIds;
};

/**
 * 모임 정보 변경 시 참가자 전원에게 알림 발송
 * @param {Object} meetup - 모임 객체 (id, title, host_id)
 * @param {Object} changes - 변경된 항목 { field: { from, to } }
 * @param {Object} client - DB 트랜잭션 클라이언트 (optional)
 */
const notifyMeetupUpdated = async (meetup, changes, client = null) => {
  const participants = await getApprovedParticipants(meetup.id, {
    excludeUserId: meetup.host_id,
    client,
  });
  const userIds = participants.map(p => p.user_id);

  if (userIds.length === 0) {
    return [];
  }

  // 변경 항목에 따라 메시지 구성
  const changeDescriptions = [];
  if (changes.date) {
    changeDescriptions.push('날짜');
  }
  if (changes.time) {
    changeDescriptions.push('시간');
  }
  if (changes.location || changes.address) {
    changeDescriptions.push('장소');
  }
  if (changes.max_participants || changes.maxParticipants) {
    changeDescriptions.push('인원');
  }

  if (changeDescriptions.length === 0) {
    return [];
  }

  const changedText = changeDescriptions.join(', ');
  const message = `'${meetup.title}' 모임의 ${changedText}이(가) 변경되었습니다.`;

  await notifyMultipleUsers(
    userIds,
    'meetup_updated',
    '모임 정보가 변경되었습니다',
    message,
    meetup.id,
    { changedFields: changeDescriptions, changes },
    client
  );

  return userIds;
};

/**
 * 모임 취소 시 약속금 자동 환불 처리
 * @param {string} meetupId - 모임 ID
 * @param {Object} client - DB 트랜잭션 클라이언트 (optional)
 * @returns {Promise<Array>} 환불된 약속금 목록
 */
const refundDepositsForMeetup = async (meetupId, client = null) => {
  const db = client || pool;

  // 해당 모임의 paid 상태 약속금 조회
  const depositsResult = await db.query(`
    SELECT id, user_id, amount
    FROM promise_deposits
    WHERE meetup_id = $1 AND status = 'paid'
  `, [meetupId]);

  const refunded = [];

  for (const deposit of depositsResult.rows) {
    // 약속금 환불 처리
    await db.query(`
      UPDATE promise_deposits
      SET status = 'refunded',
          refund_amount = $1,
          cancellation_type = 'meetup_cancelled',
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `, [deposit.amount, deposit.id]);

    // 포인트로 환불
    await db.query(`
      INSERT INTO user_points (user_id, total_earned, available_points, total_used)
      VALUES ($1, $2, $2, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        available_points = user_points.available_points + $2,
        updated_at = NOW()
    `, [deposit.user_id, deposit.amount]);

    // 포인트 거래 내역 추가
    await db.query(`
      INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
      VALUES ($1, 'earned', $2, $3, NOW())
    `, [deposit.user_id, deposit.amount, `모임 취소로 인한 약속금 환불 (모임 ID: ${meetupId})`]);

    refunded.push({
      depositId: deposit.id,
      userId: deposit.user_id,
      amount: deposit.amount,
    });
  }

  if (refunded.length > 0) {
    logger.info(`모임 취소 약속금 환불: meetup=${meetupId}, ${refunded.length}건, 총액=${refunded.reduce((s, r) => s + r.amount, 0)}원`);
  }

  return refunded;
};

/**
 * 호스트 취소 이력 기록 및 반복 취소 패널티 확인
 * @param {string} userId - 호스트 사용자 ID
 * @param {string} meetupId - 취소한 모임 ID
 * @param {Object} client - DB 트랜잭션 클라이언트 (optional)
 * @returns {Promise<{cancellationCount: number, penaltyApplied: boolean}>}
 */
const recordHostCancellationAndCheckPenalty = async (userId, meetupId, client = null) => {
  const db = client || pool;
  const { updateBabalScore } = require('../../../utils/babalScore');

  // 취소 이력 기록
  await db.query(`
    INSERT INTO user_cancellation_history (user_id, meetup_id, cancellation_type, reason, created_at)
    VALUES ($1, $2, 'host_cancel', '호스트 모임 취소', NOW())
  `, [userId, meetupId]);

  // 최근 30일간 호스트 취소 횟수 조회
  const countResult = await db.query(`
    SELECT COUNT(*) as cancel_count
    FROM user_cancellation_history
    WHERE user_id = $1
      AND cancellation_type = 'host_cancel'
      AND created_at > NOW() - INTERVAL '30 days'
  `, [userId]);

  const cancellationCount = parseInt(countResult.rows[0].cancel_count);
  let penaltyApplied = false;

  // 3회 이상 취소 시 패널티
  if (cancellationCount >= 3) {
    await updateBabalScore(userId, 'HOST_REPEATED_CANCEL', {
      meetupId,
      client: db !== pool ? db : undefined,
    });

    logger.warn(`호스트 반복 취소 패널티: user=${userId}, 최근 30일 취소=${cancellationCount}회, 밥알지수 -3.0`);

    // 호스트에게 패널티 알림
    await db.query(`
      INSERT INTO notifications (user_id, type, title, message, meetup_id, data, is_read, created_at)
      VALUES ($1, 'host_penalty', '호스트 반복 취소 경고', $2, $3, $4, false, NOW())
    `, [
      userId,
      `최근 30일간 ${cancellationCount}회 모임을 취소하셨습니다. 밥알지수가 3.0 차감되었습니다.`,
      meetupId,
      JSON.stringify({ cancellationCount, penaltyAmount: -3.0 }),
    ]);

    sendPushNotification(
      userId,
      '호스트 반복 취소 경고',
      `최근 30일간 ${cancellationCount}회 모임을 취소하셨습니다. 밥알지수가 3.0 차감되었습니다.`,
      { type: 'host_penalty', meetupId: String(meetupId) }
    ).catch(err => logger.error('호스트 패널티 푸시 전송 실패:', err.message));

    penaltyApplied = true;
  }

  return { cancellationCount, penaltyApplied };
};

module.exports = {
  getApprovedParticipants,
  notifyMultipleUsers,
  notifyMeetupCancelled,
  notifyMeetupUpdated,
  refundDepositsForMeetup,
  recordHostCancellationAndCheckPenalty,
};
