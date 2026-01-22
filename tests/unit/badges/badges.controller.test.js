/**
 * Badges Controller Unit Tests
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

const badgesController = require('../../../server/modules/badges/controller');

describe('Badges Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // getAllBadges
  describe('getAllBadges', () => {
    it('should return all badges', async () => {
      req = createMockRequest();
      mockQueryOnce(mockPool, { rows: [{ id: 1, name: 'Beginner' }], rowCount: 1 });
      await badgesController.getAllBadges(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest();
      mockQueryError(mockPool, new Error('DB Error'));
      await badgesController.getAllBadges(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getAvailableBadges
  describe('getAvailableBadges', () => {
    it('should return available badges', async () => {
      req = createMockRequest();
      mockQueryOnce(mockPool, { rows: [{ id: 1, name: 'Beginner', is_active: true }], rowCount: 1 });
      await badgesController.getAvailableBadges(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest();
      mockQueryError(mockPool, new Error('DB Error'));
      await badgesController.getAvailableBadges(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getBadgeProgress
  describe('getBadgeProgress', () => {
    it('should return badge progress', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [{ count: '5' }], rowCount: 1 }); // meetup count
      mockQueryOnce(mockPool, { rows: [{ count: '3' }], rowCount: 1 }); // review count
      mockQueryOnce(mockPool, { rows: [{ id: 1, category: 'meetup_count', required_count: 10, earned: false }], rowCount: 1 });
      await badgesController.getBadgeProgress(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await badgesController.getBadgeProgress(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getMyBadges
  describe('getMyBadges', () => {
    it('should return my badges', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [{ id: 1, name: 'Beginner', earned_at: new Date() }], rowCount: 1 });
      await badgesController.getMyBadges(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await badgesController.getMyBadges(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // earnBadge
  describe('earnBadge', () => {
    it('should earn badge successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { badgeId: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // Not already earned
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // Insert
      mockQueryOnce(mockPool, { rows: [{ id: 1, name: 'Beginner' }], rowCount: 1 }); // Badge info
      await badgesController.earnBadge(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 if already earned', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { badgeId: '1' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // Already earned
      await badgesController.earnBadge(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { badgeId: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await badgesController.earnBadge(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // setFeaturedBadge
  describe('setFeaturedBadge', () => {
    it('should set featured badge', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { badgeId: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // Clear existing
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // Set new
      await badgesController.setFeaturedBadge(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if badge not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { badgeId: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // Clear existing
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // Badge not found
      await badgesController.setFeaturedBadge(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { badgeId: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await badgesController.setFeaturedBadge(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
