import { test, expect } from '@playwright/test';
import { loginAsTestUser, logout } from './helpers/auth';

test.describe('로그인/인증 플로우', () => {
  test('비로그인 시 로그인 페이지로 리다이렉트', async ({ page }) => {
    await page.goto('/home');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('로그인 페이지 렌더링 - 카카오 버튼 존재', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('카카오');
  });

  test('테스트 로그인 후 홈 화면 표시', async ({ page }) => {
    await loginAsTestUser(page);
    const url = page.url();
    // 홈으로 이동했거나 로그인이 아닌 페이지
    expect(url).not.toContain('/login');
  });

  test('로그아웃 후 로그인 페이지로 이동', async ({ page }) => {
    await loginAsTestUser(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });
});
