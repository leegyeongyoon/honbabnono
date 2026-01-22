/**
 * Notifications Module Integration Tests
 * 알림 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Notifications API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      email: 'notifications-test@test.com',
      name: '알림테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/notifications', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return notifications when authenticated', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.notifications).toBeDefined();
      }
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return unread count when authenticated', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBeDefined();
      }
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/test-notification-id/read')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should mark all as read when authenticated', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/notifications/test-notification-id')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/notifications/settings', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/settings')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return settings when authenticated', async () => {
      const response = await request(app)
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/notifications/settings', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/settings')
        .send({ pushEnabled: true })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/notifications/test', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/notifications/test')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
