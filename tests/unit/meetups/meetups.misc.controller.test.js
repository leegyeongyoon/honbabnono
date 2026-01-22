/**
 * Meetups Misc Controller Unit Tests
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
}));

const { validateMeetupExists, validateHostPermission } = require('../../../server/modules/meetups/helpers/validation.helper');
const miscController = require('../../../server/modules/meetups/controllers/misc.controller');

describe('Meetups Misc Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // addView
  describe('addView', () => {
    it('should add view successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({});
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await miscController.addView(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' } });
      validateMeetupExists.mockResolvedValueOnce({ error: '모임을 찾을 수 없습니다' });
      await miscController.addView(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockRejectedValueOnce(new Error('Error'));
      await miscController.addView(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // checkWishlist
  describe('checkWishlist', () => {
    it('should return wishlisted true', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });
      await miscController.checkWishlist(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { isWishlisted: true },
      }));
    });

    it('should return wishlisted false', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await miscController.checkWishlist(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { isWishlisted: false },
      }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await miscController.checkWishlist(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // addWishlist
  describe('addWishlist', () => {
    it('should add to wishlist successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({});
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // not exists
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // insert
      await miscController.addWishlist(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' } });
      validateMeetupExists.mockResolvedValueOnce({ error: '모임을 찾을 수 없습니다' });
      await miscController.addWishlist(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if already wishlisted', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockResolvedValueOnce({});
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // exists
      await miscController.addWishlist(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateMeetupExists.mockRejectedValueOnce(new Error('Error'));
      await miscController.addWishlist(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // removeWishlist
  describe('removeWishlist', () => {
    it('should remove from wishlist successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await miscController.removeWishlist(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await miscController.removeWishlist(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // confirmMeetup
  describe('confirmMeetup', () => {
    it('should confirm meetup successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({
        meetup: { status: '모집중' },
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await miscController.confirmMeetup(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not host', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await miscController.confirmMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if invalid status', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({
        meetup: { status: '완료' },
      });
      await miscController.confirmMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockRejectedValueOnce(new Error('Error'));
      await miscController.confirmMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // applyNoShowPenalties
  describe('applyNoShowPenalties', () => {
    it('should apply penalties successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });

      // Setup transaction mock
      const mockClient = mockPool._mockClient;
      let queryCount = 0;
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        queryCount++;
        if (queryCount === 1) {
          // no shows
          return Promise.resolve({
            rows: [{ user_id: 2, name: 'NoShow', bab_al_score: 50 }],
            rowCount: 1,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 1 });
      });

      await miscController.applyNoShowPenalties(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not host', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await miscController.applyNoShowPenalties(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockRejectedValueOnce(new Error('Error'));
      await miscController.applyNoShowPenalties(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // progressCheck
  describe('progressCheck', () => {
    it('should return progress info', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, status: '진행중', attended: true, has_reviewed: false }],
        rowCount: 1,
      });
      await miscController.progressCheck(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await miscController.progressCheck(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await miscController.progressCheck(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // progressResponse
  describe('progressResponse', () => {
    it('should record response successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { response: '참석' },
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await miscController.progressResponse(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { response: '참석' },
      });
      mockQueryError(mockPool, new Error('DB Error'));
      await miscController.progressResponse(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getConfirmableParticipants
  describe('getConfirmableParticipants', () => {
    it('should return confirmable participants', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ isHost: true });
      mockQueryOnce(mockPool, {
        rows: [{ id: 2, name: 'Waiting', status: '참가대기' }],
        rowCount: 1,
      });
      await miscController.getConfirmableParticipants(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 403 if not host', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockResolvedValueOnce({ error: '권한이 없습니다' });
      await miscController.getConfirmableParticipants(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      validateHostPermission.mockRejectedValueOnce(new Error('Error'));
      await miscController.getConfirmableParticipants(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
