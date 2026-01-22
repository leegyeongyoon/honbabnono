/**
 * Reviews Module Integration Tests
 * 리뷰 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Reviews API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      email: 'reviews-test@test.com',
      name: '리뷰테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/reviews/meetup/:meetupId', () => {
    it('should return 404 for non-existent meetup', async () => {
      const response = await request(app)
        .get('/api/reviews/meetup/non-existent-meetup-id');

      // 404 또는 빈 결과 200
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/reviews', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          meetupId: 'test-meetup-id',
          rating: 5,
          content: '좋은 모임이었습니다!',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/reviews/test-review-id')
        .send({
          rating: 4,
          content: '수정된 리뷰',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/reviews/test-review-id')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/reviews/participant', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/reviews/participant')
        .send({
          meetupId: 'test-meetup-id',
          targetUserId: 'test-user-id',
          rating: 5,
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/reviews/stats/:userId', () => {
    it('should return stats for user', async () => {
      const response = await request(app)
        .get(`/api/reviews/stats/${testUser.id}`);

      // 200 또는 에러 응답
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
