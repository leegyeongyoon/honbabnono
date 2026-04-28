import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

// ============================================================
// v2-01 매장 탐색 (홈 → 매장 카드 → 상세)
// ============================================================

test.describe('v2: 매장 탐색 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('매장 홈(/restaurants) 진입 → 카테고리/검색 영역 노출', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 카테고리 칩 중 하나 이상 노출(예: 전체/한식/일식)
    const anyCategory = page.locator('text=/전체|한식|일식|샤브샤브/').first();
    await expect(anyCategory).toBeVisible({ timeout: 10000 });
  });

  test('매장 검색 페이지(/search-restaurants) 진입', async ({ page }) => {
    await page.goto('/search-restaurants');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // 검색 인풋이 1개 이상 존재해야 함
    const inputCount = await page.locator('input').count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test('매장 상세 화면 라우트 응답 (데이터 없으면 skip)', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForTimeout(1500);

    // 매장 카드 클릭 가능한 요소가 없으면 skip
    const cards = page.locator('[role="button"], a[href^="/restaurant/"]');
    const count = await cards.count();
    test.skip(count === 0, '매장 데이터 없음(시드 미적용)');

    await cards.first().click();
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/restaurant/');
  });
});
