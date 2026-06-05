import { test, expect, Page } from '@playwright/test';

// ============================================================
// 전수 스모크 테스트 — 고객/점주/관리자 3개 앱 화면 크롤
//
// 실행: SMOKE=1 npx playwright test e2e/smoke-full.spec.ts
// 전제: API(3001)/웹(3000)은 webServer가 기동, merchant(3002)/admin(3004)은 수동 기동
// 수집: pageerror, HTTP 5xx(실패 처리) + console.error(리포트만)
// ============================================================

const SMOKE = process.env.SMOKE === '1';

const API = 'http://localhost:3001/api';
const MERCHANT_URL = 'http://localhost:3002';
const ADMIN_URL = 'http://localhost:3004';

const DEMO_CUSTOMER = { email: 'demo.customer@eattable.kr', password: 'Demo1234!' };
const DEMO_MERCHANT = { email: 'demo.merchant@eattable.kr', password: 'Demo1234!' };
const DEMO_ADMIN = { username: 'admin', password: 'admin123' };

type Issue = { app: string; where: string; kind: string; detail: string };
const critical: Issue[] = [];
const warnings: Issue[] = [];

let currentWhere = 'init';
const setWhere = (w: string) => { currentWhere = w; };

function track(page: Page, app: string) {
  page.on('pageerror', (err) => {
    critical.push({ app, where: currentWhere, kind: 'pageerror', detail: err.message.slice(0, 300) });
  });
  page.on('response', (res) => {
    if (res.status() >= 500) {
      critical.push({
        app, where: currentWhere, kind: `http${res.status()}`,
        detail: `${res.request().method()} ${res.url().replace('http://localhost:3001', '')}`,
      });
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // dev 모드 노이즈 제외
      if (text.includes('Download the React DevTools')) return;
      warnings.push({ app, where: currentWhere, kind: 'console.error', detail: text.slice(0, 300) });
    }
  });
}

