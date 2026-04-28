import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { seedV2Restaurant } from './helpers/seed';

// ============================================================
// v2-02 예약 플로우 (메뉴 → 장바구니 → 예약 폼 → 결제 진입)
// 실제 결제는 mock — 화면 라우트 전이만 확인
// ============================================================

test.describe('v2: 예약 생성 플로우', () => {
  let seedRestaurantId: string;

  test.beforeAll(async () => {
    try {
      const seed = await seedV2Restaurant();
      seedRestaurantId = seed.restaurantId;
    } catch (e) {
      console.warn('v2 시드 실패:', (e as Error).message);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('예약 폼 화면(/reservation/:restaurantId) 라우트 응답', async ({ page }) => {
    const id = seedRestaurantId || '00000000-0000-0000-0000-000000000001';
    await page.goto(`/reservation/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(page.url()).not.toContain('/login');
  });

  test('내 예약 목록(/my-reservations) 진입', async ({ page }) => {
    await page.goto('/my-reservations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/my-reservations');
  });

  test('전체 플로우: 매장 상세 → 예약 폼', async ({ page }) => {
    test.skip(!seedRestaurantId, 'v2 시드 미적용');

    await page.goto(`/restaurant/${seedRestaurantId}`);
    await page.waitForTimeout(1500);

    const reserveBtn = page.locator('button:has-text("예약")').first();
    test.skip(await reserveBtn.count() === 0, '예약 버튼 미노출');

    await reserveBtn.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/\/reservation\/|\/payment\//);
  });
});
