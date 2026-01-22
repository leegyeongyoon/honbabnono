/**
 * Admin Controller Unit Tests
 * 관리자 컨트롤러 단위 테스트
 */

// Mock modules before imports
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

jest.mock('../../../server/config/database', () => mockPool);
jest.mock('../../../server/config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const adminController = require('../../../server/modules/admin/controller');
const { createMockRequest, createMockResponse } = require('../../helpers/response.helper');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('AdminController', () => {
  let mockReq;
  let mockRes;

  const testAdmin = {
    id: 'admin-uuid-1234',
    username: 'admin',
    email: 'admin@example.com',
    password_hash: '$2a$10$hashedpassword',
    role: 'super_admin',
    is_active: true,
    last_login: new Date(),
    created_at: new Date(),
  };

  const testUser = {
    id: 'user-uuid-1234',
    email: 'user@example.com',
    name: 'Test User',
    is_blocked: false,
    created_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockReq = createMockRequest({
        body: { username: 'admin', password: 'password123' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testAdmin],
        rowCount: 1,
      });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValueOnce('mock-jwt-token');
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.login(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.token).toBe('mock-jwt-token');
      expect(response.admin.username).toBe(testAdmin.username);
    });

    it('should return 401 if admin not found', async () => {
      mockReq = createMockRequest({
        body: { username: 'unknown', password: 'password123' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await adminController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 if password is invalid', async () => {
      mockReq = createMockRequest({
        body: { username: 'admin', password: 'wrongpassword' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testAdmin],
        rowCount: 1,
      });
      bcrypt.compare.mockResolvedValueOnce(false);

      await adminController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        body: { username: 'admin', password: 'password123' },
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await adminController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockReq = createMockRequest({});

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '100' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '50' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '25' }] });

      await adminController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.stats.totalUsers).toBe(100);
      expect(response.stats.totalMeetups).toBe(50);
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({});

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await adminController.getDashboardStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUsers', () => {
    it('should return users list with pagination', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '1' }],
        rowCount: 1,
      });

      await adminController.getUsers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.users).toHaveLength(1);
    });

    it('should filter by search term', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20, search: 'test' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '1' }],
        rowCount: 1,
      });

      await adminController.getUsers(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('ILIKE');
    });

    it('should filter by blocked status', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20, status: 'blocked' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '0' }],
        rowCount: 1,
      });

      await adminController.getUsers(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('is_blocked = true');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      mockReq = createMockRequest({
        params: { id: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });

      await adminController.getUserById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user.id).toBe(testUser.id);
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        params: { id: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await adminController.getUserById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      mockReq = createMockRequest({
        params: { id: testUser.id },
        body: { name: 'Updated Name' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...testUser, name: 'Updated Name' }],
        rowCount: 1,
      });

      await adminController.updateUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if no update fields', async () => {
      mockReq = createMockRequest({
        params: { id: testUser.id },
        body: {},
      });

      await adminController.updateUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      mockReq = createMockRequest({
        params: { id: testUser.id },
        body: { reason: 'Violation' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.blockUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        params: { id: testUser.id },
        body: {},
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await adminController.blockUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('unblockUser', () => {
    it('should unblock user successfully', async () => {
      mockReq = createMockRequest({
        params: { id: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.unblockUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getMeetups', () => {
    it('should return meetups list', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'Test Meetup' }],
        rowCount: 1,
      });

      await adminController.getMeetups(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.meetups).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20, status: '모집중' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await adminController.getMeetups(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('status =');
    });
  });

  describe('getMeetupById', () => {
    it('should return meetup by id', async () => {
      mockReq = createMockRequest({
        params: { id: 'meetup-1' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', title: 'Test Meetup' }],
        rowCount: 1,
      });

      await adminController.getMeetupById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if meetup not found', async () => {
      mockReq = createMockRequest({
        params: { id: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await adminController.getMeetupById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateMeetup', () => {
    it('should update meetup status', async () => {
      mockReq = createMockRequest({
        params: { id: 'meetup-1' },
        body: { status: '모집완료' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meetup-1', status: '모집완료' }],
        rowCount: 1,
      });

      await adminController.updateMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('deleteMeetup', () => {
    it('should delete meetup successfully', async () => {
      mockReq = createMockRequest({
        params: { id: 'meetup-1' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.deleteMeetup(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getReports', () => {
    it('should return reports list', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'report-1', reason: 'Spam' }],
        rowCount: 1,
      });

      await adminController.getReports(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should filter by status', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20, status: 'pending' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await adminController.getReports(mockReq, mockRes);

      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('handleReport', () => {
    it('should handle report successfully', async () => {
      mockReq = createMockRequest({
        params: { id: 'report-1' },
        body: { status: 'resolved', adminNote: 'Handled' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.handleReport(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getNotices', () => {
    it('should return notices list', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 10 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Notice 1' }],
        rowCount: 1,
      });

      await adminController.getNotices(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('createNotice', () => {
    it('should create notice successfully', async () => {
      mockReq = createMockRequest({
        admin: { id: testAdmin.id },
        body: { title: 'New Notice', content: 'Content', isPinned: true },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'New Notice' }],
        rowCount: 1,
      });

      await adminController.createNotice(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('updateNotice', () => {
    it('should update notice successfully', async () => {
      mockReq = createMockRequest({
        params: { id: '1' },
        body: { title: 'Updated Notice', content: 'Updated', isPinned: false, isActive: true },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Updated Notice' }],
        rowCount: 1,
      });

      await adminController.updateNotice(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('deleteNotice', () => {
    it('should delete notice successfully', async () => {
      mockReq = createMockRequest({
        params: { id: '1' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.deleteNotice(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockReq = createMockRequest({});

      await adminController.logout(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getProfile', () => {
    it('should return admin profile', async () => {
      mockReq = createMockRequest({
        admin: testAdmin,
      });

      await adminController.getProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.admin.username).toBe(testAdmin.username);
    });
  });

  describe('getSettings', () => {
    it('should return system settings', async () => {
      mockReq = createMockRequest({});

      await adminController.getSettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.maintenanceMode).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      mockReq = createMockRequest({
        admin: testAdmin,
        body: {
          maintenanceMode: false,
          maxMeetupParticipants: 10,
          depositAmount: 3000,
        },
      });

      await adminController.updateSettings(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 for invalid max participants', async () => {
      mockReq = createMockRequest({
        admin: testAdmin,
        body: {
          maxMeetupParticipants: 100,
          depositAmount: 3000,
        },
      });

      await adminController.updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for negative deposit amount', async () => {
      mockReq = createMockRequest({
        admin: testAdmin,
        body: {
          maxMeetupParticipants: 10,
          depositAmount: -1000,
        },
      });

      await adminController.updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('pinNotice', () => {
    it('should pin notice successfully', async () => {
      mockReq = createMockRequest({
        params: { id: '1' },
        body: { is_pinned: true },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.pinNotice(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return blocked users list', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          block_id: 'block-1',
          id: testUser.id,
          name: testUser.name,
          total_count: '1',
        }],
        rowCount: 1,
      });

      await adminController.getBlockedUsers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getBlockingStats', () => {
    it('should return blocking statistics', async () => {
      mockReq = createMockRequest({
        query: { period: 30 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_blocks: '100',
          blocks_today: '5',
          blocks_this_week: '20',
        }],
        rowCount: 1,
      });

      await adminController.getBlockingStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('getAccounts', () => {
    it('should return admin accounts list', async () => {
      mockReq = createMockRequest({
        query: { page: 1, limit: 20 },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testAdmin],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '1' }],
        rowCount: 1,
      });

      await adminController.getAccounts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });
  });

  describe('createAccount', () => {
    it('should create admin account successfully', async () => {
      mockReq = createMockRequest({
        body: {
          username: 'newadmin',
          email: 'newadmin@example.com',
          password: 'password123',
          role: 'admin',
        },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      bcrypt.hash.mockResolvedValueOnce('$2a$10$hashedpassword');
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'new-admin-id', username: 'newadmin' }],
        rowCount: 1,
      });

      await adminController.createAccount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if missing required fields', async () => {
      mockReq = createMockRequest({
        body: { username: 'newadmin' },
      });

      await adminController.createAccount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if account already exists', async () => {
      mockReq = createMockRequest({
        body: {
          username: 'admin',
          email: 'admin@example.com',
          password: 'password123',
        },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'existing-id' }],
        rowCount: 1,
      });

      await adminController.createAccount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateAccount', () => {
    it('should update admin account successfully', async () => {
      mockReq = createMockRequest({
        params: { adminId: testAdmin.id },
        body: { email: 'updated@example.com', role: 'admin' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...testAdmin, email: 'updated@example.com' }],
        rowCount: 1,
      });

      await adminController.updateAccount(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 404 if admin not found', async () => {
      mockReq = createMockRequest({
        params: { adminId: 'nonexistent' },
        body: { email: 'updated@example.com' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await adminController.updateAccount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateAccountPassword', () => {
    it('should update password successfully', async () => {
      mockReq = createMockRequest({
        params: { adminId: testAdmin.id },
        body: { newPassword: 'newpassword123' },
      });

      bcrypt.hash.mockResolvedValueOnce('$2a$10$newhashedpassword');
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.updateAccountPassword(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if password too short', async () => {
      mockReq = createMockRequest({
        params: { adminId: testAdmin.id },
        body: { newPassword: '12345' },
      });

      await adminController.updateAccountPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteAccount', () => {
    it('should delete admin account successfully', async () => {
      mockReq = createMockRequest({
        admin: { id: 'other-admin-id' },
        params: { adminId: testAdmin.id },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.deleteAccount(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if trying to delete self', async () => {
      mockReq = createMockRequest({
        admin: { id: testAdmin.id },
        params: { adminId: testAdmin.id },
      });

      await adminController.deleteAccount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getUserDetails', () => {
    it('should return user details with stats', async () => {
      mockReq = createMockRequest({
        params: { userId: testUser.id },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [testUser],
        rowCount: 1,
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ hosted_meetups: '5', joined_meetups: '10', reviews_written: '3', points: 5000 }],
        rowCount: 1,
      });

      await adminController.getUserDetails(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.stats).toBeDefined();
    });

    it('should return 404 if user not found', async () => {
      mockReq = createMockRequest({
        params: { userId: 'nonexistent' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await adminController.getUserDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUserPoints', () => {
    it('should add points to user', async () => {
      mockReq = createMockRequest({
        params: { userId: testUser.id },
        body: { amount: 1000, type: 'add', description: 'Bonus' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await adminController.updateUserPoints(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 for invalid type', async () => {
      mockReq = createMockRequest({
        params: { userId: testUser.id },
        body: { amount: 1000, type: 'invalid' },
      });

      await adminController.updateUserPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if missing amount', async () => {
      mockReq = createMockRequest({
        params: { userId: testUser.id },
        body: { type: 'add' },
      });

      await adminController.updateUserPoints(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
