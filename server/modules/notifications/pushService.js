const pool = require('../../config/database');
const { getMessaging } = require('../../config/firebase');
const logger = require('../../config/logger');

/**
 * 사용자에게 푸시 알림 전송
 * @param {number|string} userId - 사용자 ID
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {object} data - 추가 데이터 (optional)
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
  const messaging = getMessaging();
  if (!messaging) {
    logger.debug('푸시 알림 건너뜀: Firebase가 초기화되지 않았습니다.');
    return { success: false, reason: 'firebase_not_configured' };
  }

  try {
    // 사용자의 디바이스 토큰 조회
    const result = await pool.query(
      'SELECT token, platform FROM device_tokens WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      logger.debug(`푸시 알림 건너뜀: 사용자(${userId})에게 등록된 디바이스 토큰이 없습니다.`);
      return { success: false, reason: 'no_device_tokens' };
    }

    // 데이터 값은 모두 문자열이어야 함 (FCM 요구사항)
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = String(value);
    }

    const tokens = result.rows.map(row => row.token);
    const sendResults = await sendToTokens(tokens, title, body, stringData);

    // 실패한 토큰 정리 (invalid/unregistered)
    for (const failedToken of sendResults.failedTokens) {
      await removeDeviceToken(failedToken);
    }

    return {
      success: true,
      sent: sendResults.successCount,
      failed: sendResults.failureCount,
    };
  } catch (error) {
    logger.error('푸시 알림 전송 오류:', error.message);
    return { success: false, reason: 'send_error', error: error.message };
  }
};

/**
 * 여러 사용자에게 푸시 알림 일괄 전송
 * @param {Array<number|string>} userIds - 사용자 ID 배열
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {object} data - 추가 데이터 (optional)
 */
const sendMultiplePush = async (userIds, title, body, data = {}) => {
  const messaging = getMessaging();
  if (!messaging) {
    logger.debug('푸시 알림 건너뜀: Firebase가 초기화되지 않았습니다.');
    return { success: false, reason: 'firebase_not_configured' };
  }

  if (!userIds || userIds.length === 0) {
    return { success: false, reason: 'no_user_ids' };
  }

  try {
    // 여러 사용자의 디바이스 토큰을 한번에 조회
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await pool.query(
      `SELECT token, platform FROM device_tokens WHERE user_id IN (${placeholders})`,
      userIds
    );

    if (result.rows.length === 0) {
      logger.debug('푸시 알림 건너뜀: 등록된 디바이스 토큰이 없습니다.');
      return { success: false, reason: 'no_device_tokens' };
    }

    // 데이터 값은 모두 문자열이어야 함
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = String(value);
    }

    const tokens = result.rows.map(row => row.token);
    const sendResults = await sendToTokens(tokens, title, body, stringData);

    // 실패한 토큰 정리
    for (const failedToken of sendResults.failedTokens) {
      await removeDeviceToken(failedToken);
    }

    return {
      success: true,
      sent: sendResults.successCount,
      failed: sendResults.failureCount,
    };
  } catch (error) {
    logger.error('다중 푸시 알림 전송 오류:', error.message);
    return { success: false, reason: 'send_error', error: error.message };
  }
};

/**
 * FCM 토큰 목록으로 메시지 전송 (내부용)
 * @param {string[]} tokens - FCM 토큰 배열
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 * @param {object} data - 추가 데이터
 */
const sendToTokens = async (tokens, title, body, data) => {
  const messaging = getMessaging();
  const failedTokens = [];
  let successCount = 0;
  let failureCount = 0;

  if (tokens.length === 0) {
    return { successCount, failureCount, failedTokens };
  }

  // FCM sendEachForMulticast 사용 (500개 제한이므로 청크로 나눔)
  const BATCH_SIZE = 500;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batchTokens = tokens.slice(i, i + BATCH_SIZE);

    const message = {
      notification: {
        title,
        body,
      },
      data,
      tokens: batchTokens,
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;

      // 실패한 토큰 수집
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            // 유효하지 않은 토큰이나 등록 해제된 토큰은 삭제 대상
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-argument'
            ) {
              failedTokens.push(batchTokens[idx]);
            }
            logger.debug(`FCM 전송 실패 (토큰 ${idx}): ${resp.error?.message || 'unknown error'}`);
          }
        });
      }
    } catch (error) {
      logger.error('FCM 배치 전송 오류:', error.message);
      failureCount += batchTokens.length;
    }
  }

  logger.info(`FCM 전송 결과: 성공 ${successCount}, 실패 ${failureCount}, 토큰 정리 ${failedTokens.length}`);
  return { successCount, failureCount, failedTokens };
};

/**
 * 디바이스 FCM 토큰 등록
 * @param {number|string} userId - 사용자 ID
 * @param {string} token - FCM 토큰
 * @param {string} platform - 플랫폼 ('ios' 또는 'android')
 */
const registerDeviceToken = async (userId, token, platform = 'ios') => {
  try {
    await pool.query(`
      INSERT INTO device_tokens (user_id, token, platform, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, token)
      DO UPDATE SET platform = $3, updated_at = NOW()
    `, [userId, token, platform]);

    logger.info(`디바이스 토큰 등록 완료: 사용자(${userId}), 플랫폼(${platform})`);
    return { success: true };
  } catch (error) {
    logger.error('디바이스 토큰 등록 오류:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 유효하지 않은 디바이스 토큰 삭제
 * @param {string} token - FCM 토큰
 */
const removeDeviceToken = async (token) => {
  try {
    await pool.query(
      'DELETE FROM device_tokens WHERE token = $1',
      [token]
    );
    logger.info('유효하지 않은 디바이스 토큰 삭제 완료');
    return { success: true };
  } catch (error) {
    logger.error('디바이스 토큰 삭제 오류:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
  sendMultiplePush,
  registerDeviceToken,
  removeDeviceToken,
};
