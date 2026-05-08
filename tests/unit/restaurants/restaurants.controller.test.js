/**
 * Restaurants Controller Unit Tests
 * 식당 컨트롤러 단위 테스트
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

const restaurantsController = require('../../../server/modules/restaurants/controller');
const {
  createMockResponse,
  createMockRequest,
} = require('../../helpers/response.helper');

describe('RestaurantsController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
  });

  describe('getRestaurants', () => {
    it('should return restaurants list with pagination', async () => {
      mockReq = createMockRequest({
        query: { page: '1', limit: '20' },
      });

      // 두 개의 쿼리 (Promise.all): 식당 목록 + count
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: '한솥', is_active: true, avg_rating: 4.5, review_count: 10 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        });

      await restaurantsController.getRestaurants(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.restaurants).toHaveLength(1);
      expect(response.pagination.total).toBe(1);
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({ query: {} });

      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      await restaurantsController.getRestaurants(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });
  });

  describe('getRestaurantById', () => {
    it('should return restaurant detail with menus and timeSlots', async () => {
      mockReq = createMockRequest({ params: { id: '1' } });

      const restaurantRow = {
        id: 1,
        name: '한솥',
        is_active: true,
        avg_rating: 4.5,
        review_count: 5,
      };

      // Promise.all: 식당, 메뉴(category join), 타임슬롯(slot_time)
      mockPool.query
        .mockResolvedValueOnce({ rows: [restaurantRow], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: 10, name: '비빔밥', category_name: '한식', category_id: 'c1', price: 10000, is_active: true }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: 100, day_of_week: 1, slot_time: '11:00', max_reservations: 5, current_reservations: 0 }],
          rowCount: 1,
        });

      await restaurantsController.getRestaurantById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(1);
      expect(response.data.menus).toHaveLength(1);
      expect(response.data.timeSlots).toHaveLength(1);
      expect(response.data.menusByCategory['한식']).toBeDefined();
    });

    it('should return 404 if restaurant not found', async () => {
      mockReq = createMockRequest({ params: { id: '999' } });

      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await restaurantsController.getRestaurantById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTimeSlots', () => {
    it('should return time slots with availability for a date', async () => {
      mockReq = createMockRequest({
        params: { id: 'r-1' },
        query: { date: '2026-05-12' },
      });

      // 1st: slots query
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, day_of_week: 2, slot_time: '11:30:00', max_reservations: 5, is_active: true },
            { id: 2, day_of_week: 2, slot_time: '12:00:00', max_reservations: 5, is_active: true },
          ],
          rowCount: 2,
        })
        // 2nd: booked count query
        .mockResolvedValueOnce({
          rows: [{ reservation_time: '11:30:00', booked: 3 }],
          rowCount: 1,
        });

      await restaurantsController.getTimeSlots(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].current_reservations).toBe(3);
      expect(response.data[0].remaining).toBe(2);
      expect(response.data[1].current_reservations).toBe(0);
      expect(response.data[1].remaining).toBe(5);
    });

    it('should return slots without date filter', async () => {
      mockReq = createMockRequest({
        params: { id: 'r-1' },
        query: {},
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, day_of_week: 1, slot_time: '11:30:00', max_reservations: 5, is_active: true }],
        rowCount: 1,
      });

      await restaurantsController.getTimeSlots(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });
  });

  describe('createRestaurant', () => {
    it('should create restaurant successfully', async () => {
      mockReq = createMockRequest({
        body: {
          name: '잇테이블',
          address: '서울시 강남구',
          category: '한식',
        },
      });
      mockReq.merchant = { id: 5, restaurantId: null };

      const inserted = { id: 10, name: '잇테이블', address: '서울시 강남구', merchant_id: 5 };

      mockPool.query
        .mockResolvedValueOnce({ rows: [inserted], rowCount: 1 }) // INSERT restaurant
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE merchants
        .mockResolvedValueOnce({ rows: [], rowCount: 42 }); // INSERT default time slots

      await restaurantsController.createRestaurant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(10);
    });

    it('should reject if merchant already has restaurant', async () => {
      mockReq = createMockRequest({
        body: { name: '잇테이블', address: '서울시 강남구' },
      });
      mockReq.merchant = { id: 5, restaurantId: 99 };

      await restaurantsController.createRestaurant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });
  });

  describe('generateDefaultTimeSlots', () => {
    it('should generate default slots for own restaurant', async () => {
      mockReq = createMockRequest({
        params: { id: 'r-1' },
      });
      mockReq.merchant = { id: 5, restaurantId: 'r-1' };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 42 });

      await restaurantsController.generateDefaultTimeSlots(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toContain('42');
    });

    it('should return 403 for non-own restaurant', async () => {
      mockReq = createMockRequest({
        params: { id: 'r-other' },
      });
      mockReq.merchant = { id: 5, restaurantId: 'r-1' };

      await restaurantsController.generateDefaultTimeSlots(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('toggleFavorite', () => {
    it('should add favorite when not exists', async () => {
      mockReq = createMockRequest({
        params: { id: '1' },
        user: { userId: 'u-1' },
      });

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // 식당 존재
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // 즐겨찾기 없음
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT

      await restaurantsController.toggleFavorite(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.isFavorited).toBe(true);
    });

    it('should return 404 if restaurant not found', async () => {
      mockReq = createMockRequest({
        params: { id: '999' },
        user: { userId: 'u-1' },
      });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await restaurantsController.toggleFavorite(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
