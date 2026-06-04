/**
 * v2 테스트 시드 ID 단일 소스 (Single Source of Truth)
 *
 * 사용처:
 * - server/modules/auth/controller.js (testSeedV2 — POST /api/auth/test-seed-v2)
 * - e2e/helpers/seed.ts (Playwright 시드)
 *
 * 주의: 이 값들을 바꾸면 양쪽이 함께 바뀜 — 하드코딩 중복 금지.
 */
module.exports = {
  TEST_USER_ID: '11111111-1111-1111-1111-111111111111', // E2E 호스트(고객)
  TEST_USER_2_ID: '22222222-2222-2222-2222-222222222222', // E2E 게스트
  TEST_MERCHANT_USER_ID: '33333333-3333-3333-3333-333333333333', // E2E 점주 계정
  // 주의: zod .uuid() 검증(RFC 4122)을 통과해야 함 — version/variant 비트 유효한 형식 사용
  TEST_RESTAURANT_ID: '99999999-1111-4111-8111-111111111111', // E2E 매장
  TEST_MERCHANT_ID: '99999999-2222-4222-8222-222222222222', // E2E merchant 레코드
};
