/**
 * Payments Controller Unit Tests
 * 결제 컨트롤러 단위 테스트
 */

const {
  createMockPool,
  resetMockQuery,
} = require('../../mocks/database.mock');

const mockPool = createMockPool();

jest.mock('../../../server/config/database', () => mockPool);
jest.mock('../../../server/config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock('../../../server/config/portone', () => ({
  verifyPayment: jest.fn(),
  cancelPayment: jest.fn(),
}));

const paymentsController = require('../../../server/modules/payments/controller');
const portone = require('../../../server/config/portone');
const {
  createMockResponse,
  createMockRequest,
} = require('../../helpers/response.helper');

describe('PaymentsController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
    process.env.PORTONE_STORE_ID = 'test-store-id';
  });

  describe('preparePayment', () => {
    it('should prepare payment successfully', async () => {
      mockReq = createMockRequest({
        body: {
          reservation_id: 50,
          amount: 30000,
          payment_method: 'card',
        },
        user: { userId: 'u-1' },
      });

      mockPool.query
        // 1. SELECT reservation
        .mockResolvedValueOnce({
          rows: [{ id: 50, user_id: 'u-1', restaurant_id: 1, status: 'pending_payment' }],
          rowCount: 1,
        })
        // 2. SELECT order
        .mockResolvedValueOnce({
          rows: [{ id: 100, total_amount: 30000 }],
          rowCount: 1,
        })
        // 3. SELECT existing pending payment (none)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        })
        // 4. INSERT payment
        .mockResolvedValueOnce({
          rows: [{ id: 200 }],
          rowCount: 1,
        })
        // 5. SELECT user
        .mockResolvedValueOnce({
          rows: [{ name: '홍길동', email: 'hong@test.com' }],
          rowCount: 1,
        });

      await paymentsController.preparePayment(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.paymentData.paymentId).toBe(200);
      expect(response.paymentData.merchantUid).toContain('reservation_');
    });

    it('should return 403 if not own reservation', async () => {
      mockReq = createMockRequest({
        body: { reservation_id: 50, amount: 30000, payment_method: 'card' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 50, user_id: 'u-other', restaurant_id: 1, status: 'pending_payment' }],
        rowCount: 1,
      });

      await paymentsController.preparePayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if amount mismatch', async () => {
      mockReq = createMockRequest({
        body: { reservation_id: 50, amount: 99999, payment_method: 'card' },
        user: { userId: 'u-1' },
      });

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 50, user_id: 'u-1', restaurant_id: 1, status: 'pending_payment' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: 100, total_amount: 30000 }],
          rowCount: 1,
        });

      await paymentsController.preparePayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('completePayment', () => {
    it('should return 404 if payment not found', async () => {
      mockReq = createMockRequest({
        body: { imp_uid: 'imp-1', merchant_uid: 'reservation_999' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await paymentsController.completePayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return success if already paid (idempotency)', async () => {
      mockReq = createMockRequest({
        body: { imp_uid: 'imp-1', merchant_uid: 'reservation_xxx' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 200, user_id: 'u-1', status: 'paid', amount: 30000 }],
        rowCount: 1,
      });

      await paymentsController.completePayment(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toContain('이미');
    });
  });

  describe('getPaymentByReservation', () => {
    it('should return payment for own reservation', async () => {
      mockReq = createMockRequest({
        params: { reservationId: '50' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 200, user_id: 'u-1', amount: 30000 }],
        rowCount: 1,
      });

      await paymentsController.getPaymentByReservation(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.payment.id).toBe(200);
    });

    it('should return null payment if no record', async () => {
      mockReq = createMockRequest({
        params: { reservationId: '50' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await paymentsController.getPaymentByReservation(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.payment).toBeNull();
    });

    it('should return 403 if not own payment', async () => {
      mockReq = createMockRequest({
        params: { reservationId: '50' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 200, user_id: 'u-other', amount: 30000 }],
        rowCount: 1,
      });

      await paymentsController.getPaymentByReservation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('refundPayment', () => {
    it('should return 404 if payment not found', async () => {
      mockReq = createMockRequest({
        params: { id: '999' },
        body: { reason: '단순 변심' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await paymentsController.refundPayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if not paid status', async () => {
      mockReq = createMockRequest({
        params: { id: '200' },
        body: { reason: '단순 변심' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 200, user_id: 'u-1', status: 'pending', amount: 30000 }],
        rowCount: 1,
      });

      await paymentsController.refundPayment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
