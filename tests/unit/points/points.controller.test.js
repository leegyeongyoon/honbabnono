/**
 * Points Controller Unit Tests
 * 포인트 관련 컨트롤러 함수들의 단위 테스트
 */

const {
  createMockPool,
  mockQueryOnce,
  mockQueryError,
  resetMockQuery,
  setupTransactionMock,
} = require('../../mocks/database.mock');

const {
  createMockResponse,
  createAuthenticatedRequest,
} = require('../../helpers/response.helper');

// Mock database
const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

const pointsController = require('../../../server/modules/points/controller');

describe('Points Controller', () => {
  let req;
  let res;

  const mockUser = {
    id: 1,
    userId: 1,
    nickname: 'testuser',
    email: 'test@test.com',
  };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // ============================================
  // getPoints - 포인트 조회
  // ============================================
  describe('getPoints', () => {
    it('should return user points successfully', async () => {
      req = createAuthenticatedRequest(mockUser);

      mockQueryOnce(mockPool, {
        rows: [{
          available_points: 5000,
          total_earned: 10000,
          total_used: 5000,
        }],
        rowCount: 1,
      });

      await pointsController.getPoints(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        points: {
          available: 5000,
          totalEarned: 10000,
          totalUsed: 5000,
        },
      });
    });

    it('should create new points record if not exists', async () => {
      req = createAuthenticatedRequest(mockUser);

      // 첫 번째 쿼리: 포인트 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      // 두 번째 쿼리: INSERT
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });

      await pointsController.getPoints(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        points: {
          available: 0,
          totalEarned: 0,
          totalUsed: 0,
        },
      });
    });

    it('should return 500 on database error', async () => {
      req = createAuthenticatedRequest(mockUser);

      mockQueryError(mockPool, new Error('Database error'));

      await pointsController.getPoints(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '서버 오류가 발생했습니다',
      });
    });
  });

  // ============================================
  // getPointHistory - 포인트 내역 조회
  // ============================================
  describe('getPointHistory', () => {
    it('should return point history with pagination', async () => {
      req = createAuthenticatedRequest(mockUser, {
        query: { page: 1, limit: 10 },
      });

      const mockHistory = [
        { id: 1, type: 'earn', amount: 1000, reason: '가입 보너스' },
        { id: 2, type: 'use', amount: 500, reason: '모임 참가비' },
      ];

      mockQueryOnce(mockPool, { rows: mockHistory, rowCount: 2 });

      await pointsController.getPointHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        history: mockHistory,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
        },
      });
    });

    it('should filter by type when provided', async () => {
      req = createAuthenticatedRequest(mockUser, {
        query: { page: 1, limit: 10, type: 'earn' },
      });

      const mockHistory = [
        { id: 1, type: 'earn', amount: 1000, reason: '가입 보너스' },
      ];

      mockQueryOnce(mockPool, { rows: mockHistory, rowCount: 1 });

      await pointsController.getPointHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        history: mockHistory,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
        },
      });
    });

    it('should use default pagination values', async () => {
      req = createAuthenticatedRequest(mockUser, {
        query: {},
      });

      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });

      await pointsController.getPointHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        history: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
        },
      });
    });

    it('should return 500 on database error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        query: {},
      });

      mockQueryError(mockPool, new Error('Database error'));

      await pointsController.getPointHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '서버 오류가 발생했습니다',
      });
    });
  });

  // ============================================
  // earnPoints - 포인트 적립 (트랜잭션)
  // ============================================
  describe('earnPoints', () => {
    it('should earn points successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 1000,
          reason: '모임 참여 보상',
          referenceId: 'meetup-123',
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [], rowCount: 1 }, // INSERT/UPDATE user_points
        { rows: [], rowCount: 1 }, // INSERT point_transactions
      ]);

      await pointsController.earnPoints(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '1000 포인트가 적립되었습니다.',
      });
    });

    it('should return 500 on transaction error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 1000,
          reason: '모임 참여 보상',
          referenceId: 'meetup-123',
        },
      });

      const mockClient = mockPool._mockClient;
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.reject(new Error('Transaction error'));
      });

      await pointsController.earnPoints(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '서버 오류가 발생했습니다',
      });
    });
  });

  // ============================================
  // usePoints - 포인트 사용 (트랜잭션)
  // ============================================
  describe('usePoints', () => {
    it('should use points successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 500,
          reason: '모임 참가비',
          referenceId: 'meetup-456',
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ available_points: 1000 }], rowCount: 1 }, // 잔액 확인
        { rows: [], rowCount: 1 }, // UPDATE user_points
        { rows: [], rowCount: 1 }, // INSERT point_transactions
      ]);

      await pointsController.usePoints(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '500 포인트가 사용되었습니다.',
      });
    });

    it('should return 400 if insufficient balance (no record)', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 500,
          reason: '모임 참가비',
          referenceId: 'meetup-456',
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [], rowCount: 0 }, // 잔액 없음
      ]);

      await pointsController.usePoints(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '포인트 잔액이 부족합니다.',
      });
    });

    it('should return 400 if insufficient balance', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 2000,
          reason: '모임 참가비',
          referenceId: 'meetup-456',
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ available_points: 1000 }], rowCount: 1 }, // 잔액 부족
      ]);

      await pointsController.usePoints(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '포인트 잔액이 부족합니다.',
      });
    });

    it('should return 500 on transaction error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 500,
          reason: '모임 참가비',
          referenceId: 'meetup-456',
        },
      });

      const mockClient = mockPool._mockClient;
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.reject(new Error('Transaction error'));
      });

      await pointsController.usePoints(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '서버 오류가 발생했습니다',
      });
    });
  });

  // ============================================
  // payDeposit - 약속금 결제 (트랜잭션)
  // ============================================
  describe('payDeposit', () => {
    it('should pay deposit successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          meetupId: 'meetup-123',
          amount: 5000,
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ available_points: 10000 }], rowCount: 1 }, // 잔액 확인
        { rows: [], rowCount: 1 }, // UPDATE user_points
        { rows: [], rowCount: 1 }, // INSERT meetup_deposits
      ]);

      await pointsController.payDeposit(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '약속금이 결제되었습니다.',
      });
    });

    it('should return 400 if insufficient balance for deposit', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          meetupId: 'meetup-123',
          amount: 15000,
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ available_points: 10000 }], rowCount: 1 }, // 잔액 부족
      ]);

      await pointsController.payDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '포인트 잔액이 부족합니다.',
      });
    });

    it('should return 400 if no points record exists', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          meetupId: 'meetup-123',
          amount: 5000,
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [], rowCount: 0 }, // 포인트 레코드 없음
      ]);

      await pointsController.payDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '포인트 잔액이 부족합니다.',
      });
    });

    it('should return 500 on transaction error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          meetupId: 'meetup-123',
          amount: 5000,
        },
      });

      const mockClient = mockPool._mockClient;
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.reject(new Error('Transaction error'));
      });

      await pointsController.payDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '서버 오류가 발생했습니다',
      });
    });
  });

  // ============================================
  // refundDeposit - 약속금 환불 (트랜잭션)
  // ============================================
  describe('refundDeposit', () => {
    it('should refund deposit successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          meetupId: 'meetup-123',
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ amount: 5000 }], rowCount: 1 }, // 약속금 확인
        { rows: [], rowCount: 1 }, // UPDATE user_points
        { rows: [], rowCount: 1 }, // UPDATE meetup_deposits
      ]);

      await pointsController.refundDeposit(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '5000 포인트가 환불되었습니다.',
      });
    });

    it('should return 400 if no deposit found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          meetupId: 'meetup-999',
        },
      });

      setupTransactionMock(mockPool, [
        { rows: [], rowCount: 0 }, // 약속금 없음
      ]);

      await pointsController.refundDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '환불할 약속금이 없습니다.',
      });
    });

    it('should return 500 on transaction error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          meetupId: 'meetup-123',
        },
      });

      const mockClient = mockPool._mockClient;
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.reject(new Error('Transaction error'));
      });

      await pointsController.refundDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: '서버 오류가 발생했습니다',
      });
    });
  });
});
