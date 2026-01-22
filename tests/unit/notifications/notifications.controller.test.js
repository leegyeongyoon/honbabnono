/**
 * Notifications Controller Unit Tests
 */

const {
  createMockPool,
  mockQueryOnce,
  mockQueryError,
  resetMockQuery,
} = require('../../mocks/database.mock');

const {
  createMockResponse,
  createAuthenticatedRequest,
} = require('../../helpers/response.helper');

const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

const notificationsController = require('../../../server/modules/notifications/controller');

describe('Notifications Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // getNotifications
  describe('getNotifications', () => {
    it('should return notifications with pagination', async () => {
      req = createAuthenticatedRequest(mockUser, { query: { page: 1, limit: 10 } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, type: 'system', title: 'Test' }], rowCount: 1 });
      await notificationsController.getNotifications(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter by type', async () => {
      req = createAuthenticatedRequest(mockUser, { query: { type: 'meetup' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await notificationsController.getNotifications(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.getNotifications(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getUnreadCount
  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [{ count: '5' }], rowCount: 1 });
      await notificationsController.getUnreadCount(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, unreadCount: 5 });
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.getUnreadCount(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // markAsRead
  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await notificationsController.markAsRead(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.markAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // markAllAsRead
  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [], rowCount: 5 });
      await notificationsController.markAllAsRead(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.markAllAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // deleteNotification
  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await notificationsController.deleteNotification(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.deleteNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getSettings
  describe('getSettings', () => {
    it('should return settings', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [{ push_enabled: true }], rowCount: 1 });
      await notificationsController.getSettings(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return default settings if not found', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await notificationsController.getSettings(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        settings: { pushEnabled: true, chatEnabled: true, meetupEnabled: true, marketingEnabled: false }
      });
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.getSettings(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // updateSettings
  describe('updateSettings', () => {
    it('should update settings', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { pushEnabled: true, chatEnabled: true, meetupEnabled: false, marketingEnabled: false }
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await notificationsController.updateSettings(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { body: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.updateSettings(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // createTestNotification
  describe('createTestNotification', () => {
    it('should create test notification', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await notificationsController.createTestNotification(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.createTestNotification(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // markAsReadPatch
  describe('markAsReadPatch', () => {
    it('should mark notification as read via PATCH', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { notificationId: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await notificationsController.markAsReadPatch(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { notificationId: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await notificationsController.markAsReadPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
