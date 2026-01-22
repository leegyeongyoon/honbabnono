/**
 * Meetups List Controller Unit Tests
 */

const {
  createMockPool,
  mockQueryOnce,
  mockQueryError,
  resetMockQuery,
} = require('../../mocks/database.mock');

const {
  createMockResponse,
  createMockRequest,
  createAuthenticatedRequest,
} = require('../../helpers/response.helper');

const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

// Mock helpers
jest.mock('../../../server/modules/meetups/helpers/auth.helper', () => ({
  extractUserId: jest.fn((req) => req.user?.userId || null),
}));

jest.mock('../../../server/modules/meetups/helpers/query.helper', () => ({
  buildPagination: jest.fn((page, limit) => ({
    offset: (parseInt(page) - 1) * parseInt(limit),
    limit: parseInt(limit),
  })),
  transformMeetupData: jest.fn((row, options) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    isRecruiting: row.status === '모집중',
    distance: options?.includeDistance ? 100 : null,
  })),
  applyLocationFilter: jest.fn((meetups) => meetups.slice(0, 20)),
  buildBlockedUserFilter: jest.fn(),
  MEETUP_WITH_TIME_SELECT: 'SELECT m.*',
}));

const listController = require('../../../server/modules/meetups/controllers/list.controller');

describe('Meetups List Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // getHomeMeetups
  describe('getHomeMeetups', () => {
    it('should return home meetups without location filter', async () => {
      req = createMockRequest({ query: {} });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Test Meetup', status: '모집중' }],
        rowCount: 1,
      });
      await listController.getHomeMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        meetups: expect.any(Array),
      }));
    });

    it('should return home meetups with location filter', async () => {
      req = createMockRequest({ query: { latitude: '37.5', longitude: '127.0', radius: '5000' } });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Nearby Meetup', status: '모집중', latitude: 37.5, longitude: 127.0 }],
        rowCount: 1,
      });
      await listController.getHomeMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        meta: expect.objectContaining({ searchRadius: 5000 }),
      }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await listController.getHomeMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getActiveMeetups
  describe('getActiveMeetups', () => {
    it('should return active meetups with pagination', async () => {
      req = createMockRequest({ query: { page: 1, limit: 10 } });
      mockQueryOnce(mockPool, { rows: [{ total: '5' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Active Meetup' }], rowCount: 1 });
      await listController.getActiveMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        pagination: expect.any(Object),
      }));
    });

    it('should filter by category', async () => {
      req = createMockRequest({ query: { category: '한식' } });
      mockQueryOnce(mockPool, { rows: [{ total: '2' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await listController.getActiveMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await listController.getActiveMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getCompletedMeetups
  describe('getCompletedMeetups', () => {
    it('should return completed meetups', async () => {
      req = createMockRequest({ query: { page: 1, limit: 10 } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Completed', status: '완료' }], rowCount: 1 });
      await listController.getCompletedMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await listController.getCompletedMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getNearbyMeetups
  describe('getNearbyMeetups', () => {
    it('should return 400 if location is missing', async () => {
      req = createMockRequest({ query: {} });
      await listController.getNearbyMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return nearby meetups', async () => {
      req = createMockRequest({
        query: { latitude: '37.5', longitude: '127.0', radius: '3000' },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Nearby', latitude: 37.5, longitude: 127.0 }],
        rowCount: 1,
      });
      await listController.getNearbyMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: { latitude: '37.5', longitude: '127.0' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await listController.getNearbyMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getMyMeetups
  describe('getMyMeetups', () => {
    it('should return all my meetups', async () => {
      req = createAuthenticatedRequest(mockUser, { query: { type: 'all' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'My Meetup' }], rowCount: 1 });
      await listController.getMyMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return hosting meetups', async () => {
      req = createAuthenticatedRequest(mockUser, { query: { type: 'hosting' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Hosting' }], rowCount: 1 });
      await listController.getMyMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return participating meetups', async () => {
      req = createAuthenticatedRequest(mockUser, { query: { type: 'participating' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Participating' }], rowCount: 1 });
      await listController.getMyMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await listController.getMyMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getMeetups
  describe('getMeetups', () => {
    it('should return meetups list', async () => {
      req = createMockRequest({ query: { page: 1, limit: 10 } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Meetup' }], rowCount: 1 });
      await listController.getMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter by status', async () => {
      req = createMockRequest({ query: { status: '모집중' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await listController.getMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await listController.getMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
