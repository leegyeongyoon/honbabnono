import { test, Page } from '@playwright/test';

// UI 시각 검증용 스크린샷 캡처
// SHOT=merchant 또는 SHOT=admin 으로 대상 선택
// 결과: /tmp/ui-shots/*.png

const TARGET = process.env.SHOT || 'merchant';
const API = 'http://localhost:3001/api';
const OUT = '/tmp/ui-shots';

async function login(path: string, body: any) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return res.json();
}

test.describe('UI 캡처', () => {
  test.skip(process.env.SHOT === undefined, 'SHOT env 필요');
  test.setTimeout(120000);

  if (TARGET === 'merchant') {
    test('merchant 화면들', async ({ page }) => {
      const lr = await login('/auth/login', { email: 'demo.merchant@eattable.kr', password: 'Demo1234!' });
      const meRes = await fetch(`${API}/merchants/me`, { headers: { Authorization: `Bearer ${lr.token}` } });
      const me = await meRes.json();
      const data = me.data ?? me;

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('http://localhost:3002');
      await page.evaluate(({ token, d }) => {
        localStorage.setItem('merchantToken', token);
        localStorage.setItem('merchantData', JSON.stringify(d));
      }, { token: lr.token, d: data });

      const pages: Array<[string, string]> = [
        ['/', 'dashboard'],
        ['/reservations', 'reservations'],
        ['/orders', 'orders'],
        ['/menus', 'menus'],
        ['/store', 'store'],
        ['/settlements', 'settlements'],
        ['/reviews', 'reviews'],
        ['/chat', 'chat'],
      ];
      for (const [path, name] of pages) {
        await page.goto(`http://localhost:3002${path}`);
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `${OUT}/merchant-${name}.png`, fullPage: true });
      }
    });
  }

  if (TARGET === 'admin') {
    test('admin 화면들', async ({ page }) => {
      const lr = await login('/admin/login', { username: 'admin', password: 'admin123' });

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('http://localhost:3004');
      await page.evaluate(({ token, d }) => {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminData', JSON.stringify(d));
      }, { token: lr.token, d: lr.admin ?? {} });

      const pages: Array<[string, string]> = [
        ['/dashboard', 'dashboard'],
        ['/merchants', 'merchants'],
        ['/restaurants', 'restaurants'],
        ['/reservations', 'reservations'],
        ['/settlements', 'settlements'],
        ['/payments', 'payments'],
        ['/users', 'users'],
      ];
      for (const [path, name] of pages) {
        await page.goto(`http://localhost:3004${path}`);
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `${OUT}/admin-${name}.png`, fullPage: true });
      }
    });
  }
});
