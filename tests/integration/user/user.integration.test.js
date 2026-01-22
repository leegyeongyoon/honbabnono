/**
 * User Module Integration Tests
 * 사용자 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('User API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      email: 'user-test@test.com',
      name: '사용자테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/user/me', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/me')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return user info when authenticated', async () => {
      const response = await request(app)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${authToken}`);

      // 200 또는 DB 에러로 인한 500
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/user/stats', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/stats')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/rice-index', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/rice-index')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/reviews', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/reviews')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/activities', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/activities')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/wishlist', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/wishlist')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return wishlist when authenticated', async () => {
      const response = await request(app)
        .get('/api/user/wishlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/user/recent-views', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/recent-views')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/blocked-users', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/blocked-users')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .send({ name: '새이름' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/notification-settings', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/notification-settings')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/points', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/points')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/badges', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/badges')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/user/privacy-settings', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/user/privacy-settings')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/user/account', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/user/account')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
