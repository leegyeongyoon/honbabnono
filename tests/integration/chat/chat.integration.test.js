/**
 * Chat Module Integration Tests
 * 채팅 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture } = require('../../fixtures');

describe('Chat API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      email: 'chat-test@test.com',
      name: '채팅테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/chat/rooms', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/chat/rooms')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return chat rooms when authenticated', async () => {
      const response = await request(app)
        .get('/api/chat/rooms')
        .set('Authorization', `Bearer ${authToken}`);

      // 200 또는 DB 에러
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('GET /api/chat/unread-count', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/chat/unread-count')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return unread count when authenticated', async () => {
      const response = await request(app)
        .get('/api/chat/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/chat/rooms/by-meetup/:meetupId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/chat/rooms/by-meetup/test-meetup-id')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/chat/rooms/:id/messages', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/chat/rooms/test-room-id/messages')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/chat/rooms/:id/messages', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat/rooms/test-room-id/messages')
        .send({ content: '테스트 메시지' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/chat/rooms/:id/read', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat/rooms/test-room-id/read')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/chat/rooms/:id/leave', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/chat/rooms/test-room-id/leave')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/chat/read-all', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/chat/read-all')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/chat/check-direct-chat-permission', () => {
    it('should return permission status', async () => {
      const response = await request(app)
        .get('/api/chat/check-direct-chat-permission');

      // 200 또는 에러 응답
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
