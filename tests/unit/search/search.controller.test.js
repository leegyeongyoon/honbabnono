/**
 * Search Controller Unit Tests
 */

const {
  createMockResponse,
  createMockRequest,
} = require('../../helpers/response.helper');

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn()
}));

const axios = require('axios');
const searchController = require('../../../server/modules/search/controller');

describe('Search Controller', () => {
  let req, res;

  beforeEach(() => {
    res = createMockResponse();
    jest.clearAllMocks();
  });

  // searchAddress
  describe('searchAddress', () => {
    it('should return empty if query is too short', async () => {
      req = createMockRequest({ query: { query: 'a' } });
      await searchController.searchAddress(req, res);
      expect(res.json).toHaveBeenCalledWith({ documents: [] });
    });

    it('should return search results from Kakao API', async () => {
      req = createMockRequest({ query: { query: '강남역' } });

      axios.get.mockResolvedValueOnce({
        data: {
          documents: [{
            place_name: '강남역',
            address_name: '서울 강남구 역삼동',
            road_address_name: '서울 강남구 강남대로 390',
            x: '127.027610',
            y: '37.498095'
          }]
        }
      });
      axios.get.mockResolvedValueOnce({
        data: { documents: [] }
      });

      await searchController.searchAddress(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ documents: expect.any(Array) }));
    });

    it('should return dummy results if Kakao API fails', async () => {
      req = createMockRequest({ query: { query: '강남역' } });

      axios.get.mockRejectedValue(new Error('API Error'));

      await searchController.searchAddress(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ documents: expect.any(Array) }));
    });

    it('should return dummy results for common searches', async () => {
      req = createMockRequest({ query: { query: '맥도날드' } });

      axios.get.mockRejectedValue(new Error('API Error'));

      await searchController.searchAddress(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.documents.length).toBeGreaterThan(0);
    });

    it('should return dummy results for Starbucks search', async () => {
      req = createMockRequest({ query: { query: '스타벅스' } });

      axios.get.mockRejectedValue(new Error('API Error'));

      await searchController.searchAddress(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.documents.length).toBeGreaterThan(0);
    });

    it('should return dummy results for Hongdae search', async () => {
      req = createMockRequest({ query: { query: '홍대' } });

      axios.get.mockRejectedValue(new Error('API Error'));

      await searchController.searchAddress(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.documents.length).toBeGreaterThan(0);
    });

    it('should return dummy results for Sinchon search', async () => {
      req = createMockRequest({ query: { query: '신촌' } });

      axios.get.mockRejectedValue(new Error('API Error'));

      await searchController.searchAddress(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.documents.length).toBeGreaterThan(0);
    });

    it('should return generic dummy results for unknown queries', async () => {
      req = createMockRequest({ query: { query: '알수없는장소' } });

      axios.get.mockRejectedValue(new Error('API Error'));

      await searchController.searchAddress(req, res);
      const response = res.json.mock.calls[0][0];
      expect(response.documents.length).toBeGreaterThan(0);
    });
  });
});
