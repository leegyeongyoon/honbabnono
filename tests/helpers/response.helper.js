/**
 * Response Mock Helper
 * Express res 객체 목킹을 위한 유틸리티
 */

/**
 * Mock Response 생성
 * @returns {Object} Mock res 객체
 */
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    _data: null,
    _headers: {},
  };

  res.status = jest.fn().mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });

  res.json = jest.fn().mockImplementation((data) => {
    res._data = data;
    return res;
  });

  res.send = jest.fn().mockImplementation((data) => {
    res._data = data;
    return res;
  });

  res.setHeader = jest.fn().mockImplementation((key, value) => {
    res._headers[key] = value;
    return res;
  });

  res.redirect = jest.fn().mockImplementation((url) => {
    res._redirectUrl = url;
    return res;
  });

  res.cookie = jest.fn().mockReturnThis();
  res.clearCookie = jest.fn().mockReturnThis();
  res.end = jest.fn().mockReturnThis();

  return res;
};

/**
 * Mock Request 생성
 * @param {Object} options - 요청 옵션
 * @returns {Object} Mock req 객체
 */
const createMockRequest = (options = {}) => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    userId: options.userId || options.user?.id || null,
    admin: options.admin || null,
    cookies: options.cookies || {},
    ip: options.ip || '127.0.0.1',
    method: options.method || 'GET',
    path: options.path || '/',
    file: options.file || null,
    get: jest.fn().mockImplementation((header) => {
      return options.headers?.[header.toLowerCase()] || null;
    }),
  };
};

/**
 * 인증된 Mock Request 생성
 * @param {Object} user - 사용자 정보
 * @param {Object} options - 추가 옵션
 * @returns {Object} Mock req 객체
 */
const createAuthenticatedRequest = (user, options = {}) => {
  return createMockRequest({
    ...options,
    user,
    userId: user.id,
    headers: {
      ...options.headers,
      authorization: `Bearer test-token`,
    },
  });
};

/**
 * Response 검증 헬퍼
 * @param {Object} res - Mock res 객체
 * @param {number} expectedStatus - 예상 상태 코드
 * @param {Object} expectedData - 예상 데이터 (부분 매칭)
 */
const expectResponse = (res, expectedStatus, expectedData = null) => {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  if (expectedData) {
    expect(res.json).toHaveBeenCalled();
    const actualData = res.json.mock.calls[0][0];
    expect(actualData).toMatchObject(expectedData);
  }
};

/**
 * 성공 응답 검증
 * @param {Object} res - Mock res 객체
 * @param {Object} additionalData - 추가 검증 데이터
 */
const expectSuccess = (res, additionalData = {}) => {
  expect(res.json).toHaveBeenCalled();
  const data = res.json.mock.calls[0][0];
  expect(data.success).toBe(true);
  if (Object.keys(additionalData).length > 0) {
    expect(data).toMatchObject(additionalData);
  }
};

/**
 * 에러 응답 검증
 * @param {Object} res - Mock res 객체
 * @param {number} expectedStatus - 예상 상태 코드
 * @param {string|RegExp} errorMessage - 에러 메시지 (선택)
 */
const expectError = (res, expectedStatus, errorMessage = null) => {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
  expect(res.json).toHaveBeenCalled();
  const data = res.json.mock.calls[0][0];
  expect(data.success).toBe(false);
  if (errorMessage) {
    if (errorMessage instanceof RegExp) {
      expect(data.error).toMatch(errorMessage);
    } else {
      expect(data.error).toContain(errorMessage);
    }
  }
};

module.exports = {
  createMockResponse,
  createMockRequest,
  createAuthenticatedRequest,
  expectResponse,
  expectSuccess,
  expectError,
};
