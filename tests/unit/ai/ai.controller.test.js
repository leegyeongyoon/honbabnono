/**
 * AI Controller Unit Tests
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

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"category": null, "keywords": ["test"]}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 }
        })
      }
    }
  }))
}));

const aiController = require('../../../server/modules/ai/controller');

describe('AI Controller', () => {
  let req, res;
  const mockUser = { id: 1, userId: 1, name: 'testuser' };

  beforeEach(() => {
    res = createMockResponse();
    resetMockQuery(mockPool);
    jest.clearAllMocks();
  });

  // aiSearch
  describe('aiSearch', () => {
    it('should return 400 if query is empty', async () => {
      req = createAuthenticatedRequest(mockUser, { body: { query: '' } });
      await aiController.aiSearch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return search results', async () => {
      req = createAuthenticatedRequest(mockUser, { body: { query: '강남 맛집' } });
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Test Meetup' }], rowCount: 1 });
      await aiController.aiSearch(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser, { body: { query: 'test' } });
      mockQueryError(mockPool, new Error('DB Error'));
      await aiController.aiSearch(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });

  // chatbot
  describe('chatbot', () => {
    it('should return 400 if message is empty', async () => {
      req = createAuthenticatedRequest(mockUser, { body: { message: '' } });
      await aiController.chatbot(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return chatbot response', async () => {
      req = createAuthenticatedRequest(mockUser, { body: { message: '안녕하세요' } });
      await aiController.chatbot(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // recommendMeetups
  describe('recommendMeetups', () => {
    it('should return recommended meetups', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [{ category: '한식' }], rowCount: 1 }); // history
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'Recommended' }], rowCount: 1 }); // meetups
      await aiController.recommendMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return recommendations for new user', async () => {
      req = createAuthenticatedRequest(mockUser);
      mockQueryOnce(mockPool, { rows: [], rowCount: 0 }); // no history
      mockQueryOnce(mockPool, { rows: [{ id: 1, title: 'New' }], rowCount: 1 }); // meetups
      await aiController.recommendMeetups(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 on error', async () => {
      const originalError = console.error;
      console.error = () => console.log('[에러 핸들링 테스트]');
      req = createAuthenticatedRequest(mockUser);
      mockQueryError(mockPool, new Error('DB Error'));
      await aiController.recommendMeetups(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      console.error = originalError;
    });
  });
});
