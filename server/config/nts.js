/**
 * 국세청 사업자등록정보 진위확인/상태조회 연동 (공공데이터포털)
 *
 * API: https://api.odcloud.kr/api/nts-businessman/v1
 * - POST /status   : 사업자 상태조회 (계속사업자/휴업자/폐업자)
 * - POST /validate : 진위확인 (사업자번호 + 개업일자 + 대표자명 일치 여부)
 *
 * 환경변수:
 * - NTS_API_KEY: 공공데이터포털 일반 인증키(Decoding). 미설정 시 비활성 — 수동 승인 폴백.
 *
 * 결과는 참고 신호로만 기록하며, 점주 인증의 최종 게이트는
 * 관리자 수동 승인(verification_status)이다.
 */

const axios = require('axios');
const logger = require('./logger');

const NTS_API_BASE = 'https://api.odcloud.kr/api/nts-businessman/v1';
const REQUEST_TIMEOUT_MS = 5000;

const config = {
  serviceKey: process.env.NTS_API_KEY,
};

const isEnabled = () => Boolean(config.serviceKey);

/** 사업자번호에서 하이픈 제거 (API는 숫자 10자리만 허용) */
const normalizeBusinessNumber = (businessNumber) => String(businessNumber || '').replace(/-/g, '');

/**
 * 사업자 상태조회 (휴폐업 확인)
 * @param {string} businessNumber - 사업자등록번호 (하이픈 허용)
 * @returns {Promise<Object>} { b_no, b_stt('계속사업자'|'휴업자'|'폐업자'|''), b_stt_cd, tax_type, ... }
 */
const checkStatus = async (businessNumber) => {
  try {
    const response = await axios.post(
      `${NTS_API_BASE}/status`,
      { b_no: [normalizeBusinessNumber(businessNumber)] },
      { params: { serviceKey: config.serviceKey }, timeout: REQUEST_TIMEOUT_MS }
    );

    const data = response.data?.data?.[0];
    if (!data) {
      throw new Error('국세청 상태조회 응답이 비어 있습니다.');
    }
    return data;
  } catch (error) {
    logger.error('국세청 사업자 상태조회 실패:', error.message);
    throw new Error('사업자 상태조회에 실패했습니다.');
  }
};

/**
 * 사업자등록정보 진위확인
 * @param {Object} params
 * @param {string} params.b_no - 사업자등록번호 (하이픈 허용)
 * @param {string} params.start_dt - 개업일자 (YYYYMMDD)
 * @param {string} params.p_nm - 대표자명
 * @returns {Promise<{valid: boolean, raw: Object}>} valid=true면 국세청 등록정보와 일치
 */
const validateBusiness = async ({ b_no, start_dt, p_nm }) => {
  try {
    const response = await axios.post(
      `${NTS_API_BASE}/validate`,
      { businesses: [{ b_no: normalizeBusinessNumber(b_no), start_dt, p_nm }] },
      { params: { serviceKey: config.serviceKey }, timeout: REQUEST_TIMEOUT_MS }
    );

    const data = response.data?.data?.[0];
    if (!data) {
      throw new Error('국세청 진위확인 응답이 비어 있습니다.');
    }
    // valid: '01' = 일치, '02' = 불일치
    return { valid: data.valid === '01', raw: data };
  } catch (error) {
    logger.error('국세청 진위확인 실패:', error.message);
    throw new Error('사업자 진위확인에 실패했습니다.');
  }
};

module.exports = {
  config,
  isEnabled,
  normalizeBusinessNumber,
  checkStatus,
  validateBusiness,
};
