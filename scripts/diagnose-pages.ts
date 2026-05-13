/**
 * 페이지 진단 — 각 역할별 주요 페이지 방문 → 빈 화면/에러/내용 길이 측정
 *
 * 사용:
 *   CUSTOMER_URL=https://eattable.kr \
 *   MERCHANT_URL=https://merchant.eattable.kr \
 *   ADMIN_URL=https://admin.eattable.kr \
 *   npx tsx scripts/diagnose-pages.ts
 *
 * 출력:
 *   /tmp/page-diagnostics/report.md      마크다운 리포트
 *   /tmp/page-diagnostics/<role>/<path>.png  각 페이지 스크린샷
 */

import { chromium, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const CUSTOMER_URL = process.env.CUSTOMER_URL || 'http://localhost:3000';
const MERCHANT_URL = process.env.MERCHANT_URL || 'http://localhost:3003';
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3002';

const ACCOUNTS = {
  customer: { email: 'demo.customer@eattable.kr', password: 'Demo1234!' },
  merchant: { email: 'demo.merchant@eattable.kr', password: 'Demo1234!' },
  admin: { username: 'admin', password: 'admin123' },
};

const OUT = '/tmp/page-diagnostics';

interface Result {
  role: string;
  pathRoute: string;
  status: 'OK' | 'BLANK' | 'ERROR' | 'REDIRECT';
  httpStatus: number;
  finalUrl: string;
  textLength: number;
  errors: string[];
  consoleErrors: string[];
  notes: string;
}

const CUSTOMER_ROUTES = [
  '/home',
  '/search-restaurants',
  '/my-reservations',
  '/mypage',
  '/wishlist',
  '/notifications',
  '/point-history',
  '/recent-views',
  '/my-reviews',
  '/settings',
];

const MERCHANT_ROUTES = [
  '/',
  '/reservations',
  '/orders',
  '/menus',
  '/store',
  '/settlements',
  '/settings',
];

const ADMIN_ROUTES = [
  '/dashboard',
  '/merchants',
  '/restaurants',
  '/reservations',
  '/users',
  '/reviews',
  '/reports',
  '/notifications',
  '/settings',
];

async function getCustomerToken(): Promise<{ token: string; userId: string } | null> {
  try {
    const res = await fetch(`${CUSTOMER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ACCOUNTS.customer),
    });
    const data = (await res.json()) as any;
    if (!data.success) return null;
    return { token: data.token, userId: data.user.id };
  } catch { return null; }
}

async function getMerchantToken(): Promise<{ token: string; userId: string } | null> {
  try {
    const res = await fetch(`${MERCHANT_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ACCOUNTS.merchant),
    });
    const data = (await res.json()) as any;
    if (!data.success) return null;
    return { token: data.token, userId: data.user.id };
  } catch { return null; }
}

