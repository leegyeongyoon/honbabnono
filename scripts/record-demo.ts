/**
 * Playwright 데모 영상 녹화 — 잇테이블 v2 (풀 라이프사이클)
 *
 * 4 시나리오를 각각 webm으로 녹화:
 *   1) merchant-onboarding.webm  — 신규 점주: 가입 → 사업자 등록 → AI 메뉴판 업로드
 *   2) admin-approval.webm       — 관리자: 점주 관리 → pending 승인 → verified 전환
 *   3) customer-reservation.webm — 고객: 검색 → 매장 상세 → 메뉴/시간 선택 → 결제 → 내 예약
 *   4) merchant-pos.webm         — 기존 점주: 예약 보드 → 조리 상태 (옵션)
 *
 * 사용 전 준비:
 *   node scripts/seed-demo.js
 *
 * 사용법:
 *   npx playwright install chromium  # 최초 1회
 *   npx tsx scripts/record-demo.ts                       # 전체
 *   npx tsx scripts/record-demo.ts merchant-onboarding   # 특정
 *
 *   # 운영 환경 대상:
 *   CUSTOMER_URL=https://eattable.kr \
 *   MERCHANT_URL=https://merchant.eattable.kr \
 *   ADMIN_URL=https://admin.eattable.kr \
 *   MENU_IMAGE=/path/to/menu.jpg \
 *   npx tsx scripts/record-demo.ts
 *
 * 출력: /tmp/demo-videos/{merchant-onboarding,admin-approval,customer-reservation,merchant-pos}/*.webm
 */

