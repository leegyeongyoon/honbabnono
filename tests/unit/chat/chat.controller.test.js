/**
 * Chat Controller Unit Tests
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

const chatController = require('../../../server/modules/chat/controller');

describe('Chat Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // checkDirectChatPermission
  describe('checkDirectChatPermission', () => {
    it('should return 400 if required params are missing', async () => {
      req = createMockRequest({ query: {} });
      await chatController.checkDirectChatPermission(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return not allowed for self chat', async () => {
      req = createMockRequest({ query: { currentUserId: '1', targetUserId: '1' } });
      await chatController.checkDirectChatPermission(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { allowed: false, reason: 'SELF_CHAT_NOT_ALLOWED' }
      });
    });

    it('should return not allowed if user not found', async () => {
      req = createMockRequest({ query: { currentUserId: '1', targetUserId: '2' } });
      mockQueryOnce(mockPool, { rows: [{ id: '1', gender: 'male', direct_chat_setting: 'ALLOW_ALL' }], rowCount: 1 });
      await chatController.checkDirectChatPermission(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { allowed: false, reason: 'USER_NOT_FOUND' }
      });
    });

    it('should return not allowed if target blocked all', async () => {
      req = createMockRequest({ query: { currentUserId: '1', targetUserId: '2' } });
      mockQueryOnce(mockPool, {
        rows: [
          { id: '1', gender: 'male', direct_chat_setting: 'ALLOW_ALL' },
          { id: '2', gender: 'female', direct_chat_setting: 'BLOCKED' }
        ],
        rowCount: 2
      });
      await chatController.checkDirectChatPermission(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { allowed: false, reason: 'TARGET_BLOCKED_ALL' }
      });
    });

    it('should return allowed for valid chat', async () => {
      req = createMockRequest({ query: { currentUserId: '1', targetUserId: '2' } });
      mockQueryOnce(mockPool, {
        rows: [
          { id: '1', gender: 'male', direct_chat_setting: 'ALLOW_ALL' },
          { id: '2', gender: 'female', direct_chat_setting: 'ALLOW_ALL' }
        ],
        rowCount: 2
      });
      await chatController.checkDirectChatPermission(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { allowed: true }
      });
    });

    it('should return 500 on database error', async () => {
      req = createMockRequest({ query: { currentUserId: '1', targetUserId: '2' } });
      mockQueryError(mockPool, new Error('Database error'));
      await chatController.checkDirectChatPermission(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getChatRooms
  describe('getChatRooms', () => {
    it('should return chat rooms successfully', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, type: 'meetup', meetupId: 'm1', title: 'Test Room', lastMessage: 'Hello', unreadCount: 0 }],
        rowCount: 1
      });
      await chatController.getChatRooms(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.getChatRooms(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getUnreadCount
  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [{ total_unread: '5' }], rowCount: 1 });
      await chatController.getUnreadCount(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, unreadCount: 5 });
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.getUnreadCount(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getChatRoomByMeetup
  describe('getChatRoomByMeetup', () => {
    it('should return chat room for meetup', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { meetupId: 'm1' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, meetupId: 'm1', title: 'Test' }], rowCount: 1 });
      await chatController.getChatRoomByMeetup(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { meetupId: 'm999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await chatController.getChatRoomByMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { meetupId: 'm1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.getChatRoomByMeetup(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getMessages
  describe('getMessages', () => {
    it('should return messages', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' }, query: {} });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Room' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [{ id: 1, message: 'Hello', senderId: 1 }], rowCount: 1 });
      await chatController.getMessages(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if room not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' }, query: {} });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await chatController.getMessages(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' }, query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.getMessages(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // sendMessage
  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' }, body: { message: 'Hello' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, message: 'Hello' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await chatController.sendMessage(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' }, body: { message: 'Hello' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.sendMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // markAsRead
  describe('markAsRead', () => {
    it('should mark as read successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await chatController.markAsRead(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.markAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // leaveChatRoom
  describe('leaveChatRoom', () => {
    it('should leave chat room successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      await chatController.leaveChatRoom(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.leaveChatRoom(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // markAllAsRead
  describe('markAllAsRead', () => {
    it('should mark all as read successfully', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [], rowCount: 5 });
      await chatController.markAllAsRead(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, updatedCount: 5 }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await chatController.markAllAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
