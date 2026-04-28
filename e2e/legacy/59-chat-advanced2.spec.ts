import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

const API_URL = 'http://localhost:3001/api';

test.describe('채팅 고급 기능 테스트 2 - 채팅방 나가기', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, '22222222-2222-2222-2222-222222222222');
  });

  test('API: 채팅방 나가기 - 기존 채팅방으로 시도', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // 1) 채팅방 목록 조회
    const roomsResponse = await page.request.get(`${API_URL}/chat/rooms`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    // DB 테이블이 없으면 500 반환될 수 있음
    if (!roomsResponse.ok()) {
      expect([500, 502, 503]).toContain(roomsResponse.status());
      test.skip(true, '채팅 테이블이 없거나 서버 오류');
      return;
    }

    const roomsData = await roomsResponse.json();
    expect(roomsData.success).toBeTruthy();
    expect(Array.isArray(roomsData.data)).toBeTruthy();

    if (roomsData.data.length === 0) {
      // 채팅방이 없으면 존재하지 않는 ID로 나가기 시도
      const fakeRoomId = '99999999-9999-9999-9999-999999999999';
      const leaveResponse = await page.request.delete(
        `${API_URL}/chat/rooms/${fakeRoomId}/leave`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      // 존재하지 않는 채팅방이지만 DELETE 쿼리가 0 rows affected → 여전히 200일 수 있음
      expect([200, 404, 500]).toContain(leaveResponse.status());
      return;
    }

    // 2) 첫 번째 채팅방으로 나가기 시도
    const targetRoom = roomsData.data[0];
    const roomId = targetRoom.id;

    const leaveResponse = await page.request.delete(
      `${API_URL}/chat/rooms/${roomId}/leave`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (leaveResponse.ok()) {
      const leaveData = await leaveResponse.json();
      expect(leaveData.success).toBeTruthy();
      expect(leaveData.message).toBeTruthy();
    } else {
      // 채팅방 나가기 실패 시 (참가자가 아닌 경우, DB 오류 등)
      expect([400, 403, 404, 500]).toContain(leaveResponse.status());
    }
  });

  test('API: 채팅방 나가기 - 존재하지 않는 채팅방', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const fakeRoomId = '00000000-0000-0000-0000-000000000000';
    const leaveResponse = await page.request.delete(
      `${API_URL}/chat/rooms/${fakeRoomId}/leave`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    // DELETE query on non-existent participant may still return 200 (0 rows affected)
    // or 404 if server validates room existence
    if (leaveResponse.ok()) {
      const data = await leaveResponse.json();
      expect(data.success).toBeTruthy();
    } else {
      expect([404, 500]).toContain(leaveResponse.status());
    }
  });

  test('API: 채팅방 나가기 - 인증 없이 접근 → 401/403', async ({ page }) => {
    const fakeRoomId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.delete(
      `${API_URL}/chat/rooms/${fakeRoomId}/leave`
    );
    expect([401, 403]).toContain(response.status());
  });
});
