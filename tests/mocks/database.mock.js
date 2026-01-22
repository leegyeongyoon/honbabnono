/**
 * Database Mock
 * PostgreSQL pool 목킹을 위한 유틸리티
 */

/**
 * Mock Pool 생성
 * @returns {Object} Mock pool 객체
 */
const createMockPool = () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  return {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn(),
    _mockClient: mockClient,
  };
};

/**
 * Mock Query 응답 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Array} responses - 순차적으로 반환할 응답 배열
 */
const mockQuery = (pool, responses) => {
  let callIndex = 0;
  pool.query.mockImplementation(() => {
    const response = responses[callIndex] || { rows: [], rowCount: 0 };
    callIndex++;
    return Promise.resolve(response);
  });
};

/**
 * Mock Query 초기화
 * @param {Object} pool - Mock pool 객체
 */
const resetMockQuery = (pool) => {
  pool.query.mockReset();
  pool.connect.mockReset();
  if (pool._mockClient) {
    pool._mockClient.query.mockReset();
    pool._mockClient.release.mockReset();
  }
};

/**
 * 트랜잭션 Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Array} responses - 트랜잭션 내 쿼리 응답 배열
 */
const mockTransaction = (pool, responses) => {
  let callIndex = 0;
  const mockClient = pool._mockClient;

  mockClient.query.mockImplementation((query) => {
    if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    const response = responses[callIndex] || { rows: [], rowCount: 0 };
    callIndex++;
    return Promise.resolve(response);
  });
};

module.exports = {
  createMockPool,
  mockQuery,
  resetMockQuery,
  mockTransaction,
};
