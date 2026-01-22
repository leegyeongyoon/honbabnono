/**
 * API Test Helper
 * Supertest 기반 API 테스트 헬퍼
 */
const request = require('supertest');
const app = require('../../server/index');
const { createTestToken, createAdminToken } = require('../mocks/jwt.mock');

/**
 * API 클라이언트 생성
 * @returns {Object} Supertest request 인스턴스
 */
const createApiClient = () => request(app);

/**
 * 인증된 API 클라이언트 생성
 * @param {Object} userData - 사용자 데이터
 * @returns {Object} 인증 토큰이 설정된 API 헬퍼 객체
 */
const createAuthenticatedClient = (userData = {}) => {
  const token = createTestToken(userData);

  return {
    get: (url) =>
      request(app)
        .get(url)
        .set('Authorization', `Bearer ${token}`),

    post: (url, data) =>
      request(app)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data),

    put: (url, data) =>
      request(app)
        .put(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data),

    patch: (url, data) =>
      request(app)
        .patch(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data),

    delete: (url) =>
      request(app)
        .delete(url)
        .set('Authorization', `Bearer ${token}`),

    token,
  };
};

/**
 * 관리자 인증 API 클라이언트 생성
 * @param {Object} adminData - 관리자 데이터
 * @returns {Object} 관리자 인증 토큰이 설정된 API 헬퍼 객체
 */
const createAdminClient = (adminData = {}) => {
  const token = createAdminToken(adminData);

  return {
    get: (url) =>
      request(app)
        .get(url)
        .set('Authorization', `Bearer ${token}`),

    post: (url, data) =>
      request(app)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data),

    put: (url, data) =>
      request(app)
        .put(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data),

    patch: (url, data) =>
      request(app)
        .patch(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data),

    delete: (url) =>
      request(app)
        .delete(url)
        .set('Authorization', `Bearer ${token}`),

    token,
  };
};

/**
 * API 응답 검증 헬퍼
 */
const expectSuccess = (response) => {
  expect(response.body.success).toBe(true);
  return response;
};

const expectError = (response, statusCode) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  return response;
};

const expectUnauthorized = (response) => {
  expect(response.status).toBe(401);
  return response;
};

const expectForbidden = (response) => {
  expect(response.status).toBe(403);
  return response;
};

const expectNotFound = (response) => {
  expect(response.status).toBe(404);
  return response;
};

const expectBadRequest = (response) => {
  expect(response.status).toBe(400);
  return response;
};

/**
 * 페이지네이션 응답 검증
 * @param {Object} response - API 응답
 * @param {Object} options - 검증 옵션
 */
const expectPagination = (response, options = {}) => {
  expect(response.body).toHaveProperty('meta');
  if (options.page) {expect(response.body.meta.page).toBe(options.page);}
  if (options.limit) {expect(response.body.meta.limit).toBe(options.limit);}
  if (options.total !== undefined) {expect(response.body.meta.total).toBe(options.total);}
  return response;
};

/**
 * 배열 응답 검증
 * @param {Object} response - API 응답
 * @param {string} key - 배열 키
 * @param {number} minLength - 최소 길이
 */
const expectArrayResponse = (response, key, minLength = 0) => {
  expect(response.body).toHaveProperty(key);
  expect(Array.isArray(response.body[key])).toBe(true);
  expect(response.body[key].length).toBeGreaterThanOrEqual(minLength);
  return response;
};

module.exports = {
  createApiClient,
  createAuthenticatedClient,
  createAdminClient,
  expectSuccess,
  expectError,
  expectUnauthorized,
  expectForbidden,
  expectNotFound,
  expectBadRequest,
  expectPagination,
  expectArrayResponse,
};
