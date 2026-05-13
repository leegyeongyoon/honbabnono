/**
 * Playwright 데모 영상 녹화 — 잇테이블 v2 (워크플로우 중심)
 *
 * 핵심 설계:
 *   - 로그인은 storageState로 토큰 사전 주입 → 페이지 진입 즉시 인증됨
 *   - 영상 대부분의 시간을 "실제 워크플로우 인터랙션"에 할애
 *   - 클릭, 입력, 스크롤 등 사람이 따라할 수 있는 흐름을 캡처
 *
 * 시나리오:
 *   1) customer-reservation.webm  고객 — 매장 검색 → 메뉴 → 시간 선택 → 결제
 *   2) merchant-pos.webm           점주 — 예약 보드 → 메뉴 관리 → 정산
 *   3) admin-approval.webm         관리자 — 점주 관리 → pending 검토 → 승인
 *   4) merchant-onboarding.webm    신규 점주 — UI 로그인 → 사업자 등록 폼
 *
 * 사용 전 준비:
 *   node scripts/seed-demo.js  # 데모 계정 + 데이터 시드
 *
 * 사용법:
 *   npx tsx scripts/record-demo.ts                          # 전체
 *   npx tsx scripts/record-demo.ts customer-reservation     # 특정 시나리오
 *
 *   # 운영 환경:
 *   CUSTOMER_URL=https://eattable.kr \
 *   MERCHANT_URL=https://merchant.eattable.kr \
 *   ADMIN_URL=https://admin.eattable.kr \
 *   npx tsx scripts/record-demo.ts
 *
 *   # AI 메뉴 시연 이미지 (옵션 — merchant-onboarding 마지막 단계)
 *   MENU_IMAGE=/Users/x/Desktop/menu.jpg npx tsx scripts/record-demo.ts
 *
 * 출력: /tmp/demo-videos/<scenario>/<scenario>.webm
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
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

const MENU_IMAGE = process.env.MENU_IMAGE || '';
const OUT_DIR = '/tmp/demo-videos';

// 영상 가독성: 호흡(ms)
const READ = 2000;       // 한 화면을 시청자가 읽을 시간
const STEP = 1000;       // 동작과 동작 사이
const TYPE = 60;         // 타자 속도

async function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }

async function getCustomerToken() {
  const res = await fetch(`${CUSTOMER_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS.customer),
  });
  const data = (await res.json()) as any;
  if (!data.success) throw new Error(`customer login: ${data.error || 'failed'}`);
  return { token: data.token as string, userId: data.user.id as string };
}

async function getMerchantTokenAndData() {
  const r = await fetch(`${MERCHANT_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS.merchant),
  });
  const data = (await r.json()) as any;
  if (!data.success) throw new Error(`merchant login: ${data.error || 'failed'}`);

  const meRes = await fetch(`${MERCHANT_URL}/api/merchants/me`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  const meData = await meRes.json() as any;
  return { token: data.token as string, merchantData: meData?.data || { user_id: data.user.id } };
}

async function getAdminToken() {
  const res = await fetch(`${ADMIN_URL}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACCOUNTS.admin),
  });
  const data = (await res.json()) as any;
  if (!data.success) throw new Error(`admin login: ${data.error || 'failed'}`);
  return { token: data.token as string, adminId: data.admin.id as string };
}

async function newContext(browser: Browser, scenario: string, opts: {
  viewport: { width: number; height: number };
  origin: string;
  localStorage: Array<{ name: string; value: string }>;
}) {
  const videoDir = path.join(OUT_DIR, scenario);
  await ensureDir(videoDir);
  return browser.newContext({
    viewport: opts.viewport,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    recordVideo: { dir: videoDir, size: opts.viewport },
    storageState: {
      cookies: [],
      origins: [{ origin: opts.origin, localStorage: opts.localStorage }],
    },
  });
}

async function finalize(ctx: BrowserContext, scenario: string) {
  for (const p of ctx.pages()) await p.close();
  await ctx.close();
  console.log(`✓ ${scenario}: 녹화 완료`);
}

async function safeClick(page: Page, selector: string, timeout = 5000): Promise<boolean> {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    return true;
  } catch { return false; }
}

// =====================================================
// 1) 고객 예약 워크플로우 (모바일 뷰)
// =====================================================
async function recordCustomerReservation(browser: Browser) {
  console.log('▶ [고객] 매장 검색 → 메뉴 → 예약 → 결제');
  const auth = await getCustomerToken();

  const ctx = await newContext(browser, 'customer-reservation', {
    viewport: { width: 390, height: 844 },
    origin: CUSTOMER_URL,
    localStorage: [
      { name: 'token', value: auth.token },
      { name: 'userId', value: auth.userId },
    ],
  });
  const page = await ctx.newPage();

  // Step 1: 홈 진입 (이미 로그인 된 상태)
  await page.goto(`${CUSTOMER_URL}/home`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(STEP);

  // Step 2: 매장 검색
  await page.goto(`${CUSTOMER_URL}/search-restaurants`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);

  const searchInput = page.locator('input[placeholder*="검색"]').first();
  await searchInput.click();
  await searchInput.pressSequentially('샤브샤브', { delay: TYPE });
  await page.waitForTimeout(READ);

  // Step 3: 데모 매장 카드 클릭
  const card = page.locator('text=/잇테이블 데모 샤브샤브/').first();
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await card.click();
  await page.waitForTimeout(READ * 2);

  // Step 4: 메뉴 스크롤
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(STEP);
  }

  // Step 5: + 버튼으로 메뉴 담기 (첫 메뉴 2개)
  const plusButtons = page.locator('button:has-text("+"), button:has-text("담기")');
  const plusCount = await plusButtons.count();
  if (plusCount > 0) {
    await plusButtons.nth(0).click();
    await page.waitForTimeout(STEP);
    await plusButtons.nth(0).click();
    await page.waitForTimeout(READ);
  }

  // Step 6: 예약하기 cart bar 클릭
  const reserveBar = page.locator('text=/예약하기|개 메뉴.*원/').first();
  if (await reserveBar.isVisible().catch(() => false)) {
    await reserveBar.click();
    await page.waitForTimeout(READ * 2);
  } else {
    // fallback: 예약 화면 직접 이동
    await page.goto(`${CUSTOMER_URL}/reservation/${process.env.DEMO_RESTAURANT_ID || ''}`);
    await page.waitForTimeout(READ);
  }

  // Step 7: 날짜 + 시간 + 인원 선택
  const dateInput = page.locator('input[type="date"]').first();
  if (await dateInput.isVisible().catch(() => false)) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await dateInput.fill(tomorrow);
    await page.waitForTimeout(READ);

    const slotBtn = page.locator('button:has-text("18:00"), button:has-text("19:00")').first();
    if (await slotBtn.isVisible().catch(() => false)) {
      await slotBtn.click();
      await page.waitForTimeout(STEP);
    }

    // 인원 + 버튼 2번 클릭 (3명 → 4명)
    const partyPlus = page.locator('button').filter({ hasText: /^\+$/ });
    const ppCount = await partyPlus.count();
    if (ppCount > 0) {
      await partyPlus.last().click();
      await page.waitForTimeout(STEP);
      await partyPlus.last().click();
      await page.waitForTimeout(READ);
    }

    // 결제 버튼
    const payBtn = page.locator('button:has-text("결제하기")').first();
    if (await payBtn.isVisible().catch(() => false)) {
      await payBtn.click();
      await page.waitForTimeout(READ * 2);
    }
  }

  // Step 8: 내 예약 페이지
  await page.goto(`${CUSTOMER_URL}/my-reservations`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ * 2);

  await finalize(ctx, 'customer-reservation');
}

// =====================================================
// 2) 점주 POS — 예약 보드 → 메뉴 관리 → 정산
// =====================================================
async function recordMerchantPos(browser: Browser) {
  console.log('▶ [점주] 예약 보드 → 메뉴 관리 → 정산');
  const { token, merchantData } = await getMerchantTokenAndData();

  const ctx = await newContext(browser, 'merchant-pos', {
    viewport: { width: 1440, height: 900 },
    origin: MERCHANT_URL,
    localStorage: [
      { name: 'merchantToken', value: token },
      { name: 'merchantData', value: JSON.stringify(merchantData) },
    ],
  });
  const page = await ctx.newPage();

  // Step 1: 대시보드 (오늘 예약/매출 현황)
  await page.goto(`${MERCHANT_URL}/`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ * 2);

  // Step 2: 사이드바 "예약 관리" 클릭
  await safeClick(page, 'text=예약 관리');
  await page.waitForTimeout(READ * 2);

  // Step 3: 예약 카드 위에서 상태 확인 (현재 데이터는 시간 데모만)
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(STEP);

  // Step 4: 메뉴 관리
  await safeClick(page, 'text=메뉴 관리');
  await page.waitForTimeout(READ * 2);

  // Step 5: 메뉴 추가 버튼 (다이얼로그 열기 → 시연만)
  await safeClick(page, 'button:has-text("메뉴 추가")');
  await page.waitForTimeout(READ);

  // 메뉴명 입력
  const nameInput = page.getByLabel('메뉴명').first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.pressSequentially('한우 특선 코스 (3인)', { delay: TYPE });
    await page.waitForTimeout(STEP);
  }
  const priceInput = page.getByLabel('가격 (원)').first();
  if (await priceInput.isVisible().catch(() => false)) {
    await priceInput.pressSequentially('120000', { delay: TYPE });
    await page.waitForTimeout(READ);
  }
  // 취소 (실제 추가는 안 함)
  await safeClick(page, 'button:has-text("취소")');
  await page.waitForTimeout(STEP);

  // Step 6: 매장 정보
  await safeClick(page, 'text=매장 정보');
  await page.waitForTimeout(READ * 2);

  // Step 7: 정산
  await safeClick(page, 'text=정산');
  await page.waitForTimeout(READ * 2);

  await finalize(ctx, 'merchant-pos');
}

// =====================================================
// 3) 관리자 승인 — 점주 관리 → pending → 승인
// =====================================================
async function recordAdminApproval(browser: Browser) {
  console.log('▶ [관리자] 점주 관리 → pending 검토 → 승인');
  const auth = await getAdminToken();

  const ctx = await newContext(browser, 'admin-approval', {
    viewport: { width: 1440, height: 900 },
    origin: ADMIN_URL,
    localStorage: [
      { name: 'adminToken', value: auth.token },
      { name: 'adminData', value: JSON.stringify({
          id: auth.adminId, username: 'admin', role: 'super_admin',
        }) },
    ],
  });
  const page = await ctx.newPage();

  // Step 1: 대시보드
  await page.goto(`${ADMIN_URL}/dashboard`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ * 2);

  // Step 2: 점주 관리
  await page.goto(`${ADMIN_URL}/merchants`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ * 2);

  // Step 3: "대기" 탭 클릭 (pending 필터)
  await safeClick(page, 'button:has-text("대기")');
  await page.waitForTimeout(READ);

  // Step 4: 검색창에 "신규" 입력 (선택)
  const search = page.locator('input[placeholder*="검색"]').first();
  if (await search.isVisible().catch(() => false)) {
    await search.click();
    await search.pressSequentially('신규', { delay: TYPE });
    await page.waitForTimeout(READ);
  }

  // Step 5: 첫 행의 "승인" 버튼 클릭
  const approveBtn = page.locator('button:has-text("승인")').first();
  if (await approveBtn.isVisible().catch(() => false)) {
    await approveBtn.click();
    await page.waitForTimeout(READ * 2);

    // Step 6: 다이얼로그의 "승인" 버튼 클릭 (실제 승인)
    // 두번째 "승인" 텍스트 = 다이얼로그 내 confirm
    const confirmBtn = page.locator('button:has-text("승인")').nth(1);
    if (await confirmBtn.isVisible().catch(() => false)) {
      // 안전: 실제 클릭하려면 아래 줄 주석 해제. 영상에서는 다이얼로그까지만 보여줘도 충분
      // await confirmBtn.click();
      await page.waitForTimeout(READ);
    }
  }

  // Step 7: 매장 관리 화면
  await page.goto(`${ADMIN_URL}/restaurants`);
  await page.waitForTimeout(READ * 2);

  await finalize(ctx, 'admin-approval');
}

// =====================================================
// 4) 신규 점주 온보딩 — UI 로그인 + 사업자 등록
// =====================================================
async function recordMerchantOnboarding(browser: Browser) {
  console.log('▶ [신규 점주] 로그인 → 사업자 등록 폼');

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    recordVideo: { dir: path.join(OUT_DIR, 'merchant-onboarding'), size: { width: 1440, height: 900 } },
  });
  await ensureDir(path.join(OUT_DIR, 'merchant-onboarding'));
  const page = await ctx.newPage();

  // Step 1: 로그인 화면
  await page.goto(`${MERCHANT_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(READ);

  // 이메일 / 비밀번호 입력 (빠르게)
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.pressSequentially(ACCOUNTS.merchantNew.email, { delay: TYPE });
  await page.waitForTimeout(STEP);

  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.pressSequentially(ACCOUNTS.merchantNew.password, { delay: TYPE });
  await page.waitForTimeout(STEP);

  await safeClick(page, 'button:has-text("로그인"), button[type="submit"]');
  await page.waitForTimeout(READ * 2);

  // Step 2: 사업자 등록 — Step 1 (사업자 정보)
  const bizNum = page.getByLabel('사업자등록번호').first();
  if (await bizNum.isVisible({ timeout: 10000 }).catch(() => false)) {
    await bizNum.pressSequentially('999-88-77777', { delay: TYPE });
    await page.waitForTimeout(STEP);

    await page.getByLabel('상호명').first().pressSequentially('잇테이블 신규 매장 데모', { delay: TYPE });
    await page.waitForTimeout(STEP);

    await page.getByLabel('대표자명').first().pressSequentially('신규 점주', { delay: TYPE });
    await page.waitForTimeout(READ);

    await safeClick(page, 'button:has-text("다음")');
    await page.waitForTimeout(READ);

    // Step 3: Step 2 (계좌 정보)
    await page.getByLabel('은행명').first().pressSequentially('국민은행', { delay: TYPE });
    await page.waitForTimeout(STEP);

    await page.getByLabel('계좌번호').first().pressSequentially('98765432101234', { delay: TYPE });
    await page.waitForTimeout(STEP);

    await page.getByLabel('예금주').first().pressSequentially('신규 점주', { delay: TYPE });
    await page.waitForTimeout(READ);

    await safeClick(page, 'button:has-text("다음")');
    await page.waitForTimeout(READ);

    // Step 4: 서류 단계 — 건너뛰기 (영상 길이상)
    await safeClick(page, 'button:has-text("건너뛰기"), button:has-text("완료")');
    await page.waitForTimeout(READ * 2);
  } else {
    console.warn('   ⚠ 사업자등록 폼이 안 떴음 — 이미 등록되어 있을 수 있음');
    await page.waitForTimeout(READ * 2);
  }

  // (옵션) AI 메뉴판 인식 단계 — 매장 등록 + 승인이 끝난 상태에서만 가능
  if (MENU_IMAGE && fs.existsSync(MENU_IMAGE)) {
    console.log('   AI 메뉴 단계는 별도 시나리오에서 (매장 등록 + 관리자 승인 후 가능)');
  }

  await finalize(ctx, 'merchant-onboarding');
}

async function main() {
  await ensureDir(OUT_DIR);
  const which = process.argv[2];

  console.log('잇테이블 데모 녹화 (워크플로우 중심)');
  console.log('  CUSTOMER_URL =', CUSTOMER_URL);
  console.log('  MERCHANT_URL =', MERCHANT_URL);
  console.log('  ADMIN_URL    =', ADMIN_URL);
  console.log('  MENU_IMAGE   =', MENU_IMAGE || '(미지정)');
  console.log('  출력         =', OUT_DIR);
  console.log('');

  const browser = await chromium.launch({ headless: true });

  try {
    if (!which || which === 'customer-reservation') await recordCustomerReservation(browser);
    if (!which || which === 'merchant-pos') await recordMerchantPos(browser);
    if (!which || which === 'admin-approval') await recordAdminApproval(browser);
    if (!which || which === 'merchant-onboarding') await recordMerchantOnboarding(browser);
  } finally {
    await browser.close();
  }

  console.log('\n📹 영상 위치:', OUT_DIR);
}

main().catch(err => {
  console.error('❌ 녹화 실패:', err);
  process.exit(1);
});
