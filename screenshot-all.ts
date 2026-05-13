import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE = 'http://localhost:3000';
const API = 'http://localhost:3001/api';
const OUT = '/tmp/screenshots';

const SCREENS = [
  { name: '01-login', path: '/login' },
  { name: '02-home', path: '/home', auth: true },
  { name: '03-search-restaurants', path: '/search-restaurants', auth: true },
  { name: '04-my-reservations', path: '/my-reservations', auth: true },
  { name: '05-mypage', path: '/mypage', auth: true },
  { name: '06-settings', path: '/settings', auth: true },
  { name: '07-notification-settings', path: '/notification-settings', auth: true },
  { name: '08-privacy-settings', path: '/privacy-settings', auth: true },
  { name: '09-point-history', path: '/point-history', auth: true },
  { name: '10-point-charge', path: '/point-charge', auth: true },
  { name: '11-wishlist', path: '/wishlist', auth: true },
  { name: '12-recent-views', path: '/recent-views', auth: true },
  { name: '13-my-reviews', path: '/my-reviews', auth: true },
  { name: '14-blocked-users', path: '/blocked-users', auth: true },
  { name: '15-my-activities', path: '/my-activities', auth: true },
  { name: '16-faq', path: '/faq' },
  { name: '17-notices', path: '/notices' },
  { name: '18-terms', path: '/terms' },
  { name: '19-notifications', path: '/notifications', auth: true },
];

async function run() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1) Get token via API
  let token = '';
  let user: any = null;
  try {
    const res = await fetch(`${API}/auth/test-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@test.com' }),
    });
    if (res.ok) {
      const data: any = await res.json();
      token = data.token;
      user = data.user;
      console.log('Got auth token for:', data.user?.name);
    }
  } catch (e: any) {
    console.log('API login failed:', e.message);
  }

  // 2) Set auth in browser
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);

  if (token) {
    await page.evaluate(({ token, user }: any) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      const userStorage = {
        state: { user, isLoggedIn: true, token },
        version: 0,
      };
      localStorage.setItem('user-storage', JSON.stringify(userStorage));
    }, { token, user });
    console.log('Auth set in localStorage');
  }

  // Screenshot login
  await page.screenshot({ path: path.join(OUT, '01-login.png'), fullPage: true });
  console.log('OK: 01-login');

  // 3) Screenshots
  for (const screen of SCREENS) {
    if (screen.name === '01-login') continue;
    try {
      await page.goto(`${BASE}${screen.path}`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);

      // Check if redirected to login
      if (page.url().includes('/login') && screen.auth) {
        console.log(`REDIRECT: ${screen.name} -> login (auth failed)`);
        continue;
      }

      await page.screenshot({
        path: path.join(OUT, `${screen.name}.png`),
        fullPage: true,
      });
      console.log(`OK: ${screen.name}`);
    } catch (e: any) {
      console.log(`FAIL: ${screen.name} - ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone! Screenshots in ${OUT}`);
}

run();
