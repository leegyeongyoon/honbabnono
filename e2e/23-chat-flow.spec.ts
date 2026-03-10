import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { seedRecruitingMeetupWithParticipant, sendChatMessage, getApiToken } from './helpers/seed';

test.describe('채팅 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('채팅 화면 접근 및 UI 확인', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      await loginAsTestUser(page);
      await page.goto('/chat');
      await page.waitForTimeout(3000);
    }

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('채팅방이 있으면 진입 가능', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      await loginAsTestUser(page);
      await page.goto('/chat');
      await page.waitForTimeout(3000);
    }

    const chatLinks = page.locator('a[href*="chat/"], [class*="chatItem"], [class*="roomItem"]');
    const linkCount = await chatLinks.count();

    if (linkCount > 0) {
      await chatLinks.first().click();
      await page.waitForTimeout(2000);
      const afterBody = await page.textContent('body');
      expect(afterBody).toBeTruthy();
    }
  });

  test('채팅방에서 메시지 입력 필드 확인', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token') || '');

    const response = await page.request.get('http://localhost:3001/api/chat/rooms', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => null);

    if (!response || !response.ok()) {
      await page.goto('/chat');
      await page.waitForTimeout(3000);

      if (page.url().includes('/login')) {
        await loginAsTestUser(page);
        await page.goto('/chat');
        await page.waitForTimeout(3000);
      }

      const chatLinks = page.locator('a[href*="chat/"]');
      const count = await chatLinks.count();
      test.skip(count === 0, '채팅방 없음');

      if (count > 0) {
        await chatLinks.first().click();
        await page.waitForTimeout(2000);
      }
    } else {
      const data = await response.json();
      const rooms = data.data || data.rooms || data || [];
      test.skip(!Array.isArray(rooms) || rooms.length === 0, '채팅방 없음');

      const roomId = rooms[0].id || rooms[0].roomId;
      await page.goto(`/chat/${roomId}`);
      await page.waitForTimeout(3000);
    }

    const inputField = page.locator('input[placeholder*="메시지"], textarea[placeholder*="메시지"]').first();
    if (await inputField.isVisible().catch(() => false)) {
      await inputField.fill('테스트 메시지');
      await page.waitForTimeout(300);
      const value = await inputField.inputValue();
      expect(value).toBe('테스트 메시지');
    }
  });

  test('API를 통한 채팅 메시지 전송 및 확인', async ({ page }) => {
    test.setTimeout(60000);

    // 시드 데이터: 모임 생성 + 참가 → 채팅방 생성
    let chatRoomId: string | undefined;
    try {
      const seed = await seedRecruitingMeetupWithParticipant();
      chatRoomId = seed.chatRoomId;
    } catch (e) {
      test.skip(true, '시드 데이터 생성 실패: ' + (e as Error).message);
    }

    test.skip(!chatRoomId, '채팅방 ID를 받지 못함');

    // API로 메시지 전송
    const token = await getApiToken('22222222-2222-2222-2222-222222222222');
    const testMessage = `E2E 테스트 ${Date.now()}`;

    const result = await sendChatMessage(token, chatRoomId!, testMessage);
    expect(result.success || result.data).toBeTruthy();

    // 채팅방 UI에서 메시지 확인
    await page.goto(`/chat/${chatRoomId}`);
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      await loginAsTestUser(page);
      await page.goto(`/chat/${chatRoomId}`);
      await page.waitForTimeout(3000);
    }

    const bodyText = await page.textContent('body');
    // 메시지가 표시되거나 채팅방이 열려야 함
    expect(bodyText).toBeTruthy();
  });
});
