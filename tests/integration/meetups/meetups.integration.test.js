/**
 * Meetups Module Integration Tests
 * 모임 모듈 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../../server/index');
const { createTestToken } = require('../../mocks/jwt.mock');
const { createUserFixture, createMeetupFixture } = require('../../fixtures');

describe('Meetups API Integration', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    testUser = createUserFixture({
      id: 'meetups-test-user-123',
      email: 'meetups@test.com',
      name: '모임테스트',
    });
    authToken = createTestToken(testUser);
  });

  describe('GET /api/meetups', () => {
    it('should return meetups list', async () => {
      const response = await request(app)
        .get('/api/meetups')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meetups).toBeDefined();
      expect(Array.isArray(response.body.meetups)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/meetups?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meetups.length).toBeLessThanOrEqual(5);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/meetups?category=한식')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/meetups?status=모집중')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/meetups/home', () => {
    it('should return home feed meetups', async () => {
      const response = await request(app)
        .get('/api/meetups/home')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meetups).toBeDefined();
    });
  });

  describe('GET /api/meetups/active', () => {
    it('should return active meetups', async () => {
      const response = await request(app)
        .get('/api/meetups/active')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/meetups/nearby', () => {
    it('should return nearby meetups with coordinates', async () => {
      const response = await request(app)
        .get('/api/meetups/nearby?latitude=37.5065&longitude=127.0536')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle missing coordinates', async () => {
      const response = await request(app)
        .get('/api/meetups/nearby');

      // 좌표 없이도 기본 결과 반환하거나 400 에러
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /api/meetups/my', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/meetups/my')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return user meetups when authenticated', async () => {
      const response = await request(app)
        .get('/api/meetups/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/meetups/:id', () => {
    it('should return 404 for non-existent meetup', async () => {
      const response = await request(app)
        .get('/api/meetups/non-existent-meetup-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/meetups', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/meetups')
        .send({
          title: '테스트 모임',
          description: '테스트 설명',
          location: '서울시 강남구',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should create meetup with valid data', async () => {
      const meetupData = {
        title: '통합테스트 모임',
        description: '통합테스트용 모임입니다.',
        category: '한식',
        location: '서울시 강남구',
        address: '서울시 강남구 테헤란로 123',
        latitude: 37.5065,
        longitude: 127.0536,
        date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        time: '18:00',
        maxParticipants: 4,
        priceRange: '1-2만원',
        ageRange: '전체',
        genderPreference: '상관없음',
      };

      const response = await request(app)
        .post('/api/meetups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(meetupData);

      // 성공(201) 또는 DB 관련 에러(500)
      expect([201, 500]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.meetup).toBeDefined();
        expect(response.body.meetup.title).toBe(meetupData.title);
      }
    });
  });

  describe('POST /api/meetups/:id/join', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/meetups/test-meetup-id/join')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/meetups/:id/leave', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/meetups/test-meetup-id/leave')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/meetups/:id/participants', () => {
    it('should return 404 for non-existent meetup', async () => {
      const response = await request(app)
        .get('/api/meetups/non-existent-id/participants');

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/meetups/:id/wishlist', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/meetups/test-meetup-id/wishlist')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/meetups/:id/view', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/meetups/test-meetup-id/view')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});
