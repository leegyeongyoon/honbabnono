import { test } from '@playwright/test';

// 프로덕션 실제 화면 캡처 (PROD=1 전용)
// 결과: /tmp/prod-shots/*.png
const OUT = '/tmp/prod-shots';
const MERCHANT = 'https://merchant.eattable.kr';
const ADMIN = 'https://admin.eattable.kr';
const API = 'https://eattable.kr/api';

async function login(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json();
}

test.describe('프로덕션 캡처', () => {
  test.skip(process.env.PROD === undefined, 'PROD=1 전용');
  test.setTimeout(180000);

  test('점주 앱', async ({ page }) => {
    const lr = await login('/auth/login', { email: 'demo.merchant@eattable.kr', password: 'Demo1234!' });
    const meRes = await fetch(`${API}/merchants/me`, { headers: { Authorization: `Bearer ${lr.token}` } });
    const me = await meRes.json();
    const data = me.data ?? me;

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(MERCHANT);
    await page.evaluate(({ token, d }) => {
      localStorage.setItem('merchantToken', token);
      localStorage.setItem('merchantData', JSON.stringify(d));
    }, { token: lr.token, d: data });

    for (const [path, name] of [['/', 'dashboard'], ['/reservations', 'reservations'], ['/orders', 'orders'], ['/menus', 'menus'], ['/store', 'store'], ['/reviews', 'reviews'], ['/chat', 'chat']] as [string, string][]) {
      await page.goto(`${MERCHANT}${path}`);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/merchant-${name}.png`, fullPage: true });
    }
  });

  test('관리자 앱', async ({ page }) => {
    const lr = await login('/admin/login', { username: 'admin', password: 'admin123' });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ADMIN);
    await page.evaluate(({ token, d }) => {
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminData', JSON.stringify(d));
    }, { token: lr.token, d: lr.admin ?? {} });

    for (const [path, name] of [['/dashboard', 'dashboard'], ['/merchants', 'merchants'], ['/restaurants', 'restaurants'], ['/reservations', 'reservations'], ['/payments', 'payments'], ['/users', 'users'], ['/notices', 'notices']] as [string, string][]) {
      await page.goto(`${ADMIN}${path}`);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${OUT}/admin-${name}.png`, fullPage: true });
    }
  });
});
