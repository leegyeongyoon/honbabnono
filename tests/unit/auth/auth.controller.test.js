/**
 * Auth Controller Unit Tests
 * 인증 컨트롤러 단위 테스트
 */

// Mock 설정 (호이스팅)
const {
  createMockPool,
  mockQueryOnce,
  mockQueryError,
  resetMockQuery,
} = require('../../mocks/database.mock');

const mockPool = createMockPool();

jest.mock('../../../server/config/database', () => mockPool);
jest.mock('../../../server/config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('axios');
jest.mock('jsonwebtoken');
jest.mock('../../../server/middleware/auth', () => ({
  generateJWT: jest.fn().mockReturnValue('generated-jwt-token'),
  generateRefreshToken: jest.fn().mockReturnValue('generated-refresh-token'),
  verifyRefreshToken: jest.fn().mockReturnValue({ userId: 1, email: 'test@test.com' }),
  revokeRefreshToken: jest.fn(),
}));

const authController = require('../../../server/modules/auth/controller');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { createMockResponse, createMockRequest, createAuthenticatedRequest } = require('../../helpers/response.helper');
const { createUserFixture } = require('../../fixtures');

describe('AuthController', () => {
  let mockReq;
  let mockRes;
  let testUser;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
    testUser = createUserFixture({
      id: 'test-uuid-1234',
      email: 'test@example.com',
      name: '테스트유저',
    });
  });

  describe('verifyToken', () => {
    it('should return success with valid token', async () => {
      mockReq = createMockRequest({
        body: { token: 'valid-jwt-token' },
      });

      jwt.verify.mockReturnValue({
        userId: testUser.id,
        email: testUser.email,
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });

      await authController.verifyToken(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
    });

    it('should return 400 without token', async () => {
      mockReq = createMockRequest({
        body: {},
      });

      await authController.verifyToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        body: { token: 'valid-jwt-token' },
      });

      jwt.verify.mockReturnValue({
        userId: 'non-existent-user',
        email: 'nonexistent@example.com',
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await authController.verifyToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 401 with expired token', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      mockReq = createMockRequest({
        body: { token: 'expired-token' },
      });

      const tokenExpiredError = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw tokenExpiredError;
      });

      await authController.verifyToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toContain('만료');
      console.error = originalError;
    });

    it('should return 401 with invalid token', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      mockReq = createMockRequest({
        body: { token: 'invalid-token' },
      });

      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authController.verifyToken(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      console.error = originalError;
    });
  });

  describe('getProfile', () => {
    it('should return user profile with valid request', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id, email: testUser.email },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id, email: testUser.email },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle database error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      mockReq = createMockRequest({
        user: { userId: testUser.id, email: testUser.email },
      });

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await authController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id, email: testUser.email },
      });

      await authController.logout(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('testLogin', () => {
    it('should return user with valid email', async () => {
      mockReq = createMockRequest({
        body: {
          email: 'test@example.com',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });

      jwt.sign = jest.fn().mockReturnValue('test-jwt-token');

      await authController.testLogin(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();
    });

    it('should return 400 without email', async () => {
      mockReq = createMockRequest({
        body: {},
      });

      await authController.testLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        body: { email: 'nonexistent@example.com' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await authController.testLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('kakaoAuthRedirect', () => {
    beforeEach(() => {
      process.env.KAKAO_CLIENT_ID = 'test-client-id';
      process.env.KAKAO_REDIRECT_URI = 'http://localhost:3000/callback';
    });

    it('should redirect to kakao auth url', () => {
      mockReq = createMockRequest({});

      authController.kakaoAuthRedirect(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('kauth.kakao.com');
      expect(redirectUrl).toContain('test-client-id');
    });
  });

  describe('kakaoCallback', () => {
    beforeEach(() => {
      process.env.KAKAO_CLIENT_ID = 'test-client-id';
      process.env.KAKAO_CLIENT_SECRET = 'test-secret';
      process.env.KAKAO_REDIRECT_URI = 'http://localhost:3000/callback';
      process.env.FRONTEND_URL = 'http://localhost:3000';
    });

    it('should redirect with error if auth failed', async () => {
      mockReq = createMockRequest({
        query: { error: 'access_denied' },
      });

      await authController.kakaoCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('error=kakao_auth_failed');
    });

    it('should redirect with error if no code', async () => {
      mockReq = createMockRequest({
        query: {},
      });

      await authController.kakaoCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('error=no_auth_code');
    });

    it('should process valid kakao callback for existing user', async () => {
      mockReq = createMockRequest({
        query: { code: 'valid-auth-code' },
      });

      // Mock axios calls
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: 12345,
          kakao_account: {
            email: 'kakao@example.com',
            profile: { nickname: '카카오유저' },
          },
        },
      });

      // Mock DB - 기존 사용자 있음
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...testUser, provider: 'kakao' }],
        rowCount: 1,
      });

      await authController.kakaoCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('success=true');
    });

    it('should create new user on kakao callback', async () => {
      mockReq = createMockRequest({
        query: { code: 'valid-auth-code' },
      });

      // Mock axios calls
      axios.post.mockResolvedValueOnce({
        data: { access_token: 'kakao-access-token' },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: 12345,
          kakao_account: {
            email: 'new-kakao@example.com',
            profile: { nickname: '새카카오유저' },
          },
        },
      });

      // Mock DB - 기존 사용자 없음, 새 사용자 생성
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...testUser, provider: 'kakao' }], rowCount: 1 });

      await authController.kakaoCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
    });

    it('should handle kakao API error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      mockReq = createMockRequest({
        query: { code: 'valid-auth-code' },
      });

      // Mock axios error
      axios.post.mockRejectedValueOnce(new Error('Kakao API error'));

      await authController.kakaoCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('error=kakao_login_failed');
      console.error = originalError;
    });
  });

  describe('register', () => {
    beforeEach(() => {
      jest.mock('bcryptjs', () => ({
        hash: jest.fn().mockResolvedValue('hashed-password'),
      }));
    });

    it('should register new user', async () => {
      mockReq = createMockRequest({
        body: {
          email: 'new@example.com',
          password: 'password123',
          name: '새사용자',
        },
      });

      // 기존 사용자 확인 - 없음
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [testUser], rowCount: 1 });

      jwt.sign = jest.fn().mockReturnValue('new-token');

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should reject if email already exists', async () => {
      mockReq = createMockRequest({
        body: {
          email: testUser.email,
          password: 'password123',
          name: '기존사용자',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should validate required fields', async () => {
      mockReq = createMockRequest({
        body: {
          email: '',
          password: '',
        },
      });

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockReq = createMockRequest({
        body: {
          email: testUser.email,
          password: 'password123',
        },
      });

      const userWithPassword = {
        ...testUser,
        password: '$2b$10$hashedpassword',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [userWithPassword],
        rowCount: 1,
      });

      // bcrypt compare mock (inline for this test)
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      jwt.sign = jest.fn().mockReturnValue('login-token');

      await authController.login(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      mockReq = createMockRequest({
        body: {
          email: testUser.email,
          password: 'wrongpassword',
        },
      });

      const userWithPassword = {
        ...testUser,
        password: '$2b$10$hashedpassword',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [userWithPassword],
        rowCount: 1,
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject if user not found', async () => {
      mockReq = createMockRequest({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should validate required fields', async () => {
      mockReq = createMockRequest({
        body: {},
      });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('kakaoLogin', () => {
    it('should login with valid kakao access token', async () => {
      mockReq = createMockRequest({
        body: {
          accessToken: 'valid-kakao-access-token',
        },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: 12345,
          kakao_account: {
            email: 'kakao@example.com',
            profile: { nickname: '카카오유저' },
          },
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...testUser, provider: 'kakao' }],
        rowCount: 1,
      });

      await authController.kakaoLogin(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 without access token', async () => {
      mockReq = createMockRequest({
        body: {},
      });

      await authController.kakaoLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should create new user if not exists', async () => {
      mockReq = createMockRequest({
        body: {
          accessToken: 'valid-kakao-access-token',
        },
      });

      axios.get.mockResolvedValueOnce({
        data: {
          id: 12345,
          kakao_account: {
            email: 'new-kakao@example.com',
            profile: { nickname: '새카카오유저' },
          },
        },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...testUser, provider: 'kakao' }], rowCount: 1 });

      await authController.kakaoLogin(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });
});
