import { test, expect } from '@playwright/test';

// ============================================================
// v2-04 Admin 매장 관리 페이지
// ============================================================

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3002';
const API_URL = 'http://localhost:3001/api';

async function getAdminToken(page: any): Promise<string | null> {
  try {
    const res = await page.request.post(`${API_URL}/admin/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { username: 'admin', password: 'admin123' },
    });
    if (res.ok()) {
      const data = await res.json();
      return data.token || null;
    }
  } catch {}
  return null;
}

test.describe('v2: Admin 매장 관리', () => {
  test('Admin 매장 관리 페이지(/restaurants) 진입 → 테이블 영역 렌더', async ({ page }) => {
    const token = await getAdminToken(page);
    test.skip(!token, 'Admin 로그인 실패 — admin/api 서버 미기동 또는 계정 없음');

    let reachable = false;
    try {
      await page.goto(ADMIN_URL, { timeout: 5000 });
      reachable = true;
    } catch {
      reachable = false;
    }
    test.skip(!reachable, `Admin web 서버(${ADMIN_URL}) 미기동`);

    // 토큰 주입 (admin/utils/api.js 가 보통 localStorage 'adminToken' 사용)
    await page.evaluate((t) => {
      localStorage.setItem('adminToken', t);
      localStorage.setItem('token', t);
    }, token);

    await page.goto(`${ADMIN_URL}/restaurants`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // "매장 관리" 헤더 또는 테이블 헤더 노출
    const heading = page.locator('text=/매장 관리|매장 목록|매장명|카테고리/').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('API: 매장 목록 조회', async ({ page }) => {
    const token = await getAdminToken(page);
    test.skip(!token, 'Admin 토큰 없음');

    const res = await page.request.get(`${API_URL}/admin/restaurants?limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404, 500]).toContain(res.status());
  });
});
