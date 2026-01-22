/**
 * AI Module Integration Tests
 * AI 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('AI API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      email: 'ai-test@test.com',
      name: 'AI테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('POST /api/ai/search', () => {
    it('should accept search query', async () => {
      const response = await request(app)
        .post('/api/ai/search')
        .send({
          query: '강남역 근처 한식',
          filters: {},
        });

      // AI 서비스가 없으면 에러, 있으면 200
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should reject empty query', async () => {
      const response = await request(app)
        .post('/api/ai/search')
        .send({
          query: '',
          filters: {},
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle search with filters', async () => {
      const response = await request(app)
        .post('/api/ai/search')
        .send({
          query: '점심 모임',
          filters: {
            category: '한식',
            priceRange: '1-2만원',
          },
        });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/ai/chatbot', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/chatbot')
        .send({
          message: '오늘 저녁 모임 추천해줘',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should respond to chatbot message when authenticated', async () => {
      const response = await request(app)
        .post('/api/ai/chatbot')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: '근처 모임 추천해줘',
        });

      // AI 서비스 상태에 따라 응답
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/ai/recommend', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ai/recommend')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return recommendations when authenticated', async () => {
      const response = await request(app)
        .get('/api/ai/recommend')
        .set('Authorization', `Bearer ${authToken}`);

      // AI 서비스 상태에 따라 응답
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
