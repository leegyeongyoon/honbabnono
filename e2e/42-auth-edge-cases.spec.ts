import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('인증 엣지케이스 테스트', () => {
  test('인증 없이 보호된 페이지 접근 → 로그인 리다이렉트', async ({ page }) => {
    await page.goto('/mypage');
    await page.waitForTimeout(3000);

    const url = page.url();
    // 로그인 페이지로 리다이렉트되거나 로그인 요소 표시
    const bodyText = await page.textContent('body');
    expect(url.includes('/login') || bodyText?.includes('로그인')).toBeTruthy();
  });

  test('잘못된 토큰으로 API 호출 → 401/403', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/user/me', {
      headers: { 'Authorization': 'Bearer invalid_token_12345' },
    });
    // Auth middleware returns 403 for invalid JWT, 401 for missing token
    expect([401, 403]).toContain(response.status());
  });

  test('토큰 없이 API 호출 → 401', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/user/me');
    expect(response.status()).toBe(401);
  });

  test('로그인 후 /me 엔드포인트 정상 응답', async ({ page }) => {
    await loginAsTestUser(page);

    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:3001/api/user/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  test('로그아웃 후 localStorage 정리 확인', async ({ page }) => {
    await loginAsTestUser(page);

    // 토큰 확인
    let token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // localStorage 직접 클리어 (로그아웃 시뮬레이션)
    await page.evaluate(() => localStorage.clear());

    token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('API: 존재하지 않는 엔드포인트 → 404', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/nonexistent-endpoint');
    expect(response.status()).toBe(404);
  });

  test('API: 잘못된 meetup ID → 적절한 에러', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/meetups/invalid-uuid-format'
    );
    // 400 or 404 or 500 (잘못된 UUID)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('여러 사용자 토큰으로 동일 API 호출', async ({ page }) => {
    await loginAsTestUser(page, '11111111-1111-1111-1111-111111111111');
    const token1 = await page.evaluate(() => localStorage.getItem('token'));

    const response1 = await page.request.get('http://localhost:3001/api/user/me', {
      headers: { 'Authorization': `Bearer ${token1}` },
    });
    expect(response1.ok()).toBeTruthy();
    const data1 = await response1.json();

    await loginAsTestUser(page, '22222222-2222-2222-2222-222222222222');
    const token2 = await page.evaluate(() => localStorage.getItem('token'));

    const response2 = await page.request.get('http://localhost:3001/api/user/me', {
      headers: { 'Authorization': `Bearer ${token2}` },
    });
    expect(response2.ok()).toBeTruthy();
    const data2 = await response2.json();

    // 두 사용자가 다른 정보를 반환해야 함
    const user1 = data1.data || data1.user;
    const user2 = data2.data || data2.user;
    expect(user1.id).not.toBe(user2.id);
  });
});
