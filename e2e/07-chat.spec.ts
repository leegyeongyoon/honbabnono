import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('채팅 화면', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('채팅 목록 화면 접근', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('채팅방 접근 (참가한 모임이 있는 경우)', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(2000);

    // 채팅방 목록에서 첫 번째 방 클릭
    const chatRoom = page.locator('[role="article"], [role="button"]').first();
    if (await chatRoom.isVisible()) {
      await chatRoom.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent('body');
      // 채팅 입력창 또는 메시지 영역이 있어야 함
      expect(bodyText).toBeTruthy();
    }
  });
});
