/**
 * Orders Controller Unit Tests
 * 주문 컨트롤러 단위 테스트
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

const ordersController = require('../../../server/modules/orders/controller');
const {
  createMockResponse,
  createMockRequest,
} = require('../../helpers/response.helper');

describe('OrdersController', () => {
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
  });

  describe('createOrder', () => {
    it('should create order with items successfully', async () => {
      const userId = 'user-1';
      const reservationId = 'res-1';
      const restaurantId = 'rest-1';
      const menuId = 'menu-1';

      const client = mockPool._mockClient;
      client.query.mockReset();

      // BEGIN
      client.query.mockResolvedValueOnce({});
      // SELECT reservation
      client.query.mockResolvedValueOnce({
        rows: [{ id: reservationId, user_id: userId, restaurant_id: restaurantId, status: 'confirmed' }],
      });
      // SELECT menu
      client.query.mockResolvedValueOnce({
        rows: [{ id: menuId, name: '샤브샤브', price: 15000, restaurant_id: restaurantId }],
      });
      // INSERT order
      client.query.mockResolvedValueOnce({
        rows: [{
          id: 'order-1',
          reservation_id: reservationId,
          restaurant_id: restaurantId,
          user_id: userId,
          total_amount: 30000,
          cooking_status: 'pending',
          created_at: new Date(),
        }],
      });
      // INSERT order_items
      client.query.mockResolvedValueOnce({});
      // COMMIT
      client.query.mockResolvedValueOnce({});

      const req = createMockRequest({
        user: { userId },
        body: {
          reservation_id: reservationId,
          items: [{ menu_id: menuId, quantity: 2 }],
        },
      });

      await ordersController.createOrder(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        order: expect.objectContaining({ total_amount: 30000 }),
      }));
    });

    it('should return 403 if reservation belongs to another user', async () => {
      const client = mockPool._mockClient;
      client.query.mockReset();
      client.query.mockResolvedValueOnce({}); // BEGIN
      client.query.mockResolvedValueOnce({
        rows: [{ id: 'res-1', user_id: 'other-user', restaurant_id: 'rest-1', status: 'confirmed' }],
      });
      client.query.mockResolvedValueOnce({}); // ROLLBACK

      const req = createMockRequest({
        user: { userId: 'me' },
        body: { reservation_id: 'res-1', items: [{ menu_id: 'menu-1', quantity: 1 }] },
      });

      await ordersController.createOrder(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if reservation not found', async () => {
      const client = mockPool._mockClient;
      client.query.mockReset();
      client.query.mockResolvedValueOnce({}); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] });
      client.query.mockResolvedValueOnce({}); // ROLLBACK

      const req = createMockRequest({
        user: { userId: 'me' },
        body: { reservation_id: 'missing', items: [{ menu_id: 'm', quantity: 1 }] },
      });

      await ordersController.createOrder(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getOrderById', () => {
    it('should return order with items for owner', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'order-1', user_id: 'me', restaurant_id: 'r1', total_amount: 30000, cooking_status: 'pending' }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'oi-1', menu_id: 'm1', menu_name: '샤브샤브', unit_price: 15000, quantity: 2, subtotal: 30000 }],
      });

      const req = createMockRequest({ user: { userId: 'me' }, params: { id: 'order-1' } });
      await ordersController.getOrderById(req, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if order not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const req = createMockRequest({ user: { userId: 'me' }, params: { id: 'missing' } });
      await ordersController.getOrderById(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if order belongs to another user and requester is not the merchant', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'order-1', user_id: 'someone-else', restaurant_id: 'r1' }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // not merchant

      const req = createMockRequest({ user: { userId: 'me' }, params: { id: 'order-1' } });
      await ordersController.getOrderById(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateCookingStatus', () => {
    it('should update cooking status with valid transition', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'order-1', restaurant_id: 'r1', reservation_id: 'res-1', cooking_status: 'pending' }],
      });
      mockPool.query.mockResolvedValueOnce({});

      const req = createMockRequest({
        merchant: { restaurantId: 'r1' },
        params: { id: 'order-1' },
        body: { cooking_status: 'preparing' },
      });
      // Manually attach merchant since createMockRequest doesn't have a merchant slot
      req.merchant = { restaurantId: 'r1' };

      await ordersController.updateCookingStatus(req, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 for invalid status transition', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'order-1', restaurant_id: 'r1', reservation_id: 'res-1', cooking_status: 'pending' }],
      });

      const req = createMockRequest({
        params: { id: 'order-1' },
        body: { cooking_status: 'served' },
      });
      req.merchant = { restaurantId: 'r1' };

      await ordersController.updateCookingStatus(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if order belongs to another restaurant', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'order-1', restaurant_id: 'other', reservation_id: 'res-1', cooking_status: 'pending' }],
      });

      const req = createMockRequest({
        params: { id: 'order-1' },
        body: { cooking_status: 'preparing' },
      });
      req.merchant = { restaurantId: 'r1' };

      await ordersController.updateCookingStatus(req, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
