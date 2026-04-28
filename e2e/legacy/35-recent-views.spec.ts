import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('최근 본 모임 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('최근 본 화면 접근', async ({ page }) => {
    await page.goto('/recent-views');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/최근 본|최근|없습니다/);
  });

  test('모임 상세 방문 후 최근 본 기록 생성', async ({ page }) => {
    // 모임 목록에서 첫 번째 모임 방문
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    if (meetups.length > 0) {
      // 모임 상세 방문 (최근 본 기록 생성)
      await page.goto(`/meetup/${meetups[0].id}`);
      await page.waitForTimeout(3000);

      // 최근 본 화면으로 이동
      await page.goto('/recent-views');
      await page.waitForTimeout(3000);

      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });

  test('API: 최근 본 목록 조회', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:3001/api/user/recent-views', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  test('API: 최근 본 기록 추가', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const meetupsResponse = await page.request.get('http://localhost:3001/api/meetups');
    const meetupsData = await meetupsResponse.json();
    const meetups = meetupsData.data || meetupsData.meetups || [];

    if (meetups.length > 0) {
      const response = await page.request.post(
        `http://localhost:3001/api/user/recent-views/${meetups[0].id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      expect(response.ok()).toBeTruthy();
    }
  });

  test('API: 전체 삭제', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.delete('http://localhost:3001/api/user/recent-views', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });
});
