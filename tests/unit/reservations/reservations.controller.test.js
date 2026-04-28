/**
 * Reservations Controller Unit Tests
 * 예약 컨트롤러 단위 테스트
 */

const {
  createMockPool,
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
// 소켓 모듈 mock (require 시점에서 호출됨)
jest.mock('../../../server/modules/reservations/socket', () => ({
  emitArrivalUpdate: jest.fn(),
  emitCheckin: jest.fn(),
  emitStatusUpdate: jest.fn(),
  emitCookingUpdate: jest.fn(),
}));

const reservationsController = require('../../../server/modules/reservations/controller');
const {
  createMockResponse,
  createMockRequest,
} = require('../../helpers/response.helper');

describe('ReservationsController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
  });

  describe('createReservation', () => {
    it('should create reservation successfully', async () => {
      mockReq = createMockRequest({
        body: {
          restaurant_id: 1,
          reservation_date: '2026-05-01',
          reservation_time: '18:00',
          party_size: 2,
          special_request: '창가 자리',
        },
        user: { userId: 'u-1' },
      });

      setupTransactionMock(mockPool, [
        // 1. SELECT restaurant
        { rows: [{ id: 1, name: '한솥', status: 'active' }], rowCount: 1 },
        // 2. SELECT time_slot
        { rows: [{ id: 100, current_reservations: 0, max_reservations: 10 }], rowCount: 1 },
        // 3. INSERT reservation
        {
          rows: [{
            id: 50,
            user_id: 'u-1',
            restaurant_id: 1,
            reservation_date: '2026-05-01',
            reservation_time: '18:00',
            party_size: 2,
            qr_code: 'abc123',
            status: 'pending_payment',
          }],
          rowCount: 1,
        },
        // 4. UPDATE time_slot
        { rows: [], rowCount: 1 },
      ]);

      await reservationsController.createReservation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.reservation.id).toBe(50);
    });

    it('should return 404 if restaurant not found', async () => {
      mockReq = createMockRequest({
        body: {
          restaurant_id: 999,
          reservation_date: '2026-05-01',
          reservation_time: '18:00',
          party_size: 2,
        },
        user: { userId: 'u-1' },
      });

      setupTransactionMock(mockPool, [
        { rows: [], rowCount: 0 }, // 식당 없음
      ]);

      await reservationsController.createReservation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if time slot is full', async () => {
      mockReq = createMockRequest({
        body: {
          restaurant_id: 1,
          reservation_date: '2026-05-01',
          reservation_time: '18:00',
          party_size: 2,
        },
        user: { userId: 'u-1' },
      });

      setupTransactionMock(mockPool, [
        { rows: [{ id: 1, name: '한솥', status: 'active' }], rowCount: 1 },
        { rows: [{ id: 100, current_reservations: 10, max_reservations: 10 }], rowCount: 1 },
      ]);

      await reservationsController.createReservation(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getMyReservations', () => {
    it('should return user reservations with pagination', async () => {
      mockReq = createMockRequest({
        query: { page: '1', limit: '20' },
        user: { userId: 'u-1' },
      });

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reservation_date: '2026-05-01',
            reservation_time: '18:00',
            status: 'confirmed',
            restaurant_id: 1,
            restaurant_name: '한솥',
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        });

      await reservationsController.getMyReservations(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.reservations).toHaveLength(1);
      expect(response.pagination.total).toBe(1);
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({
        query: {},
        user: { userId: 'u-1' },
      });

      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      await reservationsController.getMyReservations(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateStatus', () => {
    it('should update reservation status (confirmed -> preparing)', async () => {
      mockReq = createMockRequest({
        params: { id: '50' },
        body: { status: 'preparing' },
      });
      mockReq.merchant = { restaurantId: 1 };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 50, restaurant_id: 1, status: 'confirmed' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE

      await reservationsController.updateStatus(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 for invalid state transition', async () => {
      mockReq = createMockRequest({
        params: { id: '50' },
        body: { status: 'completed' }, // confirmed -> completed 는 불가
      });
      mockReq.merchant = { restaurantId: 1 };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 50, restaurant_id: 1, status: 'confirmed' }],
        rowCount: 1,
      });

      await reservationsController.updateStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if not own restaurant', async () => {
      mockReq = createMockRequest({
        params: { id: '50' },
        body: { status: 'preparing' },
      });
      mockReq.merchant = { restaurantId: 1 };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 50, restaurant_id: 999, status: 'confirmed' }],
        rowCount: 1,
      });

      await reservationsController.updateStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('processNoShow', () => {
    it('should process noshow successfully', async () => {
      mockReq = createMockRequest({ params: { id: '50' } });
      mockReq.merchant = { restaurantId: 1 };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 50, restaurant_id: 1, status: 'confirmed' }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await reservationsController.processNoShow(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 400 if reservation not in valid status', async () => {
      mockReq = createMockRequest({ params: { id: '50' } });
      mockReq.merchant = { restaurantId: 1 };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 50, restaurant_id: 1, status: 'completed' }],
        rowCount: 1,
      });

      await reservationsController.processNoShow(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