import { chromium, Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const CUSTOMER_URL = process.env.CUSTOMER_URL || 'http://localhost:3000';
const MERCHANT_URL = process.env.MERCHANT_URL || 'http://localhost:3003';
const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3002';

const ACCOUNTS = {
  customer: { email: 'demo.customer@eattable.kr', password: 'Demo1234!' },
  merchant: { email: 'demo.merchant@eattable.kr', password: 'Demo1234!' },
  merchantNew: { email: 'demo.merchant.new@eattable.kr', password: 'Demo1234!' },
  admin: { username: 'admin', password: 'admin123' },
};

const MENU_IMAGE = process.env.MENU_IMAGE || ''; // 메뉴판 이미지 경로 (없으면 AI 업로드 단계 스킵)

const OUT_DIR = '/tmp/demo-videos';

// 가독성을 위해 일정한 호흡(ms)을 둠 — 영상 시청자에게 흐름을 따라갈 시간을 주는 용도
const READ = 1800;       // 화면 한 번 읽는 시간
const SHORT = 700;       // 동작과 동작 사이
const TYPING_DELAY = 80; // 키 입력 사이 — 타자 치는 모습

async function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

async function newContext(browser: Browser, scenario: string, viewport: { width: number; height: number }) {
  const videoDir = path.join(OUT_DIR, scenario);
  await ensureDir(videoDir);
  return browser.newContext({
    viewport,
    recordVideo: { dir: videoDir, size: viewport },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
}

async function finalize(ctx: BrowserContext, scenario: string) {
  const pages = ctx.pages();
  await Promise.all(pages.map(p => p.close()));
  await ctx.close();
  console.log(`✓ ${scenario}: 녹화 완료 → ${path.join(OUT_DIR, scenario)}/`);
}

async function loginMerchant(page: any, email: string, password: string, merchantUrl: string) {
  await page.goto(`${merchantUrl}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);

  await page.locator('input[type="email"], input[name="email"]').first()
    .pressSequentially(email, { delay: TYPING_DELAY });
  await page.waitForTimeout(SHORT);
  await page.locator('input[type="password"], input[name="password"]').first()
    .pressSequentially(password, { delay: TYPING_DELAY });
  await page.waitForTimeout(SHORT);
  await page.locator('button:has-text("로그인"), button[type="submit"]').first().click();
  await page.waitForTimeout(READ * 2);
}

// =====================================================
// 1) 신규 점주 온보딩: 가입 → 사업자 등록 → AI 메뉴 등록
// =====================================================
async function recordMerchantOnboarding(browser: Browser) {
  console.log('▶ [점주 온보딩] 녹화 시작');
  const ctx = await newContext(browser, 'merchant-onboarding', { width: 1440, height: 900 });
  const page = await ctx.newPage();

  // 1-1. 점주 로그인 (가입 화면도 시연하려면 /signup로 변경)
  await loginMerchant(page, ACCOUNTS.merchantNew.email, ACCOUNTS.merchantNew.password, MERCHANT_URL);

  // 1-2. 사업자 등록 화면으로 이동
  await page.goto(`${MERCHANT_URL}/register`).catch(() => null);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);

  // 1-3. 사업자 정보 입력 (필드명은 폼 구조에 따라 변경 필요)
  const businessNumber = page.locator('input[name="business_number"], input[placeholder*="사업자"]').first();
  if (await businessNumber.isVisible().catch(() => false)) {
    await businessNumber.pressSequentially('999-88-77777', { delay: TYPING_DELAY });
    await page.waitForTimeout(SHORT);
  }
  const businessName = page.locator('input[name="business_name"], input[placeholder*="상호"]').first();
  if (await businessName.isVisible().catch(() => false)) {
    await businessName.pressSequentially('잇테이블 신규 매장 데모', { delay: TYPING_DELAY });
    await page.waitForTimeout(SHORT);
  }
  const repName = page.locator('input[name="representative_name"], input[placeholder*="대표"]').first();
  if (await repName.isVisible().catch(() => false)) {
    await repName.pressSequentially('신규 점주', { delay: TYPING_DELAY });
    await page.waitForTimeout(SHORT);
  }

  // 1-4. 등록 버튼 (실제 제출은 폼에 따라 다를 수 있음 — 시연만)
  await page.waitForTimeout(READ);

  // 1-5. 메뉴 관리 화면 → AI 메뉴판 업로드
  await page.goto(`${MERCHANT_URL}/menus`).catch(() => null);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ * 2);

  const aiButton = page.locator('button:has-text("AI 메뉴판"), button:has-text("AI 메뉴")').first();
  if (await aiButton.isVisible().catch(() => false)) {
    await aiButton.click();
    await page.waitForTimeout(READ);

    if (MENU_IMAGE && fs.existsSync(MENU_IMAGE)) {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(MENU_IMAGE);
      await page.waitForTimeout(READ);

      // AI 분석 진행 + 결과 화면 노출 시간 확보
      await page.waitForTimeout(READ * 4);
    } else {
      console.log('   (MENU_IMAGE 미지정 — AI 업로드 단계 시각만 캡처)');
      await page.waitForTimeout(READ * 2);
    }
  }

  await finalize(ctx, 'merchant-onboarding');
}

// =====================================================
// 2) 관리자 승인: pending 점주 목록 → 승인
// =====================================================
async function recordAdminApproval(browser: Browser) {
  console.log('▶ [관리자 승인] 녹화 시작');
  const ctx = await newContext(browser, 'admin-approval', { width: 1440, height: 900 });
  const page = await ctx.newPage();

  // 2-1. 관리자 로그인
  await page.goto(`${ADMIN_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);

  await page.locator('input[name="username"], input[type="text"]').first()
    .pressSequentially(ACCOUNTS.admin.username, { delay: TYPING_DELAY });
  await page.waitForTimeout(SHORT);
  await page.locator('input[type="password"]').first()
    .pressSequentially(ACCOUNTS.admin.password, { delay: TYPING_DELAY });
  await page.waitForTimeout(SHORT);
  await page.locator('button:has-text("로그인"), button[type="submit"]').first().click();
  await page.waitForTimeout(READ * 2);

  // 2-2. 대시보드
  await page.waitForTimeout(READ);

  // 2-3. 점주 관리 → pending 필터
  await page.goto(`${ADMIN_URL}/merchants`).catch(() => null);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ * 2);

  const pendingTab = page.locator('text=/대기|pending/i').first();
  if (await pendingTab.isVisible().catch(() => false)) {
    await pendingTab.click();
    await page.waitForTimeout(READ);
  }

  // 2-4. 첫 번째 pending 항목 클릭 → 승인 버튼 노출
  const firstRow = page.locator('table tbody tr, [role="row"]').first();
  if (await firstRow.isVisible().catch(() => false)) {
    await firstRow.click();
    await page.waitForTimeout(READ);
  }

  const approveBtn = page.locator('button:has-text("승인"), button:has-text("verified")').first();
  if (await approveBtn.isVisible().catch(() => false)) {
    await approveBtn.click();
    await page.waitForTimeout(READ * 2);
  }

  await finalize(ctx, 'admin-approval');
}

async function getCustomerToken(): Promise<{ token: string; userId: string } | null> {
  try {
    const apiUrl = process.env.CUSTOMER_API_URL || `${CUSTOMER_URL}/api`;
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ACCOUNTS.customer.email,
        password: ACCOUNTS.customer.password,
      }),
    });
    const data = await res.json() as { success: boolean; token?: string; user?: { id: string } };
    if (!data.success || !data.token) return null;
    return { token: data.token, userId: data.user!.id };
  } catch (err) {
    console.error('   고객 토큰 발급 실패:', err);
    return null;
  }
}

