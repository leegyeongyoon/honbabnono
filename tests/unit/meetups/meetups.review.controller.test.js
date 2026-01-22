/**
 * Meetups Review Controller Unit Tests
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

// Mock helpers
jest.mock('../../../server/modules/meetups/helpers/validation.helper', () => ({
  validateMeetupExists: jest.fn(),
  validateParticipant: jest.fn(),
  validateRating: jest.fn((rating) => ({
    valid: rating >= 1 && rating <= 5,
    error: rating >= 1 && rating <= 5 ? null : '평점은 1-5 사이여야 합니다',
  })),
}));

jest.mock('../../../server/modules/meetups/helpers/query.helper', () => ({
  buildPagination: jest.fn((page, limit) => ({
    offset: (parseInt(page) - 1) * parseInt(limit),
    limit: parseInt(limit),
  })),
}));

const { validateParticipant, validateRating } = require('../../../server/modules/meetups/helpers/validation.helper');
const reviewController = require('../../../server/modules/meetups/controllers/review.controller');

describe('Meetups Review Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // createReview
  describe('createReview', () => {
    it('should create review successfully', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { rating: 5, comment: 'Great meetup!', tags: ['좋아요'] },
      });

      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Meetup', host_id: 2, date: pastDate }],
        rowCount: 1,
      }); // meetup
      validateParticipant.mockResolvedValueOnce({ isParticipant: true });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // no existing review
      mockQueryOnce(mockPool, { rows: [{ name: 'testuser' }], rowCount: 1 }); // user
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, rating: 5, comment: 'Great!', tags: '["좋아요"]' }],
        rowCount: 1,
      }); // review insert
      mockQueryOnce(mockPool, { rows: [{ avg_rating: 4.5 }], rowCount: 1 }); // avg rating
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // update user

      await reviewController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if invalid rating', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { rating: 10, comment: 'Test' },
      });
      await reviewController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '999' },
        body: { rating: 5 },
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await reviewController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if meetup not completed', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { rating: 5 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Meetup', host_id: 2, date: futureDate }],
        rowCount: 1,
      });
      await reviewController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if not participant', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { rating: 5 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Meetup', host_id: 2, date: pastDate }],
        rowCount: 1,
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: false });
      await reviewController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if already reviewed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { rating: 5 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, title: 'Meetup', host_id: 2, date: pastDate }],
        rowCount: 1,
      });
      validateParticipant.mockResolvedValueOnce({ isParticipant: true });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // existing review
      await reviewController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { rating: 5 },
      });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // getReviews
  describe('getReviews', () => {
    it('should return reviews list', async () => {
      req = createMockRequest({
        params: { id: '1' },
        query: { page: 1, limit: 10 },
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, rating: 5, comment: 'Great', tags: '[]' }],
        rowCount: 1,
      }); // reviews
      mockQueryOnce(mockPool, { rows: [{ total: '5' }], rowCount: 1 }); // count
      mockQueryOnce(mockPool, { rows: [{ avg_rating: 4.5, review_count: '5' }], rowCount: 1 }); // stats
      await reviewController.getReviews(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createMockRequest({
        params: { id: '1' },
        query: {},
      });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewController.getReviews(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // getReviewableParticipants
  describe('getReviewableParticipants', () => {
    it('should return reviewable participants', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, status: '완료', date: new Date('2024-01-01') }],
        rowCount: 1,
      });
      mockQueryOnce(mockPool, {
        rows: [{ id: 2, name: 'User2', is_host: false }],
        rowCount: 1,
      });
      await reviewController.getReviewableParticipants(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if meetup not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await reviewController.getReviewableParticipants(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if meetup not completed', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, {
        rows: [{ id: 1, status: '모집중', date: futureDate }],
        rowCount: 1,
      });
      await reviewController.getReviewableParticipants(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');

      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewController.getReviewableParticipants(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });
});
