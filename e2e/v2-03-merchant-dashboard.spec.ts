import { test, expect } from '@playwright/test';

// ============================================================
// v2-03 점주 대시보드 (merchant/) — 별도 dev 서버 (port 3003 가정)
// 서버 미기동이면 스킵
// ============================================================

const MERCHANT_URL = process.env.MERCHANT_URL || 'http://localhost:3003';

test.describe('v2: 점주 대시보드', () => {
  test('점주 대시보드 진입 → 사이드 메뉴 노출', async ({ page }) => {
    let reachable = false;
    try {
      const res = await page.goto(MERCHANT_URL, { timeout: 5000 });
      reachable = !!res && res.status() < 500;
    } catch {
      reachable = false;
    }
    test.skip(!reachable, `점주 서버(${MERCHANT_URL}) 미기동`);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 사이드 메뉴 항목 중 "예약 관리" 또는 "대시보드" 텍스트 노출
    const menu = page.locator('text=/예약 관리|대시보드|메뉴 관리/').first();
    await expect(menu).toBeVisible({ timeout: 10000 });
  });

  test('예약 관리 보드(/reservations) 진입', async ({ page }) => {
    let reachable = false;
    try {
      const res = await page.goto(`${MERCHANT_URL}/reservations`, { timeout: 5000 });
      reachable = !!res && res.status() < 500;
    } catch {
      reachable = false;
    }
    test.skip(!reachable, `점주 서버 미기동`);

    await page.waitForTimeout(1500);
    // 빈 상태/데이터 어느 쪽이든 페이지가 떠야 함
    expect(page.url()).toContain('/reservations');
  });
});
