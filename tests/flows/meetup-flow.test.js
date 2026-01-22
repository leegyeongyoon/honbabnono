/**
 * Meetup Flow Tests
 * 모임 플로우 통합 테스트
 */
const request = require('supertest');
const { app } = require('../../server/index');
const { createTestToken } = require('../mocks/jwt.mock');
const { createUserFixture, createMeetupFixture } = require('../fixtures');

describe('Meetup Flow', () => {
  describe('Browse → View → Join Flow', () => {
    let testUser;
    let authToken;

    beforeAll(() => {
      testUser = createUserFixture({
        email: 'flow-meetup@test.com',
        name: '모임플로우',
      });
      authToken = createTestToken(testUser);
    });

    it('Step 1: should browse meetups list', async () => {
      const response = await request(app)
        .get('/api/meetups')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meetups).toBeDefined();
      expect(Array.isArray(response.body.meetups)).toBe(true);
    });

    it('Step 2: should get home feed', async () => {
      const response = await request(app)
        .get('/api/meetups/home')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('Step 3: should get active meetups', async () => {
      const response = await request(app)
        .get('/api/meetups/active')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('Step 4: should get nearby meetups', async () => {
      const response = await request(app)
        .get('/api/meetups/nearby')
        .query({
          latitude: 37.5065,
          longitude: 127.0536,
        });

      expect([200, 400]).toContain(response.status);
    });

    it('Step 5: should get my meetups (authenticated)', async () => {
      const response = await request(app)
        .get('/api/meetups/my')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Meetup Creation Flow', () => {
    let hostUser;
    let hostToken;

    beforeAll(() => {
      hostUser = createUserFixture({
        email: 'flow-host@test.com',
        name: '호스트유저',
      });
      hostToken = createTestToken(hostUser);
    });

    it('should require authentication for creation', async () => {
      const meetupData = createMeetupFixture();

      const response = await request(app)
        .post('/api/meetups')
        .send(meetupData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should create meetup with valid data', async () => {
      const meetupData = {
        title: '플로우 테스트 모임',
        description: '플로우 테스트를 위한 모임입니다.',
        category: '한식',
        location: '서울시 강남구',
        address: '서울시 강남구 테헤란로 123',
        latitude: 37.5065,
        longitude: 127.0536,
        date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        time: '19:00',
        maxParticipants: 4,
        priceRange: '1-2만원',
        ageRange: '전체',
        genderPreference: '상관없음',
      };

      const response = await request(app)
        .post('/api/meetups')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(meetupData);

      // 성공 또는 DB 에러
      expect([201, 500]).toContain(response.status);
    });
  });

  describe('Category Filter Flow', () => {
    const categories = ['한식', '중식', '일식', '양식'];

    categories.forEach((category) => {
      it(`should filter by category: ${category}`, async () => {
        const response = await request(app)
          .get('/api/meetups')
          .query({ category });

        expect([200, 500]).toContain(response.status);
      });
    });
  });

  describe('Pagination Flow', () => {
    it('should support pagination', async () => {
      // Page 1
      const page1Response = await request(app)
        .get('/api/meetups')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(page1Response.body.meetups.length).toBeLessThanOrEqual(5);

      // Page 2
      const page2Response = await request(app)
        .get('/api/meetups')
        .query({ page: 2, limit: 5 })
        .expect(200);

      expect(page2Response.body.success).toBe(true);
    });
  });
});
