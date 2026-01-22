/**
 * Meetups CRUD Controller Unit Tests
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

// Mock validation helper
jest.mock('../../../server/modules/meetups/helpers/validation.helper', () => ({
  validateHostPermission: jest.fn(),
  validateMeetupExists: jest.fn(),
}));

const { validateHostPermission } = require('../../../server/modules/meetups/helpers/validation.helper');
const crudController = require('../../../server/modules/meetups/controllers/crud.controller');

describe('Meetups CRUD Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // getMeetupById
  describe('getMeetupById', () => {
    it('should return meetup detail', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Test Meetup', host_id: 1 }],
        rowCount: 1,
      });
      mockQueryOnce(mockPool, {
        rows: [{ user_id: 1, name: 'Participant' }],
        rowCount: 1,
      });
      await crudController.getMeetupById(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if meetup not found', async () => {
      req = createMockRequest({ params: { id: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await crudController.getMeetupById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await crudController.getMeetupById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // createMeetup
  describe('createMeetup', () => {
    it('should create meetup successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          title: 'New Meetup',
          description: 'Test description',
          category: '한식',
          location: '강남역',
          date: '2025-02-01',
          time: '18:00',
        },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'New Meetup' }],
        rowCount: 1,
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // participant insert
      await crudController.createMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { title: 'Test' },
      });
      mockQueryError(mockPool, new Error('DB Error'));
      await crudController.createMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // updateMeetup
  describe('updateMeetup', () => {
    it('should update meetup successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { title: 'Updated Title' },
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Updated Title' }],
        rowCount: 1,
      });
      await crudController.updateMeetup(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not host', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { title: 'Updated' },
      });
      validateHostPermission.mockResolvedValueOnce({ error: '모임을 찾을 수 없습니다' });
      await crudController.updateMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if not authorized', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { title: 'Updated' },
      });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await crudController.updateMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if no updates', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: {},
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      await crudController.updateMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { title: 'Test' },
      });
      validateHostPermission.mockRejectedValueOnce(new Error('DB Error'));
      await crudController.updateMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // deleteMeetup
  describe('deleteMeetup', () => {
    it('should delete meetup successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await crudController.deleteMeetup(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not authorized', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await crudController.deleteMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockRejectedValueOnce(new Error('DB Error'));
      await crudController.deleteMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // updateMeetupStatus
  describe('updateMeetupStatus', () => {
    it('should update status successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { status: '모집완료' },
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, status: '모집완료' }],
        rowCount: 1,
      });
      await crudController.updateMeetupStatus(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 if invalid status', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { status: '잘못된상태' },
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      await crudController.updateMeetupStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { status: '완료' },
      });
      validateHostPermission.mockRejectedValueOnce(new Error('DB Error'));
      await crudController.updateMeetupStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
