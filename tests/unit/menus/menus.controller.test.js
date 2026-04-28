/**
 * Menus Controller Unit Tests
 * 메뉴 컨트롤러 단위 테스트
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

const menusController = require('../../../server/modules/menus/controller');
const {
  createMockResponse,
  createMockRequest,
} = require('../../helpers/response.helper');

describe('MenusController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = createMockResponse();
    resetMockQuery(mockPool);
  });

  describe('getMenusByRestaurant', () => {
    it('should return menus grouped by category', async () => {
      mockReq = createMockRequest({ params: { restaurantId: '1' } });

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            restaurant_id: 1,
            category_id: 100,
            name: '비빔밥',
            price: 10000,
            category_name: '한식',
            category_sort_order: 1,
          },
          {
            id: 11,
            restaurant_id: 1,
            category_id: null,
            name: '서비스 메뉴',
            price: 0,
          },
        ],
        rowCount: 2,
      });

      await menusController.getMenusByRestaurant(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.total_count).toBe(2);
      expect(response.data.categories).toHaveLength(2); // 한식 + 기타
    });

    it('should handle database error', async () => {
      mockReq = createMockRequest({ params: { restaurantId: '1' } });

      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      await menusController.getMenusByRestaurant(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMenuById', () => {
    it('should return menu detail', async () => {
      mockReq = createMockRequest({ params: { id: '10' } });

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 10, name: '비빔밥', price: 10000 }],
        rowCount: 1,
      });

      await menusController.getMenuById(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(10);
    });

    it('should return 404 if menu not found', async () => {
      mockReq = createMockRequest({ params: { id: '999' } });

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await menusController.getMenuById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createMenu', () => {
    it('should create menu successfully', async () => {
      mockReq = createMockRequest({
        body: {
          restaurant_id: 1,
          name: '비빔밥',
          price: 10000,
          prep_time_min: 15,
          is_set_menu: false,
          sort_order: 1,
        },
      });
      mockReq.merchant = { id: 5, restaurantId: 1 };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 50, name: '비빔밥', price: 10000 }],
        rowCount: 1,
      });

      await menusController.createMenu(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(50);
    });

    it('should return 403 if restaurant_id mismatch', async () => {
      mockReq = createMockRequest({
        body: {
          restaurant_id: 2,
          name: '비빔밥',
          price: 10000,
        },
      });
      mockReq.merchant = { id: 5, restaurantId: 1 };

      await menusController.createMenu(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('updateMenu', () => {
    it('should update menu successfully', async () => {
      mockReq = createMockRequest({
        params: { id: '10' },
        body: { name: '신메뉴', price: 12000 },
      });
      mockReq.merchant = { id: 5, restaurantId: 1 };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 10, restaurant_id: 1 }], rowCount: 1 }) // 존재 확인
        .mockResolvedValueOnce({ rows: [{ id: 10, name: '신메뉴', price: 12000 }], rowCount: 1 }); // UPDATE

      await menusController.updateMenu(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.name).toBe('신메뉴');
    });

    it('should return 404 if menu not found', async () => {
      mockReq = createMockRequest({
        params: { id: '999' },
        body: { name: '신메뉴' },
      });
      mockReq.merchant = { id: 5, restaurantId: 1 };

      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await menusController.updateMenu(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteMenu', () => {
    it('should delete menu successfully (soft delete)', async () => {
      mockReq = createMockRequest({ params: { id: '10' } });
      mockReq.merchant = { id: 5, restaurantId: 1 };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 10, restaurant_id: 1 }], rowCount: 1 }) // 존재 확인
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE soft delete

      await menusController.deleteMenu(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should return 403 if menu belongs to another restaurant', async () => {
      mockReq = createMockRequest({ params: { id: '10' } });
      mockReq.merchant = { id: 5, restaurantId: 1 };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 10, restaurant_id: 999 }],
        rowCount: 1,
      });

      await menusController.deleteMenu(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});
