import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { seedV2Restaurant, getApiToken, createV2Reservation } from './helpers/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const V2_IDS = require('../tests/fixtures/v2-ids');

// ============================================================
// v2-02 예약 플로우 (메뉴 → 장바구니 → 예약 폼 → 결제 진입)
// 실제 결제는 mock — 화면 라우트 전이만 확인
// ============================================================

test.describe('v2: 예약 생성 플로우', () => {
  let seedRestaurantId: string;

  test.beforeAll(async () => {
    // 시드 실패는 인프라 문제 — 조용히 스킵하지 않고 suite 실패로 드러냄
    const seed = await seedV2Restaurant();
    seedRestaurantId = seed.restaurantId;
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('예약 폼 화면(/reservation/:restaurantId) 라우트 응답', async ({ page }) => {
    await page.goto(`/reservation/${seedRestaurantId}`);
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

  test('전체 플로우: 매장 상세 → 메뉴 담기 → 예약 폼', async ({ page }) => {
    await page.goto(`/restaurant/${seedRestaurantId}`);
    await page.waitForTimeout(1500);

    // 메뉴 "담기" → 하단 카트바("N개 메뉴 ...원 - 예약하기") 노출 → 클릭 → 예약 폼 전이
    const addBtn = page.locator('text=담기').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const cartBar = page.locator('text=/예약하기/').first();
    await expect(cartBar).toBeVisible({ timeout: 10000 });
    await cartBar.click();

    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/\/reservation\/|\/payment\//);
  });

  test('API 레벨: 예약 생성 → 내 예약 목록 화면에 노출', async ({ page }) => {
    // API로 예약을 만들고 (UI 입력 의존 최소화) 목록 화면에서 확인
    const token = await getApiToken(V2_IDS.TEST_USER_ID);
    const created = await createV2Reservation(token, seedRestaurantId);
    expect(created.reservation?.id ?? created.id).toBeTruthy();

    // 예약 생성자(USER1)로 로그인해야 목록에 보임 (beforeEach 기본값은 USER2)
    await loginAsTestUser(page, V2_IDS.TEST_USER_ID);
    await page.goto('/my-reservations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const card = page.locator('text=/E2E 샤브샤브/').first();
    await expect(card).toBeVisible({ timeout: 10000 });
  });
});
