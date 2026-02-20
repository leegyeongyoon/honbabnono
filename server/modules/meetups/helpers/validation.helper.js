/**
 * 검증 관련 헬퍼 함수
 */
const pool = require('../../../config/database');

/**
 * 모임 존재 여부 확인
 * @param {string} meetupId - 모임 ID
 * @returns {Promise<{ meetup: Object|null, error: string|null }>}
 */
const validateMeetupExists = async (meetupId) => {
  const result = await pool.query(
    'SELECT * FROM meetups WHERE id = $1',
    [meetupId]
  );

  if (result.rows.length === 0) {
    return { meetup: null, error: '약속을 찾을 수 없습니다.' };
  }

  return { meetup: result.rows[0], error: null };
};

/**
 * 호스트 권한 확인
 * @param {string} meetupId - 모임 ID
 * @param {string} userId - 사용자 ID
 * @returns {Promise<{ isHost: boolean, meetup: Object|null, error: string|null }>}
 */
const validateHostPermission = async (meetupId, userId) => {
  const result = await pool.query(
    'SELECT * FROM meetups WHERE id = $1',
    [meetupId]
  );

  if (result.rows.length === 0) {
    return { isHost: false, meetup: null, error: '약속을 찾을 수 없습니다.' };
  }

  const meetup = result.rows[0];
  if (meetup.host_id !== userId) {
    return { isHost: false, meetup, error: '호스트 권한이 없습니다.' };
  }

  return { isHost: true, meetup, error: null };
};

/**
 * 참가자 확인
 * @param {string} meetupId - 모임 ID
 * @param {string} userId - 사용자 ID
 * @param {string} requiredStatus - 필요한 상태 (선택, 예: '참가승인')
 * @returns {Promise<{ isParticipant: boolean, participant: Object|null, error: string|null }>}
 */
const validateParticipant = async (meetupId, userId, requiredStatus = null) => {
  let query = `
    SELECT * FROM meetup_participants
    WHERE meetup_id = $1 AND user_id = $2
  `;
  const params = [meetupId, userId];

  if (requiredStatus) {
    query += ' AND status = $3';
    params.push(requiredStatus);
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    return {
      isParticipant: false,
      participant: null,
      error: requiredStatus
        ? `${requiredStatus} 상태의 참가자가 아닙니다.`
        : '약속 참가자가 아닙니다.',
    };
  }

  return { isParticipant: true, participant: result.rows[0], error: null };
};

/**
 * 모임 상태 검증
 * @param {Object} meetup - 모임 객체
 * @param {string|string[]} requiredStatus - 필요한 상태 (단일 또는 배열)
 * @returns {{ valid: boolean, error: string|null }}
 */
const validateMeetupStatus = (meetup, requiredStatus) => {
  const statuses = Array.isArray(requiredStatus) ? requiredStatus : [requiredStatus];

  if (!statuses.includes(meetup.status)) {
    return {
      valid: false,
      error: `이 작업은 ${statuses.join(' 또는 ')} 상태에서만 가능합니다. 현재 상태: ${meetup.status}`,
    };
  }

  return { valid: true, error: null };
};

/**
 * 평점 범위 검증
 * @param {number} rating - 평점
 * @returns {{ valid: boolean, error: string|null }}
 */
const validateRating = (rating) => {
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return { valid: false, error: '평점은 1~5 사이의 숫자여야 합니다.' };
  }
  return { valid: true, error: null };
};

module.exports = {
  validateMeetupExists,
  validateHostPermission,
  validateParticipant,
  validateMeetupStatus,
  validateRating,
};
