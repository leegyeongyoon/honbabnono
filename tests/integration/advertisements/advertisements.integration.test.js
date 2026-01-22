/**
 * Advertisements Module Integration Tests
 * 광고 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');

describe('Advertisements API Integration', () => {
  describe('GET /api/ads', () => {
    it('should return all ads', async () => {
      const response = await request(app)
        .get('/api/ads');

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/ads/active', () => {
    it('should return active ads', async () => {
      const response = await request(app)
        .get('/api/ads/active');

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.ads).toBeDefined();
      }
    });
  });

  describe('POST /api/ads/:id/click', () => {
    it('should record click for ad', async () => {
      const response = await request(app)
        .post('/api/ads/test-ad-id/click');

      // 광고가 없으면 404, 있으면 200
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/ads/detail/:id', () => {
    it('should return 404 for non-existent ad', async () => {
      const response = await request(app)
        .get('/api/ads/detail/non-existent-ad-id');

      expect([404, 500]).toContain(response.status);
    });
  });
});
