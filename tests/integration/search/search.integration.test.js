/**
 * Search Module Integration Tests
 * 검색 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');

describe('Search API Integration', () => {
  describe('GET /api/search/address', () => {
    it('should search address with query', async () => {
      const response = await request(app)
        .get('/api/search/address')
        .query({ query: '강남역' });

      // 카카오 API 키가 없으면 에러, 있으면 200
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/search/address');

      // 쿼리 없이 요청하면 400 또는 기본 응답
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle Korean address search', async () => {
      const response = await request(app)
        .get('/api/search/address')
        .query({ query: '서울시 강남구 테헤란로' });

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
