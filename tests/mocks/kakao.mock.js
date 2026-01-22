/**
 * Kakao OAuth Mock
 * 카카오 로그인 API 목킹
 */

const mockKakaoToken = {
  access_token: 'mock-kakao-access-token-12345',
  token_type: 'bearer',
  refresh_token: 'mock-kakao-refresh-token-67890',
  expires_in: 21599,
  scope: 'account_email profile_nickname profile_image',
  refresh_token_expires_in: 5183999,
};

const mockKakaoUser = {
  id: 123456789,
  connected_at: '2024-01-01T00:00:00Z',
  kakao_account: {
    profile_nickname_needs_agreement: false,
    profile_image_needs_agreement: false,
    profile: {
      nickname: '테스트유저',
      thumbnail_image_url: 'https://example.com/thumb.jpg',
      profile_image_url: 'https://example.com/profile.jpg',
      is_default_image: false,
    },
    has_email: true,
    email_needs_agreement: false,
    is_email_valid: true,
    is_email_verified: true,
    email: 'test@kakao.com',
  },
};

/**
 * Axios mock 설정 (카카오 API용)
 */
const setupKakaoMock = () => {
  jest.doMock('axios', () => ({
    post: jest.fn((url) => {
      if (url.includes('kauth.kakao.com/oauth/token')) {
        return Promise.resolve({ data: mockKakaoToken });
      }
      return Promise.reject(new Error('Unknown URL'));
    }),
    get: jest.fn((url) => {
      if (url.includes('kapi.kakao.com/v2/user/me')) {
        return Promise.resolve({ data: mockKakaoUser });
      }
      return Promise.reject(new Error('Unknown URL'));
    }),
  }));
};

/**
 * 카카오 유저 데이터 커스텀 생성
 * @param {Object} overrides - 덮어쓸 속성
 */
const createMockKakaoUser = (overrides = {}) => ({
  ...mockKakaoUser,
  kakao_account: {
    ...mockKakaoUser.kakao_account,
    ...overrides.kakao_account,
    profile: {
      ...mockKakaoUser.kakao_account.profile,
      ...(overrides.kakao_account?.profile || {}),
    },
  },
  ...overrides,
});

module.exports = {
  mockKakaoToken,
  mockKakaoUser,
  setupKakaoMock,
  createMockKakaoUser,
};
