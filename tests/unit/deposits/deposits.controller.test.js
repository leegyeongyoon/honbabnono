/**
 * Deposits Controller Unit Tests
 * 약속금 관련 컨트롤러 함수들의 단위 테스트
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

// Mock database
const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

const depositsController = require('../../../server/modules/deposits/controller');

describe('Deposits Controller', () => {
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
  // createPayment - 약속금 결제
  // ============================================
  describe('createPayment', () => {
    it('should return 400 if required fields are missing', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          // meetupId와 paymentMethod 누락
        },
      });

      await depositsController.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '필수 정보가 누락되었습니다.',
      });
    });

    it('should create temporary meetup for temp meetupId', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'temp-abc123',
          paymentMethod: 'card',
        },
      });

      // 임시 모임 생성
      mockQueryOnce(mockPool, {
        rows: [{ id: 'new-meetup-uuid' }],
        rowCount: 1,
      });
      // 약속금 저장
      mockQueryOnce(mockPool, {
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      await depositsController.createPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        paymentId: 1,
        meetupId: 'new-meetup-uuid',
      }));
    });

    it('should return 400 if deposit already exists for meetup', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'existing-meetup-123',
          paymentMethod: 'card',
        },
      });

      // 기존 약속금 있음
      mockQueryOnce(mockPool, {
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      await depositsController.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '이미 해당 모임의 약속금을 결제하셨습니다.',
      });
    });

    it('should process kakaopay payment successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'meetup-123',
          paymentMethod: 'kakaopay',
        },
      });

      // 기존 약속금 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      // 약속금 저장
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });

      await depositsController.createPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        paymentId: 1,
        meetupId: 'meetup-123',
        redirectUrl: expect.stringContaining('kakaopay'),
      }));
    });

    it('should process card payment successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'meetup-123',
          paymentMethod: 'card',
        },
      });

      // 기존 약속금 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      // 약속금 저장
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });

      await depositsController.createPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        paymentId: 1,
        meetupId: 'meetup-123',
      }));
    });

    it('should process points payment successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'meetup-123',
          paymentMethod: 'points',
        },
      });

      // 기존 약속금 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      // 포인트 잔액 확인
      mockQueryOnce(mockPool, { rows: [{ available_points: 10000 }], rowCount: 1 });
      // 포인트 차감
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 거래 내역
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 약속금 저장
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });

      await depositsController.createPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        paymentId: 1,
        meetupId: 'meetup-123',
      }));
    });

    it('should return 400 if insufficient points', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 10000,
          meetupId: 'meetup-123',
          paymentMethod: 'points',
        },
      });

      // 기존 약속금 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      // 포인트 잔액 부족
      mockQueryOnce(mockPool, { rows: [{ available_points: 5000 }], rowCount: 1 });

      await depositsController.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '보유 포인트가 부족합니다.',
      });
    });

    it('should return 400 if no points record', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'meetup-123',
          paymentMethod: 'points',
        },
      });

      // 기존 약속금 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      // 포인트 레코드 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });

      await depositsController.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '보유 포인트가 부족합니다.',
      });
    });

    it('should return 400 for unsupported payment method', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'meetup-123',
          paymentMethod: 'bitcoin',
        },
      });

      // 기존 약속금 없음
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });

      await depositsController.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '지원하지 않는 결제 방식입니다.',
      });
    });

    it('should return 500 on database error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, {
        body: {
          amount: 5000,
          meetupId: 'meetup-123',
          paymentMethod: 'card',
        },
      });

      mockQueryError(mockPool, new Error('Database error'));

      await depositsController.createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '결제 처리 중 오류가 발생했습니다.',
      });
      console.error = originalError;
    });
  });

  // ============================================
  // refundDeposit - 약속금 환불
  // ============================================
  describe('refundDeposit', () => {
    it('should refund deposit successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { reason: '모임 취소' },
      });

      const mockDeposit = {
        id: 1,
        user_id: 1,
        amount: 5000,
        status: 'paid',
        meetup_id: 'meetup-123',
      };

      // 약속금 조회
      mockQueryOnce(mockPool, { rows: [mockDeposit], rowCount: 1 });
      // 약속금 상태 업데이트
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 환불
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 거래 내역
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });

      await depositsController.refundDeposit(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '약속금이 환불되었습니다.',
        refundAmount: 5000,
      });
    });

    it('should return 404 if deposit not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '999' },
        body: { reason: '모임 취소' },
      });

      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });

      await depositsController.refundDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '환불 가능한 약속금을 찾을 수 없습니다.',
      });
    });

    it('should return 500 on database error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { reason: '모임 취소' },
      });

      mockQueryError(mockPool, new Error('Database error'));

      await depositsController.refundDeposit(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '환불 처리 중 오류가 발생했습니다.',
      });
      console.error = originalError;
    });
  });

  // ============================================
  // convertToPoints - 약속금 포인트 전환
  // ============================================
  describe('convertToPoints', () => {
    it('should convert deposit to points successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
      });

      const mockDeposit = {
        id: 1,
        user_id: 1,
        amount: 5000,
        status: 'paid',
        meetup_id: 'meetup-123',
      };

      // 약속금 조회
      mockQueryOnce(mockPool, { rows: [mockDeposit], rowCount: 1 });
      // 포인트 적립
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 거래 내역
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 약속금 상태 업데이트
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });

      await depositsController.convertToPoints(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '약속금이 포인트로 전환되었습니다.',
        pointAmount: 5000,
      });
    });

    it('should return 404 if deposit not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '999' },
      });

      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });

      await depositsController.convertToPoints(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '포인트 전환 가능한 약속금을 찾을 수 없습니다.',
      });
    });

    it('should return 500 on database error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
      });

      mockQueryError(mockPool, new Error('Database error'));

      await depositsController.convertToPoints(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '포인트 전환 처리 중 오류가 발생했습니다.',
      });
      console.error = originalError;
    });
  });

  // ============================================
  // refundPayment - 약속금 일반 환불
  // ============================================
  describe('refundPayment', () => {
    it('should refund payment successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          depositId: '1',
          reason: '사용자 요청',
        },
      });

      const mockDeposit = {
        id: 1,
        user_id: 1,
        amount: 5000,
        status: 'paid',
      };

      // 약속금 조회
      mockQueryOnce(mockPool, { rows: [mockDeposit], rowCount: 1 });
      // 약속금 상태 업데이트
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 환불
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 거래 내역
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });

      await depositsController.refundPayment(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '약속금이 환불되었습니다.',
        refundAmount: 5000,
      });
    });

    it('should return 400 if depositId is missing', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          reason: '사용자 요청',
        },
      });

      await depositsController.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '환불할 약속금 정보가 필요합니다.',
      });
    });

    it('should return 404 if deposit not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          depositId: '999',
          reason: '사용자 요청',
        },
      });

      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });

      await depositsController.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '환불 가능한 약속금을 찾을 수 없습니다.',
      });
    });

    it('should use default reason if not provided', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: {
          depositId: '1',
        },
      });

      const mockDeposit = {
        id: 1,
        user_id: 1,
        amount: 5000,
        status: 'paid',
      };

      // 약속금 조회
      mockQueryOnce(mockPool, { rows: [mockDeposit], rowCount: 1 });
      // 약속금 상태 업데이트
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 환불
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });
      // 포인트 거래 내역
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 });

      await depositsController.refundPayment(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '약속금이 환불되었습니다.',
        refundAmount: 5000,
      });
    });

    it('should return 500 on database error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, {
        body: {
          depositId: '1',
          reason: '사용자 요청',
        },
      });

      mockQueryError(mockPool, new Error('Database error'));

      await depositsController.refundPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: '환불 처리 중 오류가 발생했습니다.',
      });
      console.error = originalError;
    });
  });
});