async function getAdminToken(): Promise<{ token: string; adminId: string } | null> {
  try {
    const res = await fetch(`${ADMIN_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ACCOUNTS.admin),
    });
    const data = (await res.json()) as any;
    if (!data.success) return null;
    return { token: data.token, adminId: data.admin.id };
  } catch { return null; }
}

async function diagnoseRole(
  ctx: BrowserContext,
  role: string,
  baseUrl: string,
  routes: string[],
  inject: (page: Page) => Promise<void>,
): Promise<Result[]> {
  const results: Result[] = [];
  const screenshotDir = path.join(OUT, role);
  fs.mkdirSync(screenshotDir, { recursive: true });

  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text().slice(0, 200));
    }
  });

  // 한 번 진입해서 토큰 주입
  await page.goto(baseUrl);
  await inject(page);

  for (const route of routes) {
    consoleErrors.length = 0;
    const url = `${baseUrl}${route}`;
    const errors: string[] = [];
    let httpStatus = 0;
    let finalUrl = '';
    let textLength = 0;
    let status: Result['status'] = 'OK';
    let notes = '';

    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      httpStatus = res?.status() || 0;
      await page.waitForTimeout(2500); // 데이터 로딩 시간
      finalUrl = page.url();

      // 본문 텍스트 길이
      textLength = (await page.locator('body').innerText().catch(() => '')).length;

      // 에러 표시 검출 (텍스트 + selector)
      const errorTextCandidates = [
        'error', 'Error', '오류', '실패', 'failed', 'Failed',
        'TypeError', 'ReferenceError', 'undefined', 'NaN',
      ];
      const bodyText = await page.locator('body').innerText().catch(() => '');
      for (const e of errorTextCandidates) {
        if (bodyText.includes(e) && bodyText.length < 500) {
          errors.push(`텍스트 "${e}" 노출`);
        }
      }

      // 리다이렉트
      if (finalUrl !== url && !finalUrl.endsWith(route)) {
        status = 'REDIRECT';
        notes = `→ ${finalUrl}`;
      } else if (textLength < 50) {
        status = 'BLANK';
        notes = '본문 텍스트 50자 미만';
      } else if (errors.length > 0 || consoleErrors.length > 3) {
        status = 'ERROR';
      }

      // 스크린샷
      const safeName = route.replace(/\//g, '_').replace(/^_/, 'root') || 'root';
      await page.screenshot({
        path: path.join(screenshotDir, `${safeName}.png`),
        fullPage: false,
      });
    } catch (err: any) {
      status = 'ERROR';
      errors.push(`예외: ${err.message?.slice(0, 200)}`);
      notes = err.message?.slice(0, 100) || '';
    }

    results.push({
      role,
      pathRoute: route,
      status,
      httpStatus,
      finalUrl,
      textLength,
      errors,
      consoleErrors: [...consoleErrors],
      notes,
    });

    const icon = status === 'OK' ? '✅' : status === 'BLANK' ? '⚪' : status === 'REDIRECT' ? '↪' : '❌';
    console.log(`  ${icon} ${route.padEnd(25)} [${status.padEnd(8)}] text=${textLength} ${notes}`);
  }

  return results;
}

function renderReport(allResults: Result[]): string {
  const byRole: Record<string, Result[]> = {};
  for (const r of allResults) {
    byRole[r.role] = byRole[r.role] || [];
    byRole[r.role].push(r);
  }

  let md = `# 페이지 진단 리포트\n\n`;
  md += `생성 시각: ${new Date().toISOString()}\n\n`;
  md += `**상태 범례**\n`;
  md += `- ✅ OK: 본문 50자 이상, 에러 없음\n`;
  md += `- ⚪ BLANK: 페이지 떴지만 본문 50자 미만 (로딩/렌더링 실패 가능)\n`;
  md += `- ↪ REDIRECT: 다른 페이지로 리다이렉트\n`;
  md += `- ❌ ERROR: 예외, 에러 텍스트, 또는 콘솔 에러 다수\n\n`;

  // 요약
  md += `## 요약\n\n`;
  md += `| 역할 | OK | BLANK | REDIRECT | ERROR | 합계 |\n`;
  md += `|---|---:|---:|---:|---:|---:|\n`;
  for (const [role, results] of Object.entries(byRole)) {
    const ok = results.filter(r => r.status === 'OK').length;
    const blank = results.filter(r => r.status === 'BLANK').length;
    const redirect = results.filter(r => r.status === 'REDIRECT').length;
    const error = results.filter(r => r.status === 'ERROR').length;
    md += `| ${role} | ${ok} | ${blank} | ${redirect} | ${error} | ${results.length} |\n`;
  }

  // 상세
  for (const [role, results] of Object.entries(byRole)) {
    md += `\n## ${role}\n\n`;
    md += `| 경로 | 상태 | HTTP | 본문길이 | 비고 |\n`;
    md += `|---|---|---:|---:|---|\n`;
    for (const r of results) {
      const icon = r.status === 'OK' ? '✅' : r.status === 'BLANK' ? '⚪' : r.status === 'REDIRECT' ? '↪' : '❌';
      md += `| \`${r.pathRoute}\` | ${icon} ${r.status} | ${r.httpStatus} | ${r.textLength} | ${r.notes} |\n`;
    }

    const issues = results.filter(r => r.status !== 'OK');
    if (issues.length > 0) {
      md += `\n### 문제 페이지 상세\n\n`;
      for (const r of issues) {
        md += `#### \`${r.pathRoute}\` — ${r.status}\n`;
        if (r.errors.length) md += `- 에러: ${r.errors.join(', ')}\n`;
        if (r.consoleErrors.length) md += `- 콘솔 에러 (${r.consoleErrors.length}):\n` +
          r.consoleErrors.slice(0, 5).map(e => `  - ${e}`).join('\n') + '\n';
        if (r.notes) md += `- 비고: ${r.notes}\n`;
        md += '\n';
      }
    }
  }

  return md;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  console.log('잇테이블 페이지 진단');
  console.log('  CUSTOMER_URL =', CUSTOMER_URL);
  console.log('  MERCHANT_URL =', MERCHANT_URL);
  console.log('  ADMIN_URL    =', ADMIN_URL);
  console.log('  출력         =', OUT);
  console.log('');

  console.log('▶ 토큰 발급');
  const customerAuth = await getCustomerToken();
  const merchantAuth = await getMerchantToken();
  const adminAuth = await getAdminToken();
  console.log('  customer :', customerAuth ? 'OK' : 'FAIL');
  console.log('  merchant :', merchantAuth ? 'OK' : 'FAIL');
  console.log('  admin    :', adminAuth ? 'OK' : 'FAIL');
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const allResults: Result[] = [];

  try {
    if (customerAuth) {
      console.log('▶ [고객] 페이지 진단');
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
      const results = await diagnoseRole(
        ctx, 'customer', CUSTOMER_URL, CUSTOMER_ROUTES,
        async (page) => {
          await page.evaluate(({ token, userId }) => {
            localStorage.setItem('token', token);
            localStorage.setItem('userId', userId);
          }, customerAuth);
        }
      );
      allResults.push(...results);
      await ctx.close();
    }

    if (merchantAuth) {
      console.log('\n▶ [점주] 페이지 진단');
      // 매장 정보 조회해서 merchantData 형태로 저장
      const meRes = await fetch(`${MERCHANT_URL}/api/merchants/me`, {
        headers: { Authorization: `Bearer ${merchantAuth.token}` },
      }).catch(() => null);
      const meData = meRes ? await meRes.json().catch(() => null) : null;
      const merchantData = meData?.data || { user_id: merchantAuth.userId };

      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
      const results = await diagnoseRole(
        ctx, 'merchant', MERCHANT_URL, MERCHANT_ROUTES,
        async (page) => {
          await page.evaluate(({ token, data }) => {
            localStorage.setItem('merchantToken', token);
            localStorage.setItem('merchantData', JSON.stringify(data));
          }, { token: merchantAuth.token, data: merchantData });
        }
      );
      allResults.push(...results);
      await ctx.close();
    }

    if (adminAuth) {
      console.log('\n▶ [관리자] 페이지 진단');
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
      const results = await diagnoseRole(
        ctx, 'admin', ADMIN_URL, ADMIN_ROUTES,
        async (page) => {
          await page.evaluate(({ token, adminId }) => {
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminData', JSON.stringify({
              id: adminId, username: 'admin', role: 'super_admin',
            }));
          }, adminAuth);
        }
      );
      allResults.push(...results);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  const report = renderReport(allResults);
  const reportPath = path.join(OUT, 'report.md');
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log('\n📄 리포트:', reportPath);
  console.log('📸 스크린샷:', OUT);
}

main().catch(err => {
  console.error('❌ 진단 실패:', err);
  process.exit(1);
});