// =====================================================
// 3) 고객 예약 (모바일 뷰포트)
//   Kakao 전용 로그인이라 API 토큰 받아서 localStorage 주입 → 로그인 화면 스킵
// =====================================================
async function recordCustomer(browser: Browser) {
  console.log('▶ [고객] 녹화 시작');
  const ctx = await newContext(browser, 'customer-reservation', { width: 390, height: 844 });
  const page = await ctx.newPage();

  // 1-0. 로그인 화면 잠시 노출 (Kakao 버튼 보이는 장면)
  await page.goto(`${CUSTOMER_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);

  // 1-1. API 토큰 주입 (Kakao 우회)
  const auth = await getCustomerToken();
  if (auth) {
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, auth);
    console.log('   ✓ 토큰 주입 완료');
  } else {
    console.warn('   ⚠ 토큰 발급 실패 — 로그인 안 된 상태로 진행');
  }

  // 1-2. 매장 검색
  await page.goto(`${CUSTOMER_URL}/search-restaurants`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);

  const searchInput = page.locator('input[placeholder*="검색"], input[type="search"]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.pressSequentially('샤브샤브', { delay: TYPING_DELAY });
    await page.waitForTimeout(READ);
  }

  // 1-3. 데모 매장 카드 클릭
  const card = page.locator('text=/잇테이블 데모 샤브샤브/').first();
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await page.waitForTimeout(READ * 2);
  }

  // 1-4. 메뉴 둘러보기 — 스크롤
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(SHORT);
  }
  await page.waitForTimeout(READ);

  // 1-5. 예약하기 버튼
  const reserveBtn = page.locator('button:has-text("예약"), button:has-text("주문"), a:has-text("예약")').first();
  if (await reserveBtn.isVisible().catch(() => false)) {
    await reserveBtn.click();
    await page.waitForTimeout(READ * 2);
  }

  // 1-6. 내 예약 페이지
  await page.goto(`${CUSTOMER_URL}/my-reservations`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ * 2);

  await finalize(ctx, 'customer-reservation');
}

// =====================================================
// 4) 기존 점주 POS 시점 (옵션 — 이미 verified 매장 운영 화면)
// =====================================================
async function recordMerchantPos(browser: Browser) {
  console.log('▶ [점주 POS] 녹화 시작');
  const ctx = await newContext(browser, 'merchant-pos', { width: 1440, height: 900 });
  const page = await ctx.newPage();

  await loginMerchant(page, ACCOUNTS.merchant.email, ACCOUNTS.merchant.password, MERCHANT_URL);

  // 대시보드
  await page.waitForTimeout(READ);

  // 예약 보드
  await page.goto(`${MERCHANT_URL}/reservations`).catch(() => null);
  await page.waitForTimeout(READ * 2);

  // 메뉴 관리
  await page.goto(`${MERCHANT_URL}/menus`).catch(() => null);
  await page.waitForTimeout(READ * 2);

  // 정산 내역
  await page.goto(`${MERCHANT_URL}/settlements`).catch(() => null);
  await page.waitForTimeout(READ * 2);

  await finalize(ctx, 'merchant-pos');
}

async function main() {
  await ensureDir(OUT_DIR);
  const which = process.argv[2]; // optional: merchant-onboarding|admin-approval|customer-reservation|merchant-pos

  console.log('잇테이블 데모 녹화');
  console.log('  CUSTOMER_URL =', CUSTOMER_URL);
  console.log('  MERCHANT_URL =', MERCHANT_URL);
  console.log('  ADMIN_URL    =', ADMIN_URL);
  console.log('  MENU_IMAGE   =', MENU_IMAGE || '(미지정)');
  console.log('  출력         =', OUT_DIR);
  console.log('');

  const browser = await chromium.launch({ headless: true });

  try {
    if (!which || which === 'merchant-onboarding') await recordMerchantOnboarding(browser);
    if (!which || which === 'admin-approval') await recordAdminApproval(browser);
    if (!which || which === 'customer-reservation') await recordCustomer(browser);
    if (!which || which === 'merchant-pos') await recordMerchantPos(browser);
  } finally {
    await browser.close();
  }

  console.log('\n📹 영상 위치:', OUT_DIR);
}

main().catch(err => {
  console.error('❌ 녹화 실패:', err);
  process.exit(1);
});
