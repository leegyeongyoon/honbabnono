/**
 * Advertisements Controller Unit Tests
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
} = require('../../helpers/response.helper');

const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

const adsController = require('../../../server/modules/advertisements/controller');

describe('Advertisements Controller', () => {
  let req, res;

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // getAllAds
  describe('getAllAds', () => {
    it('should return all ads with pagination', async () => {
      req = createMockRequest({ query: { page: 1, limit: 10 } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Ad 1' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [{ total: '10' }], rowCount: 1 });
      await adsController.getAllAds(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter by position', async () => {
      req = createMockRequest({ query: { position: 'home_banner' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      mockQueryOnce(mockPool, { rows: [{ total: '0' }], rowCount: 1 });
      await adsController.getAllAds(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter by isActive', async () => {
      req = createMockRequest({ query: { isActive: 'true' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      mockQueryOnce(mockPool, { rows: [{ total: '0' }], rowCount: 1 });
      await adsController.getAllAds(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await adsController.getAllAds(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getActiveAds
  describe('getActiveAds', () => {
    it('should return active ads', async () => {
      req = createMockRequest({ query: { position: 'home_banner' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Active Ad' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // view count update
      await adsController.getActiveAds(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return empty if no active ads', async () => {
      req = createMockRequest({ query: {} });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await adsController.getActiveAds(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [] }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await adsController.getActiveAds(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // recordClick
  describe('recordClick', () => {
    it('should record click successfully', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });
      await adsController.recordClick(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if ad not found', async () => {
      req = createMockRequest({ params: { id: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await adsController.recordClick(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await adsController.recordClick(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getAdDetail
  describe('getAdDetail', () => {
    it('should return ad detail', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Ad Detail' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // view count update
      await adsController.getAdDetail(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if ad not found', async () => {
      req = createMockRequest({ params: { id: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await adsController.getAdDetail(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await adsController.getAdDetail(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
