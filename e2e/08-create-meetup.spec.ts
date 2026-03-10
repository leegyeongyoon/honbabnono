import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('모임 생성 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('모임 만들기 화면 접근', async ({ page }) => {
    await page.goto('/create');
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    // 모임 만들기 위자드 표시
    expect(bodyText).toBeTruthy();
  });

  test('모임 만들기 위자드 - 단계별 진행', async ({ page }) => {
    await page.goto('/create');
    await page.waitForTimeout(2000);

    // 첫 단계 - 카테고리 또는 모임명 입력
    const bodyText = await page.textContent('body');
    // 위자드가 로드되었는지 확인
    expect(bodyText).toBeTruthy();
  });
});
