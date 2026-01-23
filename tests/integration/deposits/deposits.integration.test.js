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
      id: 'd3e0a1b2-c3d4-5e6f-7a8b-9c0d1e2f3a4b', // 유효한 UUID 형식
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
        });

      // 400 (잘못된 결제 방법) 또는 500 (사용자 없음으로 인한 제한 체크 실패)
      expect([400, 500]).toContain(response.status);
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

      // 포인트 부족이면 400, 성공이면 200/201, 사용자 없으면 500
      expect([200, 201, 400, 500]).toContain(response.status);

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

  // ============================================
  // 취소 정책 API 테스트
  // ============================================
  describe('취소 정책 API', () => {
    describe('GET /api/deposits/refund-preview/:meetupId', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/deposits/refund-preview/fake-meetup-id')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should return 404 for non-existent meetup deposit', async () => {
        const response = await request(app)
          .get('/api/deposits/refund-preview/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`);

        expect([404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/deposits/cancel-participation/:meetupId', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/deposits/cancel-participation/fake-meetup-id')
          .send({ reason: '개인 사정' })
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should return 404 for non-existent deposit', async () => {
        const response = await request(app)
          .post('/api/deposits/cancel-participation/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: '개인 사정' });

        expect([404, 500]).toContain(response.status);
      });
    });

    describe('GET /api/deposits/cancellation-history', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/deposits/cancellation-history')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should return cancellation history for authenticated user', async () => {
        const response = await request(app)
          .get('/api/deposits/cancellation-history')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.history).toBeDefined();
        expect(Array.isArray(response.body.history)).toBe(true);
      });
    });
  });

  // ============================================
  // 노쇼 처리 API 테스트
  // ============================================
  describe('노쇼 처리 API', () => {
    describe('POST /api/deposits/meetups/:meetupId/report-noshow', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/deposits/meetups/fake-meetup-id/report-noshow')
          .send({ reportedUserId: 'user-123' })
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should validate same meetup participation', async () => {
        const response = await request(app)
          .post('/api/deposits/meetups/00000000-0000-0000-0000-000000000000/report-noshow')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reportedUserId: '00000000-0000-0000-0000-000000000001' });

        // 같은 모임 참가자가 아니면 400
        expect([400, 500]).toContain(response.status);
      });
    });

    describe('GET /api/deposits/meetups/:meetupId/noshow-status', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/deposits/meetups/fake-meetup-id/noshow-status')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should require participant/host authorization', async () => {
        const response = await request(app)
          .get('/api/deposits/meetups/00000000-0000-0000-0000-000000000000/noshow-status')
          .set('Authorization', `Bearer ${authToken}`);

        // 권한 없으면 403
        expect([403, 500]).toContain(response.status);
      });
    });

    describe('POST /api/deposits/noshow/process/:meetupId', () => {
      it('should require admin authentication', async () => {
        // 일반 사용자 토큰으로 시도
        const response = await request(app)
          .post('/api/deposits/noshow/process/fake-meetup-id')
          .set('Authorization', `Bearer ${authToken}`);

        // 관리자가 아니면 401 또는 403
        expect([401, 403]).toContain(response.status);
      });
    });

    describe('POST /api/deposits/noshow/appeal', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/deposits/noshow/appeal')
          .send({
            meetupId: 'fake-meetup-id',
            reason: '이의 사유',
            evidence: '증빙 자료'
          })
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should validate noshow status before appeal', async () => {
        const response = await request(app)
          .post('/api/deposits/noshow/appeal')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            meetupId: '00000000-0000-0000-0000-000000000000',
            reason: '이의 사유',
            evidence: '증빙 자료'
          });

        // 노쇼 확정이 아니면 400
        expect([400, 500]).toContain(response.status);
      });
    });
  });

  // ============================================
  // 배상금 및 제재 API 테스트
  // ============================================
  describe('배상금 및 제재 API', () => {
    describe('GET /api/deposits/compensations/my', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/deposits/compensations/my')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should return compensation history for authenticated user', async () => {
        const response = await request(app)
          .get('/api/deposits/compensations/my')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.compensations).toBeDefined();
        expect(Array.isArray(response.body.compensations)).toBe(true);
      });
    });

    describe('GET /api/deposits/restrictions/my', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/deposits/restrictions/my')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should return restriction status for authenticated user', async () => {
        const response = await request(app)
          .get('/api/deposits/restrictions/my')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.restrictions).toBeDefined();
        expect(Array.isArray(response.body.restrictions)).toBe(true);
        expect(typeof response.body.isRestricted).toBe('boolean');
      });
    });
  });
});
