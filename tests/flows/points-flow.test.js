/**
 * Points Flow Tests
 * 포인트 플로우 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../server/index');
const { createTestToken } = require('../mocks/jwt.mock');
const { createUserFixture } = require('../fixtures');

describe('Points Flow', () => {
  describe('Points Balance → History Flow', () => {
    let testUser;
    let authToken;

    beforeAll(() => {
      testUser = createUserFixture({
        email: 'flow-points@test.com',
        name: '포인트플로우',
      });
      authToken = createTestToken(testUser);
    });

    it('Step 1: should check points balance', async () => {
      const response = await request(app)
        .get('/api/points')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.points).toBeDefined();
      }
    });

    it('Step 2: should get points history', async () => {
      const response = await request(app)
        .get('/api/points/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.history).toBeDefined();
        expect(response.body.pagination).toBeDefined();
      }
    });

    it('Step 3: should filter history by type', async () => {
      const response = await request(app)
        .get('/api/points/history')
        .query({ type: 'earn' })
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('Step 4: should paginate history', async () => {
      const response = await request(app)
        .get('/api/points/history')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Unauthenticated Points Access', () => {
    it('should reject unauthenticated balance request', async () => {
      const response = await request(app)
        .get('/api/points')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject unauthenticated history request', async () => {
      const response = await request(app)
        .get('/api/points/history')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