async function apiPost(path: string, body: any, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function visit(page: Page, url: string, where: string, settle = 1800) {
  setWhere(where);
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(settle);
}

test.describe('전수 스모크', () => {
  test.skip(!SMOKE, 'SMOKE=1 전용 (merchant/admin dev 서버 필요)');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let customerToken = '';
  let customerUser: any = null;
  let merchantToken = '';
  let merchantData: any = null;
  let adminToken = '';
  let adminData: any = null;
  let demoRestaurantId = '';

  test.beforeAll(async () => {
    // 데모 계정 로그인 (실제 이메일 로그인 경로)
    const cust = await apiPost('/auth/login', DEMO_CUSTOMER);
    expect(cust.status, '고객 로그인').toBe(200);
    customerToken = cust.body.token;
    customerUser = cust.body.user;

    const merch = await apiPost('/auth/login', DEMO_MERCHANT);
    expect(merch.status, '점주 로그인').toBe(200);
    merchantToken = merch.body.token;
    const me = await apiGet('/merchants/me', merchantToken);
    expect(me.status, '점주 정보 조회').toBe(200);
    merchantData = me.body.data ?? me.body;

    const adm = await apiPost('/admin/login', DEMO_ADMIN);
    expect(adm.status, '관리자 로그인').toBe(200);
    adminToken = adm.body.token;
    adminData = adm.body.admin ?? {};

    // 데모 매장 ID
    const search = await apiGet('/restaurants/search?keyword=데모');
    demoRestaurantId = (search.body.restaurants ?? [])[0]?.id;
    expect(demoRestaurantId, '데모 매장 검색').toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // 1. 고객 앱 (3000)
  // ─────────────────────────────────────────────
  test('고객 앱 전 화면 + 핵심 플로우', async ({ page }) => {
    track(page, '고객');

    // 로그인 주입
    await page.goto('/login');
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user-storage', JSON.stringify({ state: { user, isLoggedIn: true, token }, version: 0 }));
    }, { token: customerToken, user: customerUser });

    await visit(page, '/home', '고객 홈');
    await visit(page, '/search-restaurants', '매장 검색');
    await visit(page, '/my-reservations', '내 예약');
    await visit(page, '/wishlist', '찜 목록');
    await visit(page, '/notifications', '알림');

    // 데모 메뉴 조회 — 옵션은 첫 메뉴에만 1회 생성 (멱등)
    const menus = await apiGet(`/menus/restaurant/${demoRestaurantId}`);
    const allMenus = (menus.body.data?.categories ?? []).flatMap((c: any) => c.menus ?? []);
    const firstMenu = allMenus[0];
    expect(firstMenu, '데모 메뉴').toBeTruthy();

    setWhere('옵션 그룹 보장(API)');
    const existingOpts = await apiGet(`/menus/${firstMenu.id}/options`);
    if ((existingOpts.body.data ?? existingOpts.body ?? []).length === 0) {
      const group = await apiPost(`/menus/${firstMenu.id}/options`, {
        name: '스모크 옵션', is_required: true, min_select: 1, max_select: 1,
      }, merchantToken);
      expect(group.status, '옵션 그룹 생성').toBe(201);
      const optItem = await apiPost(`/menus/options/${group.body.data.id}/items`, {
        name: '곱빼기', additional_price: 2000,
      }, merchantToken);
      expect(optItem.status, '옵션 아이템 생성').toBe(201);
    }

    // 매장 상세 — 옵션 있는 첫 메뉴 담기 → 옵션 모달 → 선택 → 카트바
    await visit(page, `/restaurant/${demoRestaurantId}`, '매장 상세(옵션 메뉴)');
    setWhere('옵션 모달');
    await expect(page.locator('text=담기').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=담기').first().click();
    await expect(page.locator('text=스모크 옵션')).toBeVisible({ timeout: 10000 });
    await page.locator('text=곱빼기').click();
    await page.locator('text=/원 담기/').click();
    await expect(page.locator('text=/예약하기/').first()).toBeVisible({ timeout: 10000 });

    // 예약 폼 — 슬롯 있는 날짜 찾기
    setWhere('예약 폼');
    await page.locator('text=/예약하기/').first().click();
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/reservation/');

    let slotDate = '';
    let slotTime = '';
    for (let d = 1; d <= 7; d++) {
      const dt = new Date(); dt.setDate(dt.getDate() + d);
      const ds = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const slots = await apiGet(`/restaurants/${demoRestaurantId}/time-slots?date=${ds}`);
      const list = slots.body.data ?? [];
      if (list.length > 0) {
        slotDate = ds;
        slotTime = String(list[0].slot_time ?? list[0].time).slice(0, 5); // "11:00"
        break;
      }
    }
    expect(slotDate, '슬롯 있는 날짜').toBeTruthy();

    await page.locator('input[type="date"]').fill(slotDate);
    await page.waitForTimeout(1500);
    // 슬롯 div(시간+잔여석 한 요소) — substring 매칭으로 클릭
    const slot = page.getByText(slotTime, { exact: false }).first();
    await expect(slot).toBeVisible({ timeout: 10000 });
    await slot.click();

    setWhere('예약 폼: 결제하기');
    await page.locator('text=결제하기').click();
    await page.waitForTimeout(2500);
    expect(page.url(), '결제 화면 전이').toContain('/payment/');

    // 결제 화면 검증 (실결제는 안 함)
    setWhere('결제 화면');
    await expect(page.locator('text=주문 메뉴')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/총 결제금액/')).toBeVisible();

    // 문의(채팅) 플로우 — 방금 만든 예약으로
    setWhere('채팅 시작');
    const reservationId = page.url().split('/payment/')[1];
    const room = await apiPost('/reservation-chat/rooms', { reservation_id: reservationId }, customerToken);
    expect(room.status, '채팅방 생성').toBe(201);
    await visit(page, `/reservation-chat/${room.body.room.id}`, '채팅 화면');
    await page.locator('input[placeholder="메시지를 입력하세요"]').fill('스모크 테스트 문의입니다');
    await page.locator('text=전송').click();
    await expect(page.locator('text=스모크 테스트 문의입니다')).toBeVisible({ timeout: 10000 });

    // 예약 확정 화면 (시드된 confirmed 예약)
    setWhere('예약 확정 화면');
    const myRes = await apiGet('/reservations/my', customerToken);
    const confirmed = (myRes.body.reservations ?? []).find((r: any) => r.status === 'confirmed');
    if (confirmed) {
      await visit(page, `/reservation-confirm/${confirmed.id}`, '예약 확정 화면');
      await expect(page.locator('text=예약 정보')).toBeVisible({ timeout: 10000 });
    }
  });

  // ─────────────────────────────────────────────
  // 2. 점주 대시보드 (3002)
  // ─────────────────────────────────────────────
  test('점주 대시보드 전 화면', async ({ page }) => {
    track(page, '점주');

    await page.goto(MERCHANT_URL);
    await page.evaluate(({ token, data }) => {
      localStorage.setItem('merchantToken', token);
      localStorage.setItem('merchantData', JSON.stringify(data));
    }, { token: merchantToken, data: merchantData });

    await visit(page, `${MERCHANT_URL}/`, '점주 대시보드', 2500);
    await expect(page.locator('text=/오늘 예약|대시보드/').first()).toBeVisible({ timeout: 15000 });

    await visit(page, `${MERCHANT_URL}/reservations`, '예약 보드', 2500);
    // 주간 토글
    setWhere('예약 보드: 주간 토글');
    const weekToggle = page.locator('button:has-text("주간")').first();
    if (await weekToggle.count()) {
      await weekToggle.click();
      await page.waitForTimeout(1500);
    }
    // 수동 예약 다이얼로그 열고 닫기
    setWhere('예약 보드: 수동 예약 다이얼로그');
    const manualBtn = page.locator('button:has-text("수동 예약")').first();
    if (await manualBtn.count()) {
      await manualBtn.click();
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape');
    }

    await visit(page, `${MERCHANT_URL}/orders`, '주문 관리', 2500);
    await visit(page, `${MERCHANT_URL}/menus`, '메뉴 관리', 2500);
    await visit(page, `${MERCHANT_URL}/store`, '매장 정보', 2500);
    await visit(page, `${MERCHANT_URL}/settlements`, '정산', 2500);
    await visit(page, `${MERCHANT_URL}/reviews`, '리뷰 관리', 2500);
    await visit(page, `${MERCHANT_URL}/chat`, '문의함', 2500);
    // 고객이 보낸 문의가 보이는지
    setWhere('문의함: 메시지 확인');
    await expect(page.locator('text=/문의/').first()).toBeVisible({ timeout: 10000 });
    await visit(page, `${MERCHANT_URL}/settings`, '설정', 2500);
  });

  // ─────────────────────────────────────────────
  // 3. 관리자 (3004)
  // ─────────────────────────────────────────────
  test('관리자 전 화면', async ({ page }) => {
    track(page, '관리자');

    await page.goto(ADMIN_URL);
    await page.evaluate(({ token, data }) => {
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminData', JSON.stringify(data));
    }, { token: adminToken, data: adminData });

    const adminPages: Array<[string, string]> = [
      ['/dashboard', '대시보드'],
      ['/merchants', '점주 관리'],
      ['/restaurants', '매장 관리'],
      ['/reservations', '예약 모니터링'],
      ['/settlements', '정산 관리'],
      ['/payments', '결제 관리'],
      ['/users', '사용자 관리'],
      ['/reviews', '리뷰 관리'],
      ['/notices', '공지사항'],
      ['/settings', '설정'],
    ];

    for (const [path, name] of adminPages) {
      await visit(page, `${ADMIN_URL}${path}`, `관리자 ${name}`, 2200);
    }

    // v2 지표 카드 렌더 확인
    setWhere('관리자 대시보드 v2 지표');
    await visit(page, `${ADMIN_URL}/dashboard`, '관리자 대시보드(재방문)', 2500);
    await expect(page.locator('text=/GMV|노쇼율|오늘 예약/').first()).toBeVisible({ timeout: 15000 });
  });

  // ─────────────────────────────────────────────
  // 결과 리포트
  // ─────────────────────────────────────────────
  test.afterAll(async () => {
    console.log('\n========== 스모크 결과 ==========');
    console.log(`치명(pageerror/5xx): ${critical.length}건`);
    for (const i of critical) console.log(`  [${i.app}] ${i.where} — ${i.kind}: ${i.detail}`);
    console.log(`경고(console.error): ${warnings.length}건`);
    for (const i of warnings.slice(0, 30)) console.log(`  [${i.app}] ${i.where} — ${i.detail}`);
    console.log('=================================\n');
  });

  test('치명 이슈 없음 검증', async () => {
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
