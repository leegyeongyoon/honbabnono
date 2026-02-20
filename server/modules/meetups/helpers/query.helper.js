/**
 * 쿼리 빌더 헬퍼 함수
 */
const { processImageUrl, calculateDistance } = require('../../../utils/helpers');

/**
 * 페이지네이션 계산
 * @param {number|string} page - 페이지 번호 (1부터 시작)
 * @param {number|string} limit - 페이지당 항목 수
 * @returns {{ offset: number, limit: number }}
 */
const buildPagination = (page = 1, limit = 10) => {
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const offset = (parsedPage - 1) * parsedLimit;

  return { offset, limit: parsedLimit, page: parsedPage };
};

/**
 * 모임 데이터를 클라이언트 형식으로 변환
 * @param {Object} row - DB 조회 결과 row
 * @param {Object} options - 옵션
 * @returns {Object} 변환된 모임 데이터
 */
const transformMeetupData = (row, options = {}) => {
  const { userLocation, includeDistance = false } = options;

  const meetupData = {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    date: row.date,
    time: row.time,
    maxParticipants: row.max_participants,
    currentParticipants: row.current_participants,
    category: row.category,
    priceRange: row.price_range,
    ageRange: row.age_range,
    genderPreference: row.gender_preference,
    image: processImageUrl(row.image, row.category),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    host: row['host.name'] ? {
      id: row.host_id,
      name: row['host.name'],
      profileImage: row['host.profileImage'],
      rating: row['host.rating'],
      babAlScore: row['host.babAlScore'] || 50,
    } : null,
    distance: null,
  };

  // 거리 계산
  if (includeDistance && userLocation && row.latitude && row.longitude) {
    const meetupLat = parseFloat(row.latitude);
    const meetupLng = parseFloat(row.longitude);
    if (!isNaN(meetupLat) && !isNaN(meetupLng)) {
      meetupData.distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        meetupLat,
        meetupLng
      );
    }
  }

  // 추가 계산 필드
  if (row.hours_until_start !== undefined) {
    meetupData.hoursUntilStart = parseFloat(row.hours_until_start);
  }
  meetupData.isAvailable = row.current_participants < row.max_participants;
  meetupData.isRecruiting = row.status === '모집중';

  return meetupData;
};

/**
 * 참가자 데이터 변환
 * @param {Object} row - DB 조회 결과 row
 * @returns {Object} 변환된 참가자 데이터
 */
const transformParticipantData = (row) => ({
  id: row.user_id || row.id,
  name: row.name,
  profileImage: row.profile_image,
  status: row.status,
  joinedAt: row.joined_at || row.created_at,
  babAlScore: row.babal_score || 50,
});

/**
 * 차단 사용자 필터 쿼리 생성
 * @param {string} userId - 현재 사용자 ID
 * @param {number} paramIndex - 쿼리 파라미터 인덱스
 * @returns {{ condition: string, param: string, nextIndex: number }}
 */
const buildBlockedUserFilter = (userId, paramIndex) => {
  if (!userId) {
    return { condition: '', param: null, nextIndex: paramIndex };
  }

  return {
    condition: `AND m.host_id NOT IN (
      SELECT blocked_user_id
      FROM user_blocked_users
      WHERE user_id = $${paramIndex}
    )`,
    param: userId,
    nextIndex: paramIndex + 1,
  };
};

/**
 * 위치 기반 필터링 적용
 * @param {Array} meetups - 모임 배열
 * @param {Object} locationFilter - 위치 필터 설정
 * @returns {Array} 필터링된 모임 배열
 */
const applyLocationFilter = (meetups, locationFilter) => {
  const { enabled, radius, maxResults = 20 } = locationFilter;

  if (!enabled) {
    return meetups.slice(0, maxResults);
  }

  return meetups
    .filter((m) => m.distance !== null && m.distance <= radius)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0))
    .slice(0, maxResults);
};

/**
 * 모임 기본 SELECT 쿼리
 */
const MEETUP_BASE_SELECT = `
  SELECT
    m.id, m.title, m.description, m.location, m.address,
    m.latitude, m.longitude,
    m.date, m.time, m.max_participants, m.current_participants,
    m.category, m.price_range, m.image, m.status,
    m.age_range, m.gender_preference, m.host_id,
    m.created_at, m.updated_at,
    h.name as "host.name",
    h.profile_image as "host.profileImage",
    h.rating as "host.rating",
    h.babal_score as "host.babAlScore"
  FROM meetups m
  LEFT JOIN users h ON m.host_id = h.id
`;

/**
 * 시간 기반 모임 SELECT 쿼리 (시작까지 남은 시간 포함)
 */
const MEETUP_WITH_TIME_SELECT = `
  SELECT
    m.id, m.title, m.description, m.location, m.address,
    m.latitude, m.longitude,
    m.date, m.time, m.max_participants, m.current_participants,
    m.category, m.price_range, m.image, m.status,
    m.age_range, m.gender_preference, m.host_id,
    m.created_at, m.updated_at,
    h.name as "host.name",
    h.profile_image as "host.profileImage",
    h.rating as "host.rating",
    h.babal_score as "host.babAlScore",
    EXTRACT(EPOCH FROM (m.date::date + m.time::time - NOW())) / 3600 as hours_until_start
  FROM meetups m
  LEFT JOIN users h ON m.host_id = h.id
`;

module.exports = {
  buildPagination,
  transformMeetupData,
  transformParticipantData,
  buildBlockedUserFilter,
  applyLocationFilter,
  MEETUP_BASE_SELECT,
  MEETUP_WITH_TIME_SELECT,
};
