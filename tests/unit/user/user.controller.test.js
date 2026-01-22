/**
 * User Controller Unit Tests
 * 사용자 컨트롤러 단위 테스트
 */

// Mock modules before imports
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

jest.mock('../../../server/utils/helpers', () => ({
  processImageUrl: jest.fn((url, category) => url || `default-${category}.jpg`),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const userController = require('../../../server/modules/user/controller');
const { createMockRequest, createMockResponse } = require('../../helpers/response.helper');
const bcrypt = require('bcryptjs');

describe('UserController', () => {
  let mockReq;
  let mockRes;

  const testUser = {
    id: 'user-uuid-1234',
    email: 'test@example.com',
    name: 'Test User',
    profile_image: 'http://example.com/profile.jpg',
    provider: 'email',
    is_verified: true,
    created_at: new Date(),
    rating: 4.5,
    phone: '010-1234-5678',
    gender: 'male',
    babal_score: 75.5,
    password: '$2a$10$hashedpassword',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
  });

  describe('getMe', () => {
    it('should return user info successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });

      await userController.getMe(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user.id).toBe(testUser.id);
      expect(response.user.email).toBe(testUser.email);
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        user: { userId: 'nonexistent-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.getMe(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await userController.getMe(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      // Points query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ available_points: 1000 }],
        rowCount: 1,
      });
      // Total meetups query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_meetups: '5' }],
        rowCount: 1,
      });
      // Hosted meetups query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ hosted_meetups: '2' }],
        rowCount: 1,
      });
      // Reviews query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ review_count: '3' }],
        rowCount: 1,
      });

      await userController.getStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.stats).toBeDefined();
      expect(response.stats.availablePoints).toBe(1000);
      expect(response.stats.totalMeetups).toBe(5);
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await userController.getStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMyReviews', () => {
    it('should return user reviews with pagination', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 10 },
      });

      const mockReviews = [
        { id: 'review-1', rating: 5, content: 'Great!' },
        { id: 'review-2', rating: 4, content: 'Good!' },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockReviews,
        rowCount: 2,
      });

      await userController.getMyReviews(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.reviews).toHaveLength(2);
      expect(response.pagination).toBeDefined();
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: {},
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await userController.getMyReviews(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getActivities', () => {
    it('should return activities with status filter', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 10, status: '참가승인' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'Test Meetup' }],
        rowCount: 1,
      });

      await userController.getActivities(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.activities).toBeDefined();
    });

    it('should return all activities when status is all', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { status: 'all' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1' }],
        rowCount: 1,
      });

      await userController.getActivities(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).not.toContain('mp.status = $4');
    });
  });

  describe('getHostedMeetups', () => {
    it('should return hosted meetups', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'My Meetup' }],
        rowCount: 1,
      });

      await userController.getHostedMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.meetups).toBeDefined();
    });
  });

  describe('getWishlist', () => {
    it('should return wishlist items', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'Wishlist Meetup' }],
        rowCount: 1,
      });

      await userController.getWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.wishlist).toBeDefined();
    });
  });

  describe('toggleWishlist', () => {
    it('should add to wishlist when not exists', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { meetupId: 'meetup-1' },
      });

      // Check existing
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      // Insert
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await userController.toggleWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.isWishlisted).toBe(true);
    });

    it('should remove from wishlist when exists', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { meetupId: 'meetup-1' },
      });

      // Check existing
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'wishlist-1' }],
        rowCount: 1,
      });
      // Delete
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await userController.toggleWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.isWishlisted).toBe(false);
    });
  });

  describe('getRiceIndex', () => {
    it('should return rice index with level info', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      // All parallel queries
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] }); // hosted
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // joined
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '8' }] }); // completed
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // reviews
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_rating: 4.5 }] }); // rating
      // babal_score query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ babal_score: 75.5 }],
        rowCount: 1,
      });

      await userController.getRiceIndex(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.riceIndex).toBeDefined();
      expect(response.level).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {
          name: 'Updated Name',
          phone: '010-9999-8888',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...testUser, name: 'Updated Name' }],
        rowCount: 1,
      });

      await userController.updateProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user.name).toBe('Updated Name');
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        user: { userId: 'nonexistent-id' },
        body: { name: 'Updated Name' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.updateProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getWishlists', () => {
    it('should return wishlists with pagination', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
      });

      await userController.getWishlists(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.pagination.totalCount).toBe(5);
    });
  });

  describe('getRecentViews', () => {
    it('should return recent views with pagination', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 20 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'Recent View' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      });

      await userController.getRecentViews(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });

  describe('deleteRecentView', () => {
    it('should delete recent view successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { viewId: 'view-1' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'view-1' }],
        rowCount: 1,
      });

      await userController.deleteRecentView(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if view not found', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { viewId: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.deleteRecentView(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteAllRecentViews', () => {
    it('should delete all recent views', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 5,
      });

      await userController.deleteAllRecentViews(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toContain('5');
    });
  });

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: 'target-user-id' },
        body: { reason: 'Spam' },
      });

      // Check user exists
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'target-user-id', name: 'Target User' }],
        rowCount: 1,
      });
      // Check not already blocked
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      // Insert block
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'block-1' }],
        rowCount: 1,
      });

      await userController.blockUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if blocking self', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: testUser.id },
      });

      await userController.blockUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if target user not found', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.blockUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if already blocked', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: 'target-user-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'target-user-id', name: 'Target' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'block-1' }],
        rowCount: 1,
      });

      await userController.blockUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('unblockUser', () => {
    it('should unblock user successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: 'target-user-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'Target User' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'block-1' }],
        rowCount: 1,
      });

      await userController.unblockUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if not blocked', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: 'target-user-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'Target User' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.unblockUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return blocked users list', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 20 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'blocked-1', name: 'Blocked User' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      });

      await userController.getBlockedUsers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });
  });

  describe('checkBlockedStatus', () => {
    it('should return blocked status true', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: 'target-user-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'block-1' }],
        rowCount: 1,
      });

      await userController.checkBlockedStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.isBlocked).toBe(true);
    });

    it('should return blocked status false', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        params: { userId: 'target-user-id' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.checkBlockedStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.isBlocked).toBe(false);
    });
  });

  describe('getPoints', () => {
    it('should return user points', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testUser.id, name: testUser.name, points: 5000 }],
        rowCount: 1,
      });

      await userController.getPoints(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.points).toBe(5000);
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        user: { userId: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.getPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getNotificationSettings', () => {
    it('should return notification settings', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          push_notifications: true,
          email_notifications: true,
          meetup_reminders: true,
          chat_notifications: true,
          marketing_notifications: false,
        }],
        rowCount: 1,
      });

      await userController.getNotificationSettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.push_notifications).toBe(true);
    });

    it('should create default settings if not exists', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await userController.getNotificationSettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.push_notifications).toBe(true);
    });
  });

  describe('getNotices', () => {
    it('should return notices list', async () => {
      mockReq = createMockRequest({});

      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Notice 1', content: 'Content 1' },
          { id: 2, title: 'Notice 2', content: 'Content 2' },
        ],
        rowCount: 2,
      });

      await userController.getNotices(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.notices).toHaveLength(2);
    });
  });

  describe('getNoticeDetail', () => {
    it('should return notice detail', async () => {
      mockReq = createMockRequest({
        params: { id: '1' },
      });

      // Update views
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });
      // Get notice
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Notice 1', content: 'Content 1' }],
        rowCount: 1,
      });

      await userController.getNoticeDetail(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.notice.title).toBe('Notice 1');
    });

    it('should return 404 if notice not found', async () => {
      mockReq = createMockRequest({
        params: { id: '999' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await userController.getNoticeDetail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getFaq', () => {
    it('should return FAQ list', async () => {
      mockReq = createMockRequest({});

      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, question: 'Q1', answer: 'A1' },
          { id: 2, question: 'Q2', answer: 'A2' },
        ],
        rowCount: 2,
      });

      await userController.getFaq(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: testUser.id, email: testUser.email, name: testUser.name }],
        rowCount: 1,
      });

      await userController.deleteAccount(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        user: { userId: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.deleteAccount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {
          currentPassword: 'oldPassword',
          newPassword: 'newPassword123',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ password: testUser.password, provider: 'email' }],
        rowCount: 1,
      });
      bcrypt.compare.mockResolvedValueOnce(true);
      bcrypt.hash.mockResolvedValueOnce('$2a$10$newhashedpassword');
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await userController.changePassword(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if missing fields', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { currentPassword: 'oldPassword' },
      });

      await userController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if new password too short', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {
          currentPassword: 'oldPassword',
          newPassword: '12345',
        },
      });

      await userController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for social login user', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {
          currentPassword: 'oldPassword',
          newPassword: 'newPassword123',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ password: null, provider: 'kakao' }],
        rowCount: 1,
      });

      await userController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if current password is wrong', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ password: testUser.password, provider: 'email' }],
        rowCount: 1,
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      await userController.changePassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getProfile', () => {
    it('should return profile', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });

      await userController.getProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user.id).toBe(testUser.id);
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        user: { userId: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.getProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getUserPoints', () => {
    it('should return user points detail', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: testUser.id,
          name: testUser.name,
          email: testUser.email,
          total_points: 10000,
          available_points: 5000,
          used_points: 3000,
          expired_points: 2000,
        }],
        rowCount: 1,
      });

      await userController.getUserPoints(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.availablePoints).toBe(5000);
    });
  });

  describe('getJoinedMeetups', () => {
    it('should return joined meetups', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        query: { page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'Joined Meetup' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '5' }],
        rowCount: 1,
      });

      await userController.getJoinedMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });

  describe('getUserBadges', () => {
    it('should return user badges', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'badge-1', name: 'First Meeting' },
          { id: 'badge-2', name: 'Reviewer' },
        ],
        rowCount: 2,
      });

      await userController.getUserBadges(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
    });
  });

  describe('getActivityStats', () => {
    it('should return activity statistics', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await userController.getActivityStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.meetupsHosted).toBe(3);
      expect(response.data.meetupsJoined).toBe(10);
    });
  });

  describe('getReviewableMeetups', () => {
    it('should return reviewable meetups', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'Completed Meetup' }],
        rowCount: 1,
      });

      await userController.getReviewableMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });

  describe('getPrivacySettings', () => {
    it('should return privacy settings', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          show_profile: true,
          show_activities: true,
          allow_messages: false,
        }],
        rowCount: 1,
      });

      await userController.getPrivacySettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.showProfile).toBe(true);
    });

    it('should return default settings if not exists', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.getPrivacySettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.showProfile).toBe(true);
      expect(response.data.allowMessages).toBe(true);
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update privacy settings', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {
          showProfile: false,
          showActivities: true,
          allowMessages: false,
        },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await userController.updatePrivacySettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('exportData', () => {
    it('should export user data', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [testUser] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'meetup-1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'participation-1' }] });

      await userController.exportData(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.user).toBeDefined();
      expect(response.data.hostedMeetups).toBeDefined();
    });
  });

  describe('getDeposits', () => {
    it('should return user deposits', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'deposit-1', amount: 3000, status: 'pending' }],
        rowCount: 1,
      });

      await userController.getDeposits(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });
  });

  describe('usePoints', () => {
    it('should use points successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 1000, purpose: 'Meetup payment' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await userController.usePoints(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if missing amount', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { purpose: 'Meetup payment' },
      });

      await userController.usePoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if invalid amount', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: -100, purpose: 'Test' },
      });

      await userController.usePoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('refundPoints', () => {
    it('should refund points successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 1000, reason: 'Meetup cancelled' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await userController.refundPoints(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if missing fields', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 1000 },
      });

      await userController.refundPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getInviteCode', () => {
    it('should return existing invite code', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ invite_code: 'ABC12345', created_at: new Date() }],
        rowCount: 1,
      });

      await userController.getInviteCode(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.invite_code).toBe('ABC12345');
    });

    it('should create new invite code if not exists', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ invite_code: 'NEW12345', created_at: new Date() }],
        rowCount: 1,
      });

      await userController.getInviteCode(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('useInviteCode', () => {
    it('should use invite code successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { inviteCode: 'ABC12345' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'inviter-id' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await userController.useInviteCode(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if missing invite code', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: {},
      });

      await userController.useInviteCode(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if invalid invite code', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { inviteCode: 'INVALID' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await userController.useInviteCode(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if using own invite code', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { inviteCode: 'ABC12345' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: testUser.id }],
        rowCount: 1,
      });

      await userController.useInviteCode(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if already used invite code', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { inviteCode: 'ABC12345' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'inviter-id' }],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'usage-1' }],
        rowCount: 1,
      });

      await userController.useInviteCode(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ============================================
  // chargePoints - 포인트 충전 (트랜잭션)
  // ============================================
  describe('chargePoints', () => {
    it('should charge points successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 1000, paymentMethod: 'card' },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ available_points: 5000 }], rowCount: 1 }, // SELECT current points
        { rows: [], rowCount: 1 }, // UPDATE users
        { rows: [{ id: 'tx-123' }], rowCount: 1 }, // INSERT transaction
      ]);

      await userController.chargePoints(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('포인트가 성공적으로 충전되었습니다.');
      expect(response.data.chargedAmount).toBe(1000);
      expect(response.data.newBalance).toBe(6000);
    });

    it('should return 400 if amount is invalid (zero)', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 0, paymentMethod: 'card' },
      });

      await userController.chargePoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '유효하지 않은 충전 금액입니다.',
      });
    });

    it('should return 400 if amount is negative', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: -100, paymentMethod: 'card' },
      });

      await userController.chargePoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '유효하지 않은 충전 금액입니다.',
      });
    });

    it('should return 500 on transaction error', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 1000, paymentMethod: 'card' },
      });

      const mockClient = mockPool._mockClient;
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK' || query === 'COMMIT') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.reject(new Error('Transaction error'));
      });

      await userController.chargePoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '포인트 충전 중 오류가 발생했습니다.',
      });
    });
  });

  // ============================================
  // spendPoints - 포인트 사용 (트랜잭션)
  // ============================================
  describe('spendPoints', () => {
    it('should spend points successfully', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 500, description: '모임 참가비', relatedId: 'meetup-123' },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ available_points: 1000 }], rowCount: 1 }, // SELECT current points
        { rows: [], rowCount: 1 }, // UPDATE users
        { rows: [{ id: 'tx-456' }], rowCount: 1 }, // INSERT transaction
      ]);

      await userController.spendPoints(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toBe('포인트가 성공적으로 사용되었습니다.');
      expect(response.data.spentAmount).toBe(500);
      expect(response.data.newBalance).toBe(500);
    });

    it('should return 400 if amount is invalid (zero)', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 0, description: '테스트' },
      });

      await userController.spendPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '유효하지 않은 사용 금액입니다.',
      });
    });

    it('should return 400 if insufficient points', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 2000, description: '모임 참가비' },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ available_points: 500 }], rowCount: 1 }, // 잔액 부족
      ]);

      await userController.spendPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '보유 포인트가 부족합니다.',
      });
    });

    it('should return 500 on transaction error', async () => {
      mockReq = createMockRequest({
        user: { userId: testUser.id },
        body: { amount: 500, description: '테스트' },
      });

      const mockClient = mockPool._mockClient;
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK' || query === 'COMMIT') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.reject(new Error('Transaction error'));
      });

      await userController.spendPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '포인트 사용 중 오류가 발생했습니다.',
      });
    });
  });
});
