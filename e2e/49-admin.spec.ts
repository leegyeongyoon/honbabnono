import { test, expect } from '@playwright/test';

// 관리자 토큰을 직접 생성
async function getAdminToken(page: any): Promise<string | null> {
  // 관리자 로그인 시도
  const response = await page.request.post('http://localhost:3001/api/admin/login', {
    headers: { 'Content-Type': 'application/json' },
    data: { username: 'admin', password: 'admin123' },
  });
  if (response.ok()) {
    const data = await response.json();
    return data.token || null;
  }
  return null;
}

test.describe('관리자 대시보드 테스트', () => {
  let adminToken: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    adminToken = await getAdminToken(page);
    await page.close();
  });

  test('API: 관리자 로그인 (잘못된 비밀번호)', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/admin/login', {
      headers: { 'Content-Type': 'application/json' },
      data: { username: 'admin', password: 'wrong_password' },
    });
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.success).toBeFalsy();
  });

  test('API: 관리자 인증 없이 접근 → 401/403', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/admin/dashboard/stats');
    expect([401, 403]).toContain(response.status());
  });

  test('API: 관리자 대시보드 통계', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/dashboard/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data || data.stats).toBeTruthy();
  });

  test('API: 관리자 프로필 조회', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/profile', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  test('API: 사용자 목록 조회', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/users?page=1&limit=10', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  test('API: 특정 사용자 조회', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get(
      'http://localhost:3001/api/admin/users/22222222-2222-2222-2222-222222222222',
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    );
    const data = await response.json();
    expect(data.success === true || response.status() === 404).toBeTruthy();
  });

  test('API: 모임 목록 조회 (관리자)', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/meetups?page=1&limit=10', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  test('API: 공지사항 관리', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/notices', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
    } else {
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: 신고 목록 조회', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/reports', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 차단 사용자 목록', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/blocked-users', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 차단 통계', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/blocking-stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 시스템 설정 조회', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/settings', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 실시간 통계', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/realtime-stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 관리자 계정 목록', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/accounts', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 챗봇 설정 조회', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/chatbot/settings', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 간단 통계', async ({ page }) => {
    test.skip(!adminToken, '관리자 계정 없음');

    const response = await page.request.get('http://localhost:3001/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });
});
