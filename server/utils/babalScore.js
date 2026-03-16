/**
 * 밥알지수 통합 계산 모듈
 *
 * 피라미드 구조 알고리즘:
 * - 시작값: 36.5
 * - 범위: 0 ~ 99
 * - 올리기 극도로 어렵고 (0.05~0.1 단위), 내리기는 확실하게 (-2.0~-3.0)
 * - 노쇼 1회 = 출석 40회분 증발
 * - 대부분 유저: 36~39 / 활발한 유저: 40~45 / 상위 1%: 50+ / 전설: 60+
 */

const pool = require('../config/database');
const logger = require('../config/logger');

// 밥알지수 상수
const BABAL_INITIAL = 36.5;
const BABAL_MIN = 0;
const BABAL_MAX = 99;

// === 점수 변동 이벤트 ===
// 상승: 극도로 느림 (피라미드 꼭대기까지 수백 회 활동 필요)
// 하락: 확실하게 (신뢰 깨뜨리면 복구 오래 걸림)
const SCORE_EVENTS = {
  // ─── 상승 이벤트 (한 끗씩) ───
  MEETUP_ATTENDED:       { amount: +0.05, reason: '모임 출석 완료' },
  REVIEW_RECEIVED_GOOD:  { amount: +0.1,  reason: '좋은 리뷰 수신 (4-5점)' },
  REVIEW_RECEIVED_NORMAL:{ amount: +0.03, reason: '보통 리뷰 수신 (3점)' },
  REVIEW_WRITTEN_QUALITY:{ amount: +0.02, reason: '정성 리뷰 작성 (30자+)' },
  HOST_MEETUP_COMPLETED: { amount: +0.1,  reason: '호스트 모임 성공 완료' },

  // ─── 하락 이벤트 (확실하게) ───
  NO_SHOW:              { amount: -2.0,  reason: '노쇼' },
  REVIEW_RECEIVED_BAD:  { amount: -0.2,  reason: '나쁜 리뷰 수신 (1-2점)' },
  LATE_CANCEL:          { amount: -0.5,  reason: '24시간 내 참가 취소' },
  REPORT_CONFIRMED:     { amount: -3.0,  reason: '신고 확정' },
  HOST_REPEATED_CANCEL: { amount: -3.0,  reason: '호스트 반복 취소 (3회 이상)' },
};

/*
 * 피라미드 시뮬레이션:
 *
 * 36.5 → 40 (3.5점 필요)
 *   출석 70회 (0.05 × 70 = 3.5) — 주 2회 모임 시 약 9개월
 *   또는 출석 40 + 좋은리뷰 10 + 호스트5 = 2.0 + 1.0 + 0.5 = 3.5
 *
 * 40 → 50 (10점 필요)
 *   출석만으로: 200회 (약 2년) — 현실적으로 리뷰/호스트 복합 필요
 *
 * 50 → 60 (10점 필요)
 *   순수 활동만으로 1년+, 노쇼 0회 필수
 *
 * 노쇼 1회 (-2.0) = 출석 40회분 증발
 * 노쇼 2회 = 출석 80회분 = 약 10개월 활동 날림
 */

/**
 * 밥알지수 변동 처리
 */
async function updateBabalScore(userId, eventType, options = {}) {
  const { meetupId = null, reviewId = null, client = null } = options;
  const db = client || pool;

  const event = SCORE_EVENTS[eventType];
  if (!event) {
    throw new Error(`알 수 없는 밥알지수 이벤트: ${eventType}`);
  }

  const userResult = await db.query(
    'SELECT babal_score FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error(`사용자를 찾을 수 없음: ${userId}`);
  }

  const previousScore = parseFloat(userResult.rows[0].babal_score) || BABAL_INITIAL;
  const rawNew = previousScore + event.amount;
  // 소수점 둘째 자리까지 (0.05 단위 지원)
  const newScore = Math.round(Math.max(BABAL_MIN, Math.min(BABAL_MAX, rawNew)) * 100) / 100;

  await db.query(
    'UPDATE users SET babal_score = $1, updated_at = NOW() WHERE id = $2',
    [newScore, userId]
  );

  await db.query(`
    INSERT INTO babal_score_history (user_id, previous_score, new_score, change_amount, reason, related_meetup_id, related_review_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [userId, previousScore, newScore, event.amount, event.reason, meetupId, reviewId]);

  logger.info(`밥알지수: user=${userId}, ${previousScore} → ${newScore} (${event.amount > 0 ? '+' : ''}${event.amount}, ${event.reason})`);

  return { previousScore, newScore, changeAmount: event.amount };
}

/**
 * 리뷰 평점 → 밥알지수 이벤트
 */
function getReviewScoreEvent(rating) {
  if (rating >= 4) return 'REVIEW_RECEIVED_GOOD';
  if (rating === 3) return 'REVIEW_RECEIVED_NORMAL';
  return 'REVIEW_RECEIVED_BAD';
}

/**
 * 밥알지수 등급 (피라미드 구조)
 *
 * 60+ : 밥알 전설 — 상위 0.1%, 거의 도달 불가
 * 50+ : 밥알 고수 — 상위 1%, 1년+ 꾸준 활동
 * 42+ : 단골 밥친구 — 상위 10%, 수개월 활동
 * 36.5+: 밥친구 — 대부분 유저 (기본값)
 * 30+ : 새싹 — 시작 미만, 약간의 이슈
 * <30  : 주의 — 노쇼/신고 이력
 */
function getBabalLevel(score) {
  if (score >= 60) return { level: 6, label: '밥알 전설', color: '#D4482C', description: '상위 0.1%' };
  if (score >= 50) return { level: 5, label: '밥알 고수', color: '#FF6B35', description: '상위 1%' };
  if (score >= 42) return { level: 4, label: '단골 밥친구', color: '#4CAF50', description: '상위 10%' };
  if (score >= 36.5) return { level: 3, label: '밥친구', color: '#2196F3', description: '일반' };
  if (score >= 30) return { level: 2, label: '새싹', color: '#9E9E9E', description: '시작 미만' };
  return { level: 1, label: '주의', color: '#F44336', description: '신뢰 낮음' };
}

/**
 * 밥알지수 색상 (온도계 스타일 그라데이션)
 */
function getBabalColor(score) {
  if (score >= 60) return '#D4482C';
  if (score >= 50) return '#FF6B35';
  if (score >= 42) return '#4CAF50';
  if (score >= 36.5) return '#2196F3';
  if (score >= 30) return '#9E9E9E';
  return '#F44336';
}

module.exports = {
  BABAL_INITIAL,
  BABAL_MIN,
  BABAL_MAX,
  SCORE_EVENTS,
  updateBabalScore,
  getReviewScoreEvent,
  getBabalLevel,
  getBabalColor,
};
