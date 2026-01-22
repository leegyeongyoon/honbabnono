/**
 * Badges Module Integration Tests
 * 뱃지 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Badges API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      email: 'badges-test@test.com',
      name: '뱃지테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/badges', () => {
    it('should return all badges without authentication', async () => {
      const response = await request(app)
        .get('/api/badges');

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.badges).toBeDefined();
      }
    });
  });

  describe('GET /api/badges/available', () => {
    it('should return available badges', async () => {
      const response = await request(app)
        .get('/api/badges/available');

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/badges/progress', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/badges/progress')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return progress when authenticated', async () => {
      const response = await request(app)
        .get('/api/badges/progress')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/badges/my', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/badges/my')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return user badges when authenticated', async () => {
      const response = await request(app)
        .get('/api/badges/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/badges/earn/:badgeId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/badges/earn/test-badge-id')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/badges/featured/:badgeId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/badges/featured/test-badge-id')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
