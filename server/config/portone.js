/**
 * PortOne (구 아임포트) 결제 연동 설정
 *
 * 환경변수:
 * - PORTONE_API_KEY: PortOne REST API Key (imp_key)
 * - PORTONE_API_SECRET: PortOne REST API Secret (imp_secret)
 * - PORTONE_STORE_ID: PortOne 상점 ID (가맹점 식별코드)
 */

const axios = require('axios');
const logger = require('./logger');

const PORTONE_API_BASE = 'https://api.iamport.kr';

const config = {
  apiKey: process.env.PORTONE_API_KEY,
  apiSecret: process.env.PORTONE_API_SECRET,
  storeId: process.env.PORTONE_STORE_ID,
};

/**
 * PortOne 액세스 토큰 발급
 * POST https://api.iamport.kr/users/getToken
 * @returns {Promise<string>} access_token
 */
const getAccessToken = async () => {
  try {
    const response = await axios.post(`${PORTONE_API_BASE}/users/getToken`, {
      imp_key: config.apiKey,
      imp_secret: config.apiSecret,
    });

    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'PortOne 토큰 발급 실패');
    }

    return response.data.response.access_token;
  } catch (error) {
    logger.error('PortOne 토큰 발급 실패:', error.message);
    throw new Error('결제 서비스 인증에 실패했습니다.');
  }
};

/**
 * PortOne 결제 정보 조회 (검증)
 * GET https://api.iamport.kr/payments/{imp_uid}
 * @param {string} impUid - PortOne 결제 고유번호
 * @returns {Promise<Object>} 결제 정보 객체
 */
const verifyPayment = async (impUid) => {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(`${PORTONE_API_BASE}/payments/${impUid}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.data.code !== 0) {
      throw new Error(response.data.message || '결제 정보 조회 실패');
    }

    return response.data.response;
  } catch (error) {
    logger.error('PortOne 결제 검증 실패:', error.message);
    throw new Error('결제 검증에 실패했습니다.');
  }
};

/**
 * PortOne 결제 취소 (환불)
 * POST https://api.iamport.kr/payments/cancel
 * @param {string} impUid - PortOne 결제 고유번호
 * @param {string} reason - 환불 사유
 * @param {number} [amount] - 부분 환불 금액 (미지정 시 전액 환불)
 * @returns {Promise<Object>} 취소 결과 객체
 */
const cancelPayment = async (impUid, reason, amount) => {
  try {
    const accessToken = await getAccessToken();

    const cancelData = {
      imp_uid: impUid,
      reason: reason,
    };

    // 부분 환불인 경우 금액 지정
    if (amount !== undefined && amount !== null) {
      cancelData.amount = amount;
    }

    const response = await axios.post(
      `${PORTONE_API_BASE}/payments/cancel`,
      cancelData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || '결제 취소 실패');
    }

    return response.data.response;
  } catch (error) {
    logger.error('PortOne 결제 취소 실패:', error.message);
    throw new Error('결제 취소에 실패했습니다.');
  }
};

module.exports = {
  config,
  getAccessToken,
  verifyPayment,
  cancelPayment,
};
