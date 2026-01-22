/**
 * Meetups Controller Unit Tests
 * 모임 컨트롤러 단위 테스트
 */

// Mock 설정 (호이스팅)
const {
  createMockPool,
  mockQueryOnce,
  mockQueryError,
  resetMockQuery,
  setupTransactionMock,
} = require('../../mocks/database.mock');

const mockPool = createMockPool();

jest.mock('../../../server/config/database', () => mockPool);
jest.mock('../../../server/config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('jsonwebtoken');
jest.mock('../../../server/utils/helpers', () => ({
  processImageUrl: jest.fn((url, category) => url || `default-${category}.jpg`),
  calculateDistance: jest.fn(() => 500), // 기본 500m 반환
}));

const meetupsController = require('../../../server/modules/meetups/controller');
const jwt = require('jsonwebtoken');
const { calculateDistance } = require('../../../server/utils/helpers');
const { createMockResponse, createMockRequest } = require('../../helpers/response.helper');
const { createUserFixture, createMeetupFixture } = require('../../fixtures');

describe('MeetupsController', () => {
  let mockReq;
  let mockRes;
  let testUser;
  let testMeetup;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
    testUser = createUserFixture({
      id: 'user-uuid-1234',
      email: 'test@example.com',
      name: '테스트유저',
    });
    testMeetup = createMeetupFixture({
      id: 'meetup-uuid-1234',
      host_id: testUser.id,
      title: '테스트 모임',
      status: '모집중',
    });
  });

  describe('getMeetups', () => {
    it('should return meetup list', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testMeetup],
        rowCount: 1,
      });

      await meetupsController.getMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.meetups).toHaveLength(1);
    });

    it('should filter by category', async () => {
      mockReq = createMockRequest({
        query: { category: '한식', page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await meetupsController.getMeetups(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('category');
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        query: {},
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await meetupsController.getMeetups(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMeetupById', () => {
    it('should return meetup details', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [testMeetup], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // participants

      await meetupsController.getMeetupById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.meetup).toBeDefined();
    });

    it('should return 404 if meetup not found', async () => {
      mockReq = createMockRequest({
        params: { id: 'non-existent-id' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.getMeetupById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createMeetup', () => {
    it('should create new meetup', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {
          title: '새 모임',
          description: '테스트 설명',
          category: '한식',
          location: '서울',
          date: '2025-01-30',
          time: '18:00',
          maxParticipants: 4,
        },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [testMeetup], rowCount: 1 }) // insert meetup
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // add host as participant

      await meetupsController.createMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.meetup).toBeDefined();
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { title: '새 모임' },
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await meetupsController.createMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateMeetup', () => {
    it('should update meetup as host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: { title: '수정된 모임' },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...testMeetup, title: '수정된 모임' }], rowCount: 1 });

      await meetupsController.updateMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if meetup not found', async () => {
      mockReq = createMockRequest({
        params: { id: 'non-existent-id' },
        user: { userId: testUser.id },
        body: { title: '수정된 모임' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.updateMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if not host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'other-user-id' },
        body: { title: '수정된 모임' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 });

      await meetupsController.updateMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if no updates provided', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: {},
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 });

      await meetupsController.updateMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteMeetup', () => {
    it('should delete meetup as host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await meetupsController.deleteMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 403 if not host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'other-user-id' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 });

      await meetupsController.deleteMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('joinMeetup', () => {
    it('should join meetup successfully', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'participant-id' },
      });

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ ...testMeetup, current_participants: 1, max_participants: 4 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // not already joined
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // insert participant

      await meetupsController.joinMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if meetup not found', async () => {
      mockReq = createMockRequest({
        params: { id: 'non-existent-id' },
        user: { userId: 'participant-id' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.joinMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if meetup is full', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'participant-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...testMeetup, current_participants: 4, max_participants: 4 }],
        rowCount: 1,
      });

      await meetupsController.joinMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if already joined', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'participant-id' },
      });

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ ...testMeetup, current_participants: 1, max_participants: 4 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 }); // already joined

      await meetupsController.joinMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if meetup not recruiting', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'participant-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...testMeetup, status: '모집완료' }],
        rowCount: 1,
      });

      await meetupsController.joinMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('leaveMeetup', () => {
    it('should leave meetup successfully', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'participant-id' },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'participation-id' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await meetupsController.leaveMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if not participating', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'participant-id' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.leaveMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getParticipants', () => {
    it('should return participants list', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
      });

      const participants = [
        { user_id: testUser.id, name: '참가자1', status: '참가승인' },
        { user_id: 'user2', name: '참가자2', status: '참가대기' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: participants, rowCount: 2 });

      await meetupsController.getParticipants(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.participants).toHaveLength(2);
    });
  });

  describe('updateParticipantStatus', () => {
    it('should approve participant as host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id, participantId: 'participant-id' },
        user: { userId: testUser.id },
        body: { status: '참가승인' },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ status: '참가승인' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update participants count

      await meetupsController.updateParticipantStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 403 if not host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id, participantId: 'participant-id' },
        user: { userId: 'other-user-id' },
        body: { status: '참가승인' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 });

      await meetupsController.updateParticipantStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getNearbyMeetups', () => {
    it('should return nearby meetups', async () => {
      mockReq = createMockRequest({
        query: {
          latitude: '37.5665',
          longitude: '126.9780',
          radius: '3000',
        },
      });

      const nearbyMeetup = {
        ...testMeetup,
        latitude: '37.5665',
        longitude: '126.9780',
        'host.id': testUser.id,
        'host.name': testUser.name,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [nearbyMeetup], rowCount: 1 });
      calculateDistance.mockReturnValue(500); // within radius

      await meetupsController.getNearbyMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 without coordinates', async () => {
      mockReq = createMockRequest({
        query: {},
      });

      await meetupsController.getNearbyMeetups(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should filter by category', async () => {
      mockReq = createMockRequest({
        query: {
          latitude: '37.5665',
          longitude: '126.9780',
          category: '한식',
        },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.getNearbyMeetups(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('category');
    });
  });

  describe('getHomeMeetups', () => {
    it('should return home meetups without location filter', async () => {
      mockReq = createMockRequest({
        query: {},
        headers: {},
      });

      mockPool.query.mockResolvedValueOnce({ rows: [testMeetup], rowCount: 1 });

      await meetupsController.getHomeMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.meta.hasLocationFilter).toBeFalsy();
    });

    it('should return home meetups with location filter', async () => {
      mockReq = createMockRequest({
        query: {
          latitude: '37.5665',
          longitude: '126.9780',
          radius: '3000',
        },
        headers: {},
      });

      const meetupWithCoords = {
        ...testMeetup,
        latitude: '37.5665',
        longitude: '126.9780',
        hours_until_start: 24,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [meetupWithCoords], rowCount: 1 });
      calculateDistance.mockReturnValue(500);

      await meetupsController.getHomeMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.meta.hasLocationFilter).toBeTruthy();
    });

    it('should filter blocked users when authenticated', async () => {
      mockReq = createMockRequest({
        query: {},
        headers: { authorization: 'Bearer valid-token' },
      });

      jwt.verify.mockReturnValue({ userId: testUser.id });
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.getHomeMeetups(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('user_blocked_users');
    });
  });

  describe('getActiveMeetups', () => {
    it('should return active meetups with pagination', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 10 },
        headers: {},
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [testMeetup], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 });

      await meetupsController.getActiveMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.pagination).toBeDefined();
    });
  });

  describe('getMyMeetups', () => {
    it('should return hosted meetups', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { type: 'hosted', page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [testMeetup], rowCount: 1 });

      await meetupsController.getMyMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return joined meetups', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { type: 'joined', page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.getMyMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('updateMeetupStatus', () => {
    it('should update status as host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: { status: '모집완료' },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ host_id: testUser.id }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...testMeetup, status: '모집완료' }], rowCount: 1 });

      await meetupsController.updateMeetupStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('checkWishlist', () => {
    it('should return wishlisted true', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'wishlist-id' }], rowCount: 1 });

      await meetupsController.checkWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.isWishlisted).toBe(true);
    });

    it('should return wishlisted false', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.checkWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.isWishlisted).toBe(false);
    });
  });

  describe('addWishlist', () => {
    it('should add to wishlist', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // not existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // insert

      await meetupsController.addWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.isWishlisted).toBe(true);
    });

    it('should return success if already wishlisted', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 });

      await meetupsController.addWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('removeWishlist', () => {
    it('should remove from wishlist', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await meetupsController.removeWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.isWishlisted).toBe(false);
    });
  });

  describe('addView', () => {
    it('should add view record', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: testMeetup.id }], rowCount: 1 }) // meetup exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // insert view

      await meetupsController.addView(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if meetup not found', async () => {
      mockReq = createMockRequest({
        params: { id: 'non-existent-id' },
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await meetupsController.addView(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('confirmMeetup', () => {
    it('should confirm meetup as host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: { action: 'confirm' },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [testMeetup], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await meetupsController.confirmMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should cancel meetup with refund', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: { action: 'cancel' },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [testMeetup], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no deposits

      await meetupsController.confirmMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 for invalid action', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: { action: 'invalid' },
      });

      await meetupsController.confirmMeetup(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('gpsCheckin', () => {
    it('should check in with valid location', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: { latitude: 37.5665, longitude: 126.9780 },
      });

      const meetupWithCoords = {
        ...testMeetup,
        latitude: 37.5665,
        longitude: 126.9780,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [meetupWithCoords], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'participant' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no existing attendance
        .mockResolvedValueOnce({ rows: [{ id: 'attendance-id' }], rowCount: 1 }) // insert
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update participant

      calculateDistance.mockReturnValue(50); // within 100m

      await meetupsController.gpsCheckin(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if too far', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: { latitude: 37.5665, longitude: 126.9780 },
      });

      const meetupWithCoords = {
        ...testMeetup,
        latitude: 37.5,
        longitude: 126.9,
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [meetupWithCoords], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ id: 'participant' }], rowCount: 1 });

      calculateDistance.mockReturnValue(200); // too far (> 100m)

      await meetupsController.gpsCheckin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 without coordinates', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
        body: {},
      });

      await meetupsController.gpsCheckin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCompletedMeetups', () => {
    it('should return completed meetups', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 10 },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 });

      await meetupsController.getCompletedMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.pagination).toBeDefined();
    });
  });

  describe('getReviews', () => {
    it('should return meetup reviews', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        query: { page: 1, limit: 10 },
      });

      const reviews = [
        { id: 'review-1', rating: 5, comment: '좋아요', tags: '[]' },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: reviews, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ avg_rating: '4.5', review_count: '1' }], rowCount: 1 });

      await meetupsController.getReviews(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code as host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testMeetup.id, host_id: testUser.id, title: '테스트 모임' }],
        rowCount: 1,
      });

      await meetupsController.generateQRCode(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.qrCodeData).toBeDefined();
    });

    it('should return 403 if not host', async () => {
      mockReq = createMockRequest({
        params: { id: testMeetup.id },
        user: { userId: 'other-user' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testMeetup.id, host_id: testUser.id }],
        rowCount: 1,
      });

      await meetupsController.generateQRCode(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
