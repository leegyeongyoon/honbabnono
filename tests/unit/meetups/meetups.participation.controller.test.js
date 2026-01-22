/**
 * Meetups Participation Controller Unit Tests
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
  validateMeetupExists: jest.fn(),
  validateHostPermission: jest.fn(),
  validateMeetupStatus: jest.fn(),
}));

const { validateMeetupExists, validateHostPermission } = require('../../../server/modules/meetups/helpers/validation.helper');
const participationController = require('../../../server/modules/meetups/controllers/participation.controller');

describe('Meetups Participation Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // joinMeetup
  describe('joinMeetup', () => {
    it('should join meetup successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({
        meetup: { id: 1, status: '모집중', current_participants: 2, max_participants: 4 },
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // no existing
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // insert
      await participationController.joinMeetup(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' } });
      validateMeetupExists.mockResolvedValueOnce({ error: '모임을 찾을 수 없습니다' });
      await participationController.joinMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if not recruiting', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({
        meetup: { id: 1, status: '완료', current_participants: 2, max_participants: 4 },
      });
      await participationController.joinMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if full', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({
        meetup: { id: 1, status: '모집중', current_participants: 4, max_participants: 4 },
      });
      await participationController.joinMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if already joined', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({
        meetup: { id: 1, status: '모집중', current_participants: 2, max_participants: 4 },
      });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // already exists
      await participationController.joinMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockRejectedValueOnce(new Error('DB Error'));
      await participationController.joinMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // leaveMeetup
  describe('leaveMeetup', () => {
    it('should leave meetup successfully (participant)', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({
        meetup: { id: 1, host_id: 999 }, // not host
      });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // delete
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // update count
      await participationController.leaveMeetup(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should cancel meetup if host leaves', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({
        meetup: { id: 1, host_id: 1 }, // is host
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // update status
      await participationController.leaveMeetup(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        isHostCancellation: true,
      }));
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' } });
      validateMeetupExists.mockResolvedValueOnce({ error: '모임을 찾을 수 없습니다' });
      await participationController.leaveMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 if not participating', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({
        meetup: { id: 1, host_id: 999 },
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // no record
      await participationController.leaveMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockRejectedValueOnce(new Error('DB Error'));
      await participationController.leaveMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getParticipants
  describe('getParticipants', () => {
    it('should return participants list', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, name: 'User1', profile_image: null, rating: 4.5 }],
        rowCount: 1,
      });
      await participationController.getParticipants(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        participants: expect.any(Array),
      }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await participationController.getParticipants(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // updateParticipantStatus
  describe('updateParticipantStatus', () => {
    it('should update participant status successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
        body: { status: '참가승인' },
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      mockQueryOnce(mockPool, { rows: [{ user_id: 2, status: '참가승인' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // update count
      await participationController.updateParticipantStatus(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not host', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
        body: { status: '참가승인' },
      });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await participationController.updateParticipantStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if invalid status', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
        body: { status: '잘못된상태' },
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      await participationController.updateParticipantStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if participant not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '999' },
        body: { status: '참가승인' },
      });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await participationController.updateParticipantStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1', participantId: '2' },
        body: { status: '참가승인' },
      });
      validateHostPermission.mockRejectedValueOnce(new Error('DB Error'));
      await participationController.updateParticipantStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
