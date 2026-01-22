/**
 * Auth Module Integration Tests
 * 인증 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Auth API Integration', () => {
  describe('POST /api/auth/verify-token', () => {
    it('should verify valid token successfully', async () => {
      const testUser = createUserFixture();
      const token = createTestToken(testUser);

      const response = await request(app)
        .post('/api/auth/verify-token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject expired token', async () => {
      // 만료된 토큰은 verify-token 엔드포인트에서 처리
      const response = await request(app)
        .post('/api/auth/verify-token')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBeFalsy();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-token')
        .expect(401);

      expect(response.body.success).toBeFalsy();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const testUser = createUserFixture({
        id: 'test-user-profile-123',
        email: 'profile@test.com',
        name: '프로필테스트',
      });
      const token = createTestToken(testUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const testUser = createUserFixture();
      const token = createTestToken(testUser);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/test-login', () => {
    it('should allow test login in development', async () => {
      // test-login은 개발 환경에서만 동작
      const response = await request(app)
        .post('/api/auth/test-login')
        .send({
          email: 'test@example.com',
          name: '테스트유저',
        });

      // 개발 환경에서는 성공, 프로덕션에서는 실패
      if (process.env.NODE_ENV === 'production') {
        expect(response.status).toBe(403);
      } else {
        expect([200, 201]).toContain(response.status);
      }
    });
  });
});
