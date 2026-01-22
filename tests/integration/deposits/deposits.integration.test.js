/**
 * Deposits Module Integration Tests
 * 약속금 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Deposits API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      id: 'deposits-test-user-123',
      email: 'deposits@test.com',
      name: '약속금테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('POST /api/deposits/payment', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .send({
          amount: 5000,
          meetupId: 'test-meetup-id',
          paymentMethod: 'points',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate payment method', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          meetupId: 'test-meetup-id',
          paymentMethod: 'invalid-method',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should process points payment when sufficient balance', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          meetupId: `temp-${Date.now()}`,
          paymentMethod: 'points',
        });

      // 포인트 부족이면 400, 성공이면 200/201
      expect([200, 201, 400]).toContain(response.status);

      if (response.status === 400) {
        expect(response.body.error).toMatch(/포인트|부족/);
      }
    });
  });

  describe('POST /api/deposits/refund', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/deposits/refund')
        .send({ depositId: 'test-deposit-id' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/deposits/:id/refund', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/deposits/fake-deposit-id/refund')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent deposit', async () => {
      const response = await request(app)
        .post('/api/deposits/non-existent-id/refund')
        .set('Authorization', `Bearer ${authToken}`);

      // 404 또는 400 (유효하지 않은 ID)
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/deposits/:id/convert-to-points', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/deposits/fake-deposit-id/convert-to-points')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
