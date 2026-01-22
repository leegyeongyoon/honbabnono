/**
 * JWT Mock Utilities
 * 테스트용 JWT 토큰 생성 유틸리티
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

/**
 * 테스트용 사용자 토큰 생성
 * @param {Object} userData - 사용자 데이터
 * @param {Object} options - JWT 옵션
 * @returns {string} JWT 토큰
 */
const createTestToken = (userData = {}, options = {}) => {
  const defaultUser = {
    id: userData.id || `test-user-${Date.now()}`,
    userId: userData.id || userData.userId || `test-user-${Date.now()}`,
    email: userData.email || 'test@example.com',
    name: userData.name || '테스트유저',
  };

  return jwt.sign(
    { ...defaultUser, ...userData },
    JWT_SECRET,
    { expiresIn: options.expiresIn || '1h', ...options }
  );
};

/**
 * 테스트용 관리자 토큰 생성
 * @param {Object} adminData - 관리자 데이터
 * @param {Object} options - JWT 옵션
 * @returns {string} JWT 토큰
 */
const createAdminToken = (adminData = {}, options = {}) => {
  const defaultAdmin = {
    adminId: adminData.adminId || `test-admin-${Date.now()}`,
    username: adminData.username || 'testadmin',
    role: adminData.role || 'admin',
    isAdmin: true,
  };

  return jwt.sign(
    { ...defaultAdmin, ...adminData },
    JWT_SECRET,
    { expiresIn: options.expiresIn || '8h', ...options }
  );
};

/**
 * 만료된 토큰 생성 (테스트용)
 * @param {Object} userData - 사용자 데이터
 * @returns {string} 만료된 JWT 토큰
 */
const createExpiredToken = (userData = {}) => {
  return createTestToken(userData, { expiresIn: '-1h' });
};

/**
 * 잘못된 서명의 토큰 생성 (테스트용)
 * @param {Object} userData - 사용자 데이터
 * @returns {string} 잘못된 서명의 JWT 토큰
 */
const createInvalidToken = (userData = {}) => {
  const defaultUser = {
    id: userData.id || `test-user-${Date.now()}`,
    email: userData.email || 'test@example.com',
    name: userData.name || '테스트유저',
  };

  return jwt.sign(
    { ...defaultUser, ...userData },
    'wrong-secret-key',
    { expiresIn: '1h' }
  );
};

/**
 * 토큰 디코딩 (검증 없이)
 * @param {string} token - JWT 토큰
 * @returns {Object} 디코딩된 페이로드
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * 토큰 검증
 * @param {string} token - JWT 토큰
 * @returns {Object|null} 검증된 페이로드 또는 null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

module.exports = {
  JWT_SECRET,
  createTestToken,
  createAdminToken,
  createExpiredToken,
  createInvalidToken,
  decodeToken,
  verifyToken,
};
