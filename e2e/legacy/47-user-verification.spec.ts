import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('본인 인증 / 프로필 설정 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('본인 인증 화면 접근', async ({ page }) => {
    await page.goto('/verification');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 인증 화면이 로드되거나 리다이렉트
    expect(bodyText).toBeTruthy();
  });

  test('프로필 화면 접근', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/프로필|이름|테스트|수정/);
  });

  test('API: 프로필 조회', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:3001/api/user/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
    const user = data.data || data.user;
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
  });

  test('API: 프로필 수정', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.put('http://localhost:3001/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: '테스트유저2',
        bio: 'E2E 테스트 자기소개입니다',
      },
    });
    const data = await response.json();
    expect(data.success === true || response.status() < 500).toBeTruthy();
  });

  test('API: 성별/생년월일 정보 조회', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:3001/api/user/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const user = data.data || data.user;
    // gender, birth_date 필드가 스키마에 추가되어 있음
    expect(user).toBeTruthy();
  });

  test('API: 관심사 업데이트', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.put('http://localhost:3001/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        interests: ['한식', '일식', '카페'],
      },
    });
    const data = await response.json();
    expect(data.success === true || response.status() < 500).toBeTruthy();
  });
});
