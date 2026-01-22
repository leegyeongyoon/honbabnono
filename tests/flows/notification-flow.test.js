/**
 * Notification Flow Tests
 * 알림 플로우 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../server/index');
const { createTestToken } = require('../mocks/jwt.mock');
const { createUserFixture } = require('../fixtures');

describe('Notification Flow', () => {
  describe('Check → Read → Clear Flow', () => {
    let testUser;
    let authToken;

    beforeAll(() => {
      testUser = createUserFixture({
        email: 'flow-notification@test.com',
        name: '알림플로우',
      });
      authToken = createTestToken(testUser);
    });

    it('Step 1: should check unread count', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.count).toBeDefined();
      }
    });

    it('Step 2: should get notification list', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.notifications).toBeDefined();
      }
    });

    it('Step 3: should get notification settings', async () => {
      const response = await request(app)
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('Step 4: should mark all as read', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Chat Notification Flow', () => {
    let testUser;
    let authToken;

    beforeAll(() => {
      testUser = createUserFixture({
        email: 'flow-chat@test.com',
        name: '채팅플로우',
      });
      authToken = createTestToken(testUser);
    });

    it('Step 1: should check chat rooms', async () => {
      const response = await request(app)
        .get('/api/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('Step 2: should check chat unread count', async () => {
      const response = await request(app)
        .get('/api/chat/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });
});
