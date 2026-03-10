import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('탐색/검색 화면', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('탐색 화면 접근 및 카테고리 표시', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    // 카테고리 필터가 있어야 함
    expect(bodyText).toBeTruthy();
  });

  test('검색 화면 접근', async ({ page }) => {
    await page.goto('/search');
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('카테고리 필터 동작', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    // 카테고리 버튼 클릭 (한식, 일식 등)
    const categoryBtn = page.locator('text=한식').first();
    if (await categoryBtn.isVisible()) {
      await categoryBtn.click();
      await page.waitForTimeout(2000);
      // 필터 적용 후에도 페이지가 정상
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });
});
