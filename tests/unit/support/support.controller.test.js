/**
 * Support Controller Unit Tests
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

const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

const supportController = require('../../../server/modules/support/controller');

describe('Support Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // getFaq
  describe('getFaq', () => {
    it('should return FAQ list', async () => {
      req = createMockRequest({ query: {} });
      mockQueryOnce(mockPool, { rows: [{ id: 1, question: 'How?', answer: 'Like this' }], rowCount: 1 });
      await supportController.getFaq(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter by category', async () => {
      req = createMockRequest({ query: { category: '일반' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await supportController.getFaq(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await supportController.getFaq(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // createInquiry
  describe('createInquiry', () => {
    it('should create inquiry successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { subject: 'Help', content: 'Need help' }
      });
      mockQueryOnce(mockPool, { rows: [{ id: 1, subject: 'Help' }], rowCount: 1 });
      await supportController.createInquiry(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 if subject/content missing', async () => {
      req = createAuthenticatedRequest(mockUser, { body: {} });
      await supportController.createInquiry(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { subject: 'Help', content: 'Need help' }
      });
      mockQueryError(mockPool, new Error('DB Error'));
      await supportController.createInquiry(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getMyInquiries
  describe('getMyInquiries', () => {
    it('should return my inquiries', async () => {
      req = createAuthenticatedRequest(mockUser, { query: {} });
      mockQueryOnce(mockPool, { rows: [{ count: '5' }], rowCount: 1 }); // count
      mockQueryOnce(mockPool, { rows: [{ id: 1, subject: 'Help' }], rowCount: 1 }); // data
      await supportController.getMyInquiries(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createAuthenticatedRequest(mockUser, { query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await supportController.getMyInquiries(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getTerms
  describe('getTerms', () => {
    it('should return terms of service', async () => {
      req = createMockRequest();
      mockQueryOnce(mockPool, { rows: [{ version: '1.0', content: 'Terms...' }], rowCount: 1 });
      await supportController.getTerms(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not found', async () => {
      req = createMockRequest();
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await supportController.getTerms(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createMockRequest();
      mockQueryError(mockPool, new Error('DB Error'));
      await supportController.getTerms(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getPrivacyPolicy
  describe('getPrivacyPolicy', () => {
    it('should return privacy policy', async () => {
      req = createMockRequest();
      mockQueryOnce(mockPool, { rows: [{ version: '1.0', content: 'Privacy...' }], rowCount: 1 });
      await supportController.getPrivacyPolicy(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not found', async () => {
      req = createMockRequest();
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await supportController.getPrivacyPolicy(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createMockRequest();
      mockQueryError(mockPool, new Error('DB Error'));
      await supportController.getPrivacyPolicy(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getAppInfo
  describe('getAppInfo', () => {
    it('should return app info', async () => {
      req = createMockRequest();
      await supportController.getAppInfo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ version: '1.0.0' })
      }));
    });
  });

  // getNotices
  describe('getNotices', () => {
    it('should return notices', async () => {
      req = createMockRequest();
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Notice' }], rowCount: 1 });
      await supportController.getNotices(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      req = createMockRequest();
      mockQueryError(mockPool, new Error('DB Error'));
      await supportController.getNotices(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // getNoticeById
  describe('getNoticeById', () => {
    it('should return notice by id', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // view count update
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Notice' }], rowCount: 1 });
      await supportController.getNoticeById(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not found', async () => {
      req = createMockRequest({ params: { id: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // view count update
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await supportController.getNoticeById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      req = createMockRequest({ params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await supportController.getNoticeById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
