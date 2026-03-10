import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('알림 화면', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('알림 화면 접근', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
