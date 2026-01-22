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
 * 단일 응답 Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Object} response - 반환할 응답
 */
const mockQueryOnce = (pool, response) => {
  pool.query.mockResolvedValueOnce(response);
};

/**
 * 에러 Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Error|string} error - 발생할 에러
 */
const mockQueryError = (pool, error) => {
  const err = typeof error === 'string' ? new Error(error) : error;
  pool.query.mockRejectedValueOnce(err);
};

/**
 * 사용자 조회 Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Object|null} user - 사용자 데이터 (null이면 없음)
 */
const mockFindUser = (pool, user) => {
  if (user) {
    mockQueryOnce(pool, { rows: [user], rowCount: 1 });
  } else {
    mockQueryOnce(pool, { rows: [], rowCount: 0 });
  }
};

/**
 * 목록 조회 Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Array} items - 아이템 배열
 * @param {number} total - 전체 개수 (선택)
 */
const mockFindMany = (pool, items, total = null) => {
  mockQueryOnce(pool, { rows: items, rowCount: items.length });
  if (total !== null) {
    mockQueryOnce(pool, { rows: [{ count: total.toString() }], rowCount: 1 });
  }
};

/**
 * INSERT Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Object} insertedRow - 삽입된 행 데이터
 */
const mockInsert = (pool, insertedRow) => {
  mockQueryOnce(pool, { rows: [insertedRow], rowCount: 1 });
};

/**
 * UPDATE Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Object|null} updatedRow - 업데이트된 행 (null이면 영향 없음)
 */
const mockUpdate = (pool, updatedRow) => {
  if (updatedRow) {
    mockQueryOnce(pool, { rows: [updatedRow], rowCount: 1 });
  } else {
    mockQueryOnce(pool, { rows: [], rowCount: 0 });
  }
};

/**
 * DELETE Mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {number} deletedCount - 삭제된 행 수
 */
const mockDelete = (pool, deletedCount = 1) => {
  mockQueryOnce(pool, { rows: [], rowCount: deletedCount });
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
  // connect mock 재설정 - mockReset 후에도 동작하도록
  pool.connect.mockResolvedValue(pool._mockClient);
  if (pool._mockClient) {
    pool._mockClient.query.mockReset();
    pool._mockClient.release.mockReset();
  }
};

/**
 * 트랜잭션 Mock 설정 (기존 - 하위 호환성)
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

/**
 * 트랜잭션 Mock 설정 (개선 버전)
 * - pool.connect()가 mockClient를 반환하도록 보장
 * - client.query()가 순차적으로 응답을 반환하도록 설정
 * - BEGIN, COMMIT, ROLLBACK은 빈 응답
 *
 * @param {Object} pool - Mock pool 객체
 * @param {Array} queryResponses - 트랜잭션 내 쿼리 응답 배열
 */
const setupTransactionMock = (pool, queryResponses) => {
  const mockClient = pool._mockClient;
  let queryIndex = 0;

  // 1. connect가 mockClient 반환하도록 설정
  pool.connect.mockResolvedValue(mockClient);

  // 2. client.query mock 설정
  mockClient.query.mockImplementation((query) => {
    // BEGIN, COMMIT, ROLLBACK은 빈 응답
    if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    // 순차적으로 응답 반환
    const response = queryResponses[queryIndex];
    queryIndex++;
    if (!response) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve(response);
  });

  // 3. release mock
  mockClient.release.mockResolvedValue(undefined);
};

/**
 * Client Query를 위한 Mock 설정
 * pool.connect() 후 client.query()를 위한 mock 설정
 * @param {Object} pool - Mock pool 객체
 * @param {Array} responses - client.query 응답 배열
 */
const mockClientQuery = (pool, responses) => {
  const mockClient = pool._mockClient;
  let callIndex = 0;

  pool.connect.mockResolvedValue(mockClient);

  mockClient.query.mockImplementation(() => {
    const response = responses[callIndex] || { rows: [], rowCount: 0 };
    callIndex++;
    return Promise.resolve(response);
  });

  mockClient.release.mockResolvedValue(undefined);
};

module.exports = {
  createMockPool,
  mockQuery,
  mockQueryOnce,
  mockQueryError,
  mockFindUser,
  mockFindMany,
  mockInsert,
  mockUpdate,
  mockDelete,
  resetMockQuery,
  mockTransaction,
  setupTransactionMock,
  mockClientQuery,
};
