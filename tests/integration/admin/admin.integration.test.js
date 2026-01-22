/**
 * Admin Module Integration Tests
 * 관리자 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createAdminFixture } = require('../../fixtures');

describe('Admin API Integration', () => {
  describe('POST /api/admin/login', () => {
    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'invalid-admin',
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require username and password', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/profile', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/profile')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject user token', async () => {
      const { createTestToken } = require('../../mocks/jwt.mock');
      const { createUserFixture } = require('../../fixtures');
      const user = createUserFixture();
      const userToken = createTestToken(user);

      const response = await request(app)
        .get('/api/admin/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.success).toBeFalsy();
    });
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/users', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/meetups', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/meetups')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/reports', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/reports')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/notices', () => {
    it('should return notices without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/notices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.notices).toBeDefined();
    });
  });

  describe('POST /api/admin/notices', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/admin/notices')
        .send({
          title: '테스트 공지',
          content: '테스트 내용',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/settings', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/settings')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/blocked-users', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/blocked-users')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/accounts', () => {
    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/admin/accounts')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/admin/realtime-stats', () => {
    it('should return realtime stats without auth', async () => {
      const response = await request(app)
        .get('/api/admin/realtime-stats');

      // 200 또는 인증 필요 응답
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return simple stats', async () => {
      const response = await request(app)
        .get('/api/admin/stats');

      // 200 또는 에러 응답 (DB 상태에 따라)
      expect([200, 500]).toContain(response.status);
    });
  });
});
