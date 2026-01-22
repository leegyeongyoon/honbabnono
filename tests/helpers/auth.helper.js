/**
 * Auth Test Helper
 * 인증 관련 테스트 헬퍼 함수
 */
const { createTestToken, createAdminToken } = require('../mocks/jwt.mock');

/**
 * 인증 헤더 생성
 * @param {Object} userData - 사용자 데이터
 * @returns {Object} Authorization 헤더
 */
const getAuthHeader = (userData = {}) => {
  const token = createTestToken(userData);
  return { Authorization: `Bearer ${token}` };
};

/**
 * 관리자 인증 헤더 생성
 * @param {Object} adminData - 관리자 데이터
 * @returns {Object} Authorization 헤더
 */
const getAdminAuthHeader = (adminData = {}) => {
  const token = createAdminToken(adminData);
  return { Authorization: `Bearer ${token}` };
};

/**
 * 테스트용 사용자 컨텍스트 생성
 * @param {Object} userData - 사용자 데이터
 * @returns {Object} 사용자 컨텍스트 (token, headers, user)
 */
const createUserContext = (userData = {}) => {
  const user = {
    id: userData.id || `test-user-${Date.now()}`,
    email: userData.email || 'test@example.com',
    name: userData.name || '테스트유저',
    ...userData,
  };

  const token = createTestToken(user);

  return {
    user,
    token,
    headers: { Authorization: `Bearer ${token}` },
  };
};

/**
 * 테스트용 관리자 컨텍스트 생성
 * @param {Object} adminData - 관리자 데이터
 * @returns {Object} 관리자 컨텍스트 (token, headers, admin)
 */
const createAdminContext = (adminData = {}) => {
  const admin = {
    adminId: adminData.adminId || `test-admin-${Date.now()}`,
    username: adminData.username || 'testadmin',
    role: adminData.role || 'admin',
    ...adminData,
  };

  const token = createAdminToken(admin);

  return {
    admin,
    token,
    headers: { Authorization: `Bearer ${token}` },
  };
};

/**
 * Mock Request 객체 생성 (인증된 사용자)
 * @param {Object} userData - 사용자 데이터
 * @param {Object} reqOverrides - Request 덮어쓸 속성
 * @returns {Object} Mock Request 객체
 */
const createAuthenticatedRequest = (userData = {}, reqOverrides = {}) => {
  const user = {
    id: userData.id || `test-user-${Date.now()}`,
    userId: userData.id || userData.userId || `test-user-${Date.now()}`,
    email: userData.email || 'test@example.com',
    name: userData.name || '테스트유저',
    ...userData,
  };

  return {
    user,
    body: reqOverrides.body || {},
    params: reqOverrides.params || {},
    query: reqOverrides.query || {},
    headers: {
      authorization: `Bearer ${createTestToken(user)}`,
      ...reqOverrides.headers,
    },
    ...reqOverrides,
  };
};

/**
 * Mock Response 객체 생성
 * @returns {Object} Mock Response 객체
 */
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

module.exports = {
  getAuthHeader,
  getAdminAuthHeader,
  createUserContext,
  createAdminContext,
  createAuthenticatedRequest,
  createMockResponse,
};
