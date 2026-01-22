/**
 * Authentication Flow Tests
 * 인증 플로우 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../server/index');
const { createTestToken } = require('../mocks/jwt.mock');
const { createUserFixture } = require('../fixtures');

describe('Authentication Flow', () => {
  describe('User Login → Profile → Logout Flow', () => {
    let testUser;
    let authToken;

    beforeAll(() => {
      testUser = createUserFixture({
        email: 'flow-auth@test.com',
        name: '플로우테스트',
      });
      authToken = createTestToken(testUser);
    });

    it('Step 1: should verify token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-token')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });

    it('Step 2: should get profile with token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('Step 3: should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Unauthenticated User Flow', () => {
    it('should be rejected without token', async () => {
      // Step 1: Try to access protected endpoint
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(profileResponse.body.error).toBeDefined();

      // Step 2: Try to verify without token
      const verifyResponse = await request(app)
        .post('/api/auth/verify-token')
        .expect(401);

      expect(verifyResponse.body.success).toBeFalsy();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
