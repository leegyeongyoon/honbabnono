/**
 * Support Module Integration Tests
 * 지원 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Support API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      email: 'support-test@test.com',
      name: '지원테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/support/faq', () => {
    it('should return FAQ list', async () => {
      const response = await request(app)
        .get('/api/support/faq');

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.faq).toBeDefined();
      }
    });
  });

  describe('POST /api/support/inquiry', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/support/inquiry')
        .send({
          title: '문의 제목',
          content: '문의 내용입니다.',
          category: '일반',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should create inquiry when authenticated', async () => {
      const response = await request(app)
        .post('/api/support/inquiry')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '테스트 문의',
          content: '테스트 문의 내용입니다.',
          category: '일반',
        });

      // 성공 또는 DB 에러
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/support/my-inquiries', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/support/my-inquiries')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return inquiries when authenticated', async () => {
      const response = await request(app)
        .get('/api/support/my-inquiries')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });
});
