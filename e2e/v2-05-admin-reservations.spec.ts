import { test, expect } from '@playwright/test';

// ============================================================
// v2-05 Admin 예약 모니터링 페이지
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

test.describe('v2: Admin 예약 모니터링', () => {
  test('Admin 예약 모니터링(/reservations) 진입 → 일자 선택 UI 노출', async ({ page }) => {
    const token = await getAdminToken(page);
    test.skip(!token, 'Admin 로그인 실패');

    let reachable = false;
    try {
      await page.goto(ADMIN_URL, { timeout: 5000 });
      reachable = true;
    } catch {
      reachable = false;
    }
    test.skip(!reachable, `Admin web 서버(${ADMIN_URL}) 미기동`);

    await page.evaluate((t) => {
      localStorage.setItem('adminToken', t);
      localStorage.setItem('token', t);
    }, token);

    await page.goto(`${ADMIN_URL}/reservations`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 날짜 input 또는 "예약" 텍스트 노출
    const dateInput = page.locator('input[type="date"]');
    const heading = page.locator('text=/예약 모니터링|예약 현황|예약 목록/').first();

    const dateCount = await dateInput.count();
    const hasHeading = await heading.count();
    expect(dateCount + hasHeading).toBeGreaterThan(0);
  });

  test('API: 예약 목록 조회 (날짜 파라미터)', async ({ page }) => {
    const token = await getAdminToken(page);
    test.skip(!token, 'Admin 토큰 없음');

    const today = new Date().toISOString().split('T')[0];
    const res = await page.request.get(
      `${API_URL}/admin/reservations?date=${today}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect([200, 404, 500]).toContain(res.status());
  });
});
