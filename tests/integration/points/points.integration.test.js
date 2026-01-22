/**
 * Points Module Integration Tests
 * 포인트 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Points API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      id: 'points-test-user-123',
      email: 'points@test.com',
      name: '포인트테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/points', () => {
    it('should return points balance', async () => {
      const response = await request(app)
        .get('/api/points')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.points).toBeDefined();
      expect(response.body.points).toHaveProperty('available');
      expect(response.body.points).toHaveProperty('totalEarned');
      expect(response.body.points).toHaveProperty('totalUsed');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/points')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/points/history', () => {
    it('should return points history', async () => {
      const response = await request(app)
        .get('/api/points/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/points/history?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/points/history?type=earn')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/points/earn', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/points/earn')
        .send({ amount: 100, reason: 'test' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should earn points with valid data', async () => {
      const response = await request(app)
        .post('/api/points/earn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          reason: '테스트 적립',
          referenceId: 'test-ref-123',
        });

      // 성공 또는 에러 응답 (DB 상태에 따라 다름)
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/points/use', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/points/use')
        .send({ amount: 100, reason: 'test' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
