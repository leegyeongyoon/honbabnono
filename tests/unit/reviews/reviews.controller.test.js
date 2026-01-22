/**
 * Reviews Controller Unit Tests
 */

const {
  createMockPool,
  mockQueryOnce,
  mockQueryError,
  resetMockQuery,
} = require('../../mocks/database.mock');

const {
  createMockResponse,
  createAuthenticatedRequest,
} = require('../../helpers/response.helper');

const mockPool = createMockPool();
jest.mock('../../../server/config/database', () => mockPool);

const reviewsController = require('../../../server/modules/reviews/controller');

describe('Reviews Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // getMeetupReviews
  describe('getMeetupReviews', () => {
    it('should return meetup reviews', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { meetupId: '1' }, query: {} });
      mockQueryOnce(mockPool, { rows: [{ id: 1, rating: 5, content: 'Great!' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [{ total: '1' }], rowCount: 1 });
      await reviewsController.getMeetupReviews(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { params: { meetupId: '1' }, query: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewsController.getMeetupReviews(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // createReview
  describe('createReview', () => {
    it('should create review successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { meetupId: '1', rating: 5, content: 'Great!' }
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // No existing review
      mockQueryOnce(mockPool, { rows: [{ meetup_id: '1' }], rowCount: 1 }); // Participant check
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // Insert
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if already reviewed', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { meetupId: '1', rating: 5, content: 'Great!' }
      });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 }); // Existing review
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if not participant', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { meetupId: '1', rating: 5, content: 'Great!' }
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // No existing review
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // Not participant
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { body: { meetupId: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewsController.createReview(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // updateReview
  describe('updateReview', () => {
    it('should update review successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '1' },
        body: { rating: 4, content: 'Updated' }
      });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });
      await reviewsController.updateReview(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { id: '999' },
        body: { rating: 4 }
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await reviewsController.updateReview(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' }, body: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewsController.updateReview(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // deleteReview
  describe('deleteReview', () => {
    it('should delete review successfully', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });
      await reviewsController.deleteReview(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not found', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { id: '999' } });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await reviewsController.deleteReview(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { params: { id: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewsController.deleteReview(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // rateParticipant
  describe('rateParticipant', () => {
    it('should rate participant successfully', async () => {
      req = createAuthenticatedRequest(mockUser, {
        body: { meetupId: '1', targetUserId: '2', rating: 5, comment: 'Good' }
      });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [], rowCount: 1 }); // Update user rating
      await reviewsController.rateParticipant(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { body: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewsController.rateParticipant(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // getUserReviewStats
  describe('getUserReviewStats', () => {
    it('should return user review stats', async () => {
      req = createAuthenticatedRequest(mockUser, { params: { userId: '1' } });
      mockQueryOnce(mockPool, { rows: [{ total_reviews: '10', average_rating: '4.5' }], rowCount: 1 });
      mockQueryOnce(mockPool, { rows: [{ tag: 'friendly', count: '5' }], rowCount: 1 });
      await reviewsController.getUserReviewStats(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { params: { userId: '1' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewsController.getUserReviewStats(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // featureReview
  describe('featureReview', () => {
    it('should feature review', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { reviewId: '1' },
        body: { featured: true }
      });
      mockQueryOnce(mockPool, { rows: [{ id: 1 }], rowCount: 1 });
      await reviewsController.featureReview(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 if not found', async () => {
      req = createAuthenticatedRequest(mockUser, {
        params: { reviewId: '999' },
        body: { featured: true }
      });
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 });
      await reviewsController.featureReview(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { params: { reviewId: '1' }, body: {} });
      mockQueryError(mockPool, new Error('DB Error'));
      await reviewsController.featureReview(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });
});
