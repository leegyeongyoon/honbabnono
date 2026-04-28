import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { seedV2Restaurant } from './helpers/seed';

// ============================================================
// v2-01 매장 탐색 (홈 → 매장 카드 → 상세)
// ============================================================

test.describe('v2: 매장 탐색 플로우', () => {
  let seedRestaurantId: string;

  test.beforeAll(async () => {
    try {
      const seed = await seedV2Restaurant();
      seedRestaurantId = seed.restaurantId;
    } catch (e) {
      console.warn('v2 시드 실패 — API 서버 미기동일 수 있음:', (e as Error).message);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('매장 홈(/restaurants) 진입 → 카테고리/검색 영역 노출', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const anyCategory = page.locator('text=/전체|한식|일식|샤브샤브|매장/').first();
    await expect(anyCategory).toBeVisible({ timeout: 10000 });
  });

  test('매장 검색 페이지(/search-restaurants) 진입', async ({ page }) => {
    await page.goto('/search-restaurants');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const inputCount = await page.locator('input').count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test('매장 상세 화면 라우트 응답 (시드된 매장 ID로 직접 진입)', async ({ page }) => {
    test.skip(!seedRestaurantId, 'v2 시드 미적용');

    await page.goto(`/restaurant/${seedRestaurantId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 시드된 매장명("E2E 샤브샤브") 또는 메뉴명 노출 확인
    const detail = page.locator('text=/E2E 샤브샤브|샤브샤브|세트|메뉴/').first();
    await expect(detail).toBeVisible({ timeout: 10000 });
  });
});
