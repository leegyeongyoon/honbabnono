import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

// ============================================================
// v2-02 예약 플로우 (메뉴 → 장바구니 → 예약 폼 → 결제 진입)
// 실제 결제는 mock — 화면 라우트 전이만 확인
// ============================================================

test.describe('v2: 예약 생성 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('예약 폼 화면(/reservation/:restaurantId) 라우트 응답', async ({ page }) => {
    // 데모용 restaurantId. 데이터 없으면 빈 화면이지만 라우트 자체는 존재해야 함.
    const demoId = '00000000-0000-0000-0000-000000000001';
    await page.goto(`/reservation/${demoId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 로그인 리다이렉트가 아니어야 함
    expect(page.url()).not.toContain('/login');
  });

  test('내 예약 목록(/my-reservations) 진입', async ({ page }) => {
    await page.goto('/my-reservations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/my-reservations');
  });

  test('전체 플로우: 매장 → 메뉴 담기 → 예약 폼 → 결제 (데이터 의존 — skip 가능)', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForTimeout(1500);

    const cards = page.locator('a[href^="/restaurant/"]');
    const count = await cards.count();
    test.skip(count === 0, '매장 시드 데이터 없음');

    await cards.first().click();
    await page.waitForTimeout(1500);

    // 메뉴 추가 버튼 (텍스트 "+" 또는 "담기")이 있으면 클릭
    const addBtn = page.locator('button:has-text("담기"), button:has-text("+")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    // 예약하기 버튼 클릭 시도
    const reserveBtn = page.locator('button:has-text("예약")').first();
    test.skip(await reserveBtn.count() === 0, '예약 버튼 미노출');
    await reserveBtn.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/\/reservation\/|\/payment\//);
  });
});
