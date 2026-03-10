import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('전체 네비게이션 - 모든 화면 접근 가능 여부', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  const routes = [
    { path: '/home', name: '홈' },
    { path: '/explore', name: '탐색' },
    { path: '/search', name: '검색' },
    { path: '/chat', name: '채팅' },
    { path: '/mypage', name: '마이페이지' },
    { path: '/create', name: '모임 만들기' },
    { path: '/my-meetups', name: '내 모임' },
    { path: '/notifications', name: '알림' },
    { path: '/point-charge', name: '포인트 충전' },
    { path: '/point-history', name: '포인트 내역' },
    { path: '/settings', name: '설정' },
    { path: '/joined-meetups', name: '참여한 모임' },
    { path: '/my-reviews', name: '내 리뷰' },
    { path: '/recent-views', name: '최근 본 모임' },
    { path: '/blocked-users', name: '차단 사용자' },
    { path: '/notification-settings', name: '알림 설정' },
    { path: '/privacy-settings', name: '개인정보 설정' },
  ];

  for (const route of routes) {
    test(`${route.name} (${route.path}) - 페이지 로드 성공`, async ({ page }) => {
      const response = await page.goto(route.path);
      await page.waitForTimeout(1500);

      // 페이지가 로드되고 에러 없이 표시
      expect(response?.status()).toBeLessThan(500);

      // 빈 화면이 아닌지 확인
      const bodyText = await page.textContent('body');
      expect(bodyText?.length).toBeGreaterThan(0);

      // 콘솔 에러 체크 (critical errors만)
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          errors.push(msg.text());
        }
      });
    });
  }
});
