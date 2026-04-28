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

      // Promise.all: 식당, 메뉴, 타임슬롯
      mockPool.query
        .mockResolvedValueOnce({ rows: [restaurantRow], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ id: 10, name: '비빔밥', category: '한식', price: 10000 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ id: 100, day_of_week: 1, start_time: '11:00', end_time: '14:00' }],
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
        .mockResolvedValueOnce({ rows: [inserted], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE merchants

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
