/**
 * User Fixtures
 * 테스트용 사용자 데이터 팩토리
 */
const crypto = require('crypto');

let userCounter = 0;

/**
 * UUID 형식의 ID 생성
 * @returns {string} UUID 형식 ID
 */
const generateUUID = () => crypto.randomUUID();

/**
 * 기본 사용자 데이터 생성
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 사용자 데이터
 */
const createUserFixture = (overrides = {}) => {
  userCounter++;
  const timestamp = Date.now();

  return {
    id: overrides.id || generateUUID(),
    email: overrides.email || `test${timestamp}${userCounter}@example.com`,
    name: overrides.name || `테스트유저${userCounter}`,
    password: overrides.password || 'hashedPassword123!',
    provider: overrides.provider || 'email',
    provider_id: overrides.provider_id || null,
    profile_image: overrides.profile_image || null,
    phone: overrides.phone || null,
    birth_date: overrides.birth_date || null,
    gender: overrides.gender || null,
    bio: overrides.bio || null,
    is_verified: overrides.is_verified !== undefined ? overrides.is_verified : true,
    is_blocked: overrides.is_blocked !== undefined ? overrides.is_blocked : false,
    rating: overrides.rating || 4.5,
    bab_al_score: overrides.bab_al_score || 50,
    points_balance: overrides.points_balance || 0,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
    ...overrides,
  };
};

/**
 * 카카오 사용자 데이터 생성
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 카카오 사용자 데이터
 */
const createKakaoUserFixture = (overrides = {}) => {
  const timestamp = Date.now();
  return createUserFixture({
    provider: 'kakao',
    provider_id: `kakao-${timestamp}`,
    email: `kakao${timestamp}@kakao.com`,
    ...overrides,
  });
};

/**
 * 관리자 데이터 생성
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 관리자 데이터
 */
const createAdminFixture = (overrides = {}) => {
  const timestamp = Date.now();
  return {
    id: overrides.id || generateUUID(),
    username: overrides.username || `admin${timestamp}`,
    password: overrides.password || 'adminPassword123!',
    name: overrides.name || '관리자',
    role: overrides.role || 'admin',
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
    ...overrides,
  };
};

/**
 * 차단된 사용자 데이터 생성
 * @param {Object} overrides - 덮어쓸 속성
 * @returns {Object} 차단된 사용자 데이터
 */
const createBlockedUserFixture = (overrides = {}) => {
  return createUserFixture({
    is_blocked: true,
    blocked_at: new Date(),
    blocked_reason: '테스트 차단 사유',
    ...overrides,
  });
};

/**
 * 사용자 배열 생성
 * @param {number} count - 생성할 사용자 수
 * @param {Object} overrides - 공통 덮어쓸 속성
 * @returns {Array} 사용자 배열
 */
const createUsersFixture = (count, overrides = {}) => {
  return Array.from({ length: count }, (_, index) =>
    createUserFixture({ ...overrides, name: `테스트유저${index + 1}` })
  );
};

/**
 * 테스트 카운터 초기화
 */
const resetUserCounter = () => {
  userCounter = 0;
};

module.exports = {
  createUserFixture,
  createKakaoUserFixture,
  createAdminFixture,
  createBlockedUserFixture,
  createUsersFixture,
  resetUserCounter,
};
