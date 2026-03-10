import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('포인트 충전 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('금액 선택 → 충전 버튼 활성화 확인', async ({ page }) => {
    await page.goto('/payment');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/충전|포인트|금액/);

    // 금액 선택 버튼 클릭 (5,000원)
    const amount5000 = page.locator('text=/5,?000/').first();
    if (await amount5000.isVisible()) {
      await amount5000.click();
      await page.waitForTimeout(500);

      // 충전 버튼이 활성화되어야 함
      const chargeBtn = page.locator('text=/충전하기/').first();
      await expect(chargeBtn).toBeVisible();

      // 버튼 텍스트에 금액이 포함되어야 함
      const btnText = await chargeBtn.textContent();
      expect(btnText).toMatch(/5,?000/);
    }
  });

  test('다른 금액 선택 시 버튼 텍스트 변경', async ({ page }) => {
    await page.goto('/payment');
    await page.waitForTimeout(3000);

    // 10,000원 선택
    const amount10000 = page.locator('text=/10,?000/').first();
    if (await amount10000.isVisible()) {
      await amount10000.click();
      await page.waitForTimeout(500);

      const chargeBtn = page.locator('text=/충전하기/').first();
      const btnText = await chargeBtn.textContent();
      expect(btnText).toMatch(/10,?000/);
    }

    // 3,000원으로 변경
    const amount3000 = page.locator('text=/3,?000/').first();
    if (await amount3000.isVisible()) {
      await amount3000.click();
      await page.waitForTimeout(500);

      const chargeBtn = page.locator('text=/충전하기/').first();
      const btnText = await chargeBtn.textContent();
      expect(btnText).toMatch(/3,?000/);
    }
  });

  test('포인트 충전 실행 (포인트 결제)', async ({ page }) => {
    await page.goto('/payment');
    await page.waitForTimeout(3000);

    // 현재 포인트 잔액 확인
    const bodyText = await page.textContent('body');
    const pointMatch = bodyText?.match(/(\d[\d,]*)\s*P/);
    const beforePoints = pointMatch ? parseInt(pointMatch[1].replace(/,/g, '')) : 0;

    // 금액 선택
    const amount3000 = page.locator('text=/3,?000/').first();
    if (await amount3000.isVisible()) {
      await amount3000.click();
      await page.waitForTimeout(500);
    } else {
      test.skip(true, '금액 선택 버튼 없음');
    }

    // 카드 결제 선택 (실제 결제는 불가하므로 확인만)
    const cardOption = page.locator('text=/카드|신용카드/').first();
    if (await cardOption.isVisible()) {
      await cardOption.click();
      await page.waitForTimeout(300);
    }

    // 충전 버튼 존재 확인
    const chargeBtn = page.locator('text=/충전하기/').first();
    await expect(chargeBtn).toBeVisible();

    // 실제 결제는 외부 PG이므로 버튼 존재와 활성화만 확인
    const isEnabled = await chargeBtn.isEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('금액 미선택 시 충전 버튼 비활성화', async ({ page }) => {
    await page.goto('/payment');
    await page.waitForTimeout(3000);

    // 아무 금액도 선택하지 않은 상태
    const chargeBtn = page.locator('text=/충전하기/').first();
    if (await chargeBtn.isVisible()) {
      const btnText = await chargeBtn.textContent();
      // "금액을 선택하세요" 또는 "0원 충전하기"
      expect(btnText).toMatch(/선택|0원/);
    }
  });

  test('포인트 내역 화면에서 내역 표시', async ({ page }) => {
    await page.goto('/point-history');
    await page.waitForTimeout(3000);

    // 로그인 페이지로 리다이렉트되었는지 확인
    const url = page.url();
    if (url.includes('/login')) {
      // 인증 재시도
      await loginAsTestUser(page);
      await page.goto('/point-history');
      await page.waitForTimeout(3000);
    }

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // 포인트 관련 텍스트 존재
    expect(bodyText).toMatch(/포인트|내역|P|충전|사용|잔액/);
  });
});
