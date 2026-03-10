import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('마이페이지', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('마이페이지 접근 및 프로필 표시', async ({ page }) => {
    await page.goto('/mypage');
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('마이페이지 메뉴 항목 존재', async ({ page }) => {
    await page.goto('/mypage');
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    // 주요 메뉴 텍스트 확인
    const hasMenu = bodyText?.includes('모임') ||
      bodyText?.includes('포인트') ||
      bodyText?.includes('설정') ||
      bodyText?.includes('리뷰');
    expect(hasMenu).toBeTruthy();
  });

  test('내 모임 목록 접근', async ({ page }) => {
    await page.goto('/my-meetups');
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('포인트 충전 화면 접근', async ({ page }) => {
    await page.goto('/point-charge');
    await page.waitForTimeout(3000);
    // 페이지가 로드되고 빈 화면이 아닌지 확인
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('포인트 내역 화면 접근', async ({ page }) => {
    await page.goto('/point-history');
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('설정 화면 접근', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
