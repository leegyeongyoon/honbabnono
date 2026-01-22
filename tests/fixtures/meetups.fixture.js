/**
 * Meetup Fixtures
 * 테스트용 모임 데이터 팩토리
 */

let meetupCounter = 0;

/**
 * 기본 모임 데이터 생성
 * @param {string} hostId - 호스트 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 모임 데이터
 */
const createMeetupFixture = (hostId, overrides = {}) => {
  meetupCounter++;
  const timestamp = Date.now();
  const tomorrow = new Date(Date.now() + 86400000);

  return {
    id: overrides.id || `meetup-${timestamp}-${meetupCounter}`,
    host_id: hostId,
    title: overrides.title || `테스트 모임 ${meetupCounter}`,
    description: overrides.description || '테스트 모임 설명입니다.',
    category: overrides.category || '한식',
    location: overrides.location || '서울시 강남구',
    address: overrides.address || '서울시 강남구 테헤란로 123',
    latitude: overrides.latitude || '37.5065',
    longitude: overrides.longitude || '127.0536',
    date: overrides.date || tomorrow.toISOString().split('T')[0],
    time: overrides.time || '18:00:00',
    max_participants: overrides.max_participants || 4,
    current_participants: overrides.current_participants || 1,
    price_range: overrides.price_range || '1-2만원',
    age_range: overrides.age_range || '전체',
    gender_preference: overrides.gender_preference || '상관없음',
    status: overrides.status || '모집중',
    image: overrides.image || null,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
    ...overrides,
  };
};

/**
 * 참가자 데이터 생성
 * @param {string} meetupId - 모임 ID
 * @param {string} userId - 사용자 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 참가자 데이터
 */
const createParticipantFixture = (meetupId, userId, overrides = {}) => {
  const timestamp = Date.now();
  return {
    id: overrides.id || `participant-${timestamp}`,
    meetup_id: meetupId,
    user_id: userId,
    status: overrides.status || '참가승인',
    attended: overrides.attended !== undefined ? overrides.attended : false,
    joined_at: overrides.joined_at || new Date(),
    ...overrides,
  };
};

/**
 * 완료된 모임 데이터 생성
 * @param {string} hostId - 호스트 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 완료된 모임 데이터
 */
const createCompletedMeetupFixture = (hostId, overrides = {}) => {
  const yesterday = new Date(Date.now() - 86400000);
  return createMeetupFixture(hostId, {
    status: '완료',
    date: yesterday.toISOString().split('T')[0],
    ...overrides,
  });
};

/**
 * 모집완료 모임 데이터 생성
 * @param {string} hostId - 호스트 ID
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 모집완료 모임 데이터
 */
const createFullMeetupFixture = (hostId, overrides = {}) => {
  return createMeetupFixture(hostId, {
    status: '모집완료',
    current_participants: 4,
    max_participants: 4,
    ...overrides,
  });
};

/**
 * 위치 기반 모임 데이터 생성 (주변 검색 테스트용)
 * @param {string} hostId - 호스트 ID
 * @param {number} lat - 위도
 * @param {number} lng - 경도
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 위치 기반 모임 데이터
 */
const createNearbyMeetupFixture = (hostId, lat, lng, overrides = {}) => {
  return createMeetupFixture(hostId, {
    latitude: String(lat),
    longitude: String(lng),
    ...overrides,
  });
};

/**
 * 모임 배열 생성
 * @param {string} hostId - 호스트 ID
 * @param {number} count - 생성할 모임 수
 * @param {Object} overrides - 공통 덮어쓸 속성
 * @returns {Array} 모임 배열
 */
const createMeetupsFixture = (hostId, count, overrides = {}) => {
  return Array.from({ length: count }, (_, index) =>
    createMeetupFixture(hostId, { ...overrides, title: `테스트 모임 ${index + 1}` })
  );
};

/**
 * 테스트 카운터 초기화
 */
const resetMeetupCounter = () => {
  meetupCounter = 0;
};

module.exports = {
  createMeetupFixture,
  createParticipantFixture,
  createCompletedMeetupFixture,
  createFullMeetupFixture,
  createNearbyMeetupFixture,
  createMeetupsFixture,
  resetMeetupCounter,
};
