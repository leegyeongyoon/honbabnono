/**
 * Demo data seeder — 잇테이블 v2 (풀 라이프사이클 시연용)
 *
 * 데모 계정:
 *   1) demo.customer@eattable.kr     / Demo1234!   고객
 *   2) demo.merchant@eattable.kr     / Demo1234!   기존 점주 (verified, 매장+메뉴+예약 보유)
 *   3) demo.merchant.new@eattable.kr / Demo1234!   신규 점주 (user만 — 사업자 등록 전, 영상에서 등록부터 시연)
 *   4) admin / admin123                            관리자 (있으면 스킵)
 *
 * 생성 항목:
 *   - 사용자 4명 (영상 시나리오용)
 *   - 데모 매장: "잇테이블 데모 샤브샤브" (verified 점주 소유, is_active=true)
 *   - 메뉴 카테고리 2개 + 메뉴 6종 (코스 3 + 단품 3)
 *   - 시간 슬롯: Mon-Sat 11:00 / 12:00 / 18:00 / 19:00 / 20:00
 *   - 데모 예약 3건: 오늘 저녁(confirmed) / 내일 점심(pending_payment) / 어제(completed)
 *
 * 영상 시나리오:
 *   ① 신규 점주(demo.merchant.new)가 사업자 등록 + AI 메뉴 사진 업로드 → verification_status='pending'
 *   ② 관리자(admin)가 pending 점주 목록에서 승인 → 'verified'
 *   ③ 고객(demo.customer)이 검색 → 예약 → 결제 (기존 점주의 매장 활용)
 *
 * 사용법:
 *   node scripts/seed-demo.js                          # 로컬 DB
 *   DATABASE_URL=postgresql://... node scripts/seed-demo.js
 *
 * 멱등성: 이미 존재하면 INSERT 스킵, ID만 재사용
 */

const bcrypt = require('bcryptjs');
const pool = require('../server/config/database');

const ACCOUNTS = {
  customer: { email: 'demo.customer@eattable.kr', password: 'Demo1234!', name: '데모 고객' },
  merchant: { email: 'demo.merchant@eattable.kr', password: 'Demo1234!', name: '데모 점주' },
  merchantNew: { email: 'demo.merchant.new@eattable.kr', password: 'Demo1234!', name: '신규 점주' },
  admin: { username: 'admin', password: 'admin123', email: 'admin@eattable.kr' },
};

const DEMO_RESTAURANT = {
  name: '잇테이블 데모 샤브샤브',
  description: '예약한 시간에 바로 끓이기 시작 — 줄 서지 않는 샤브샤브 코스',
  category: '샤브샤브',
  phone: '02-1234-5678',
  address: '서울시 강남구 테헤란로 123',
  address_detail: '잇테이블빌딩 2층',
  latitude: 37.5012767,
  longitude: 127.0395666,
  seat_count: 40,
};

const MENU_CATEGORIES = [
  { name: '코스 세트', sort_order: 1 },
  { name: '단품 추가', sort_order: 2 },
];

const MENUS = [
  { category_idx: 0, name: '한우 샤브샤브 코스 (2인)', description: '1++ 한우 + 모듬 야채 + 칼국수 + 죽', price: 89000, prep_time_min: 15, is_set_menu: true, serves: 2, sort_order: 1 },
  { category_idx: 0, name: '돼지 샤브샤브 코스 (2인)', description: '국내산 흑돼지 + 야채 + 칼국수', price: 49000, prep_time_min: 15, is_set_menu: true, serves: 2, sort_order: 2 },
  { category_idx: 0, name: '버섯 모듬 샤브샤브 (2인)', description: '표고/팽이/느타리/송이', price: 39000, prep_time_min: 12, is_set_menu: true, serves: 2, sort_order: 3 },
  { category_idx: 1, name: '한우 추가 (100g)', description: '1++ 등심', price: 18000, prep_time_min: 5, is_set_menu: false, serves: 1, sort_order: 1 },
  { category_idx: 1, name: '야채 추가', description: '모듬 야채 한 접시', price: 8000, prep_time_min: 3, is_set_menu: false, serves: 1, sort_order: 2 },
  { category_idx: 1, name: '칼국수 사리', description: '직접 뽑은 칼국수', price: 5000, prep_time_min: 3, is_set_menu: false, serves: 1, sort_order: 3 },
];

const TIME_SLOTS = (() => {
  const slots = [];
  for (let dow = 1; dow <= 6; dow++) {
    for (const t of ['11:00', '12:00', '18:00', '19:00', '20:00']) {
      slots.push({ day_of_week: dow, slot_time: t, max_reservations: 8 });
    }
  }
  return slots;
})();

async function upsertUser(email, password, name) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) {
    return { id: existing.rows[0].id, created: false };
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (id, email, password, name, provider, is_verified, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, 'email', true, NOW(), NOW())
     RETURNING id`,
    [email, hash, name]
  );
  return { id: result.rows[0].id, created: true };
}

async function upsertAdmin(username, password, email) {
  const existing = await pool.query('SELECT id FROM admins WHERE username = $1', [username]);
  if (existing.rows[0]) {
    return { id: existing.rows[0].id, created: false };
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO admins (username, email, password, role, is_active, created_at)
     VALUES ($1, $2, $3, 'super_admin', true, NOW())
     RETURNING id`,
    [username, email, hash]
  );
  return { id: result.rows[0].id, created: true };
}

async function upsertRestaurant() {
  const existing = await pool.query(
    'SELECT id FROM restaurants WHERE name = $1',
    [DEMO_RESTAURANT.name]
  );
  if (existing.rows[0]) return { id: existing.rows[0].id, created: false };

  const r = DEMO_RESTAURANT;
  const result = await pool.query(
    `INSERT INTO restaurants
     (id, name, description, category, phone, address, address_detail,
      latitude, longitude, seat_count, is_active, operating_hours)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true,
       '{"mon":"11:00-22:00","tue":"11:00-22:00","wed":"11:00-22:00","thu":"11:00-22:00","fri":"11:00-22:00","sat":"11:00-22:00","sun":"closed"}'::jsonb)
     RETURNING id`,
    [r.name, r.description, r.category, r.phone, r.address, r.address_detail,
     r.latitude, r.longitude, r.seat_count]
  );
  return { id: result.rows[0].id, created: true };
}

async function upsertMerchant(userId, restaurantId) {
  const existing = await pool.query('SELECT id FROM merchants WHERE user_id = $1', [userId]);
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE merchants SET restaurant_id = $1, verification_status = 'verified', verified_at = NOW()
       WHERE id = $2`,
      [restaurantId, existing.rows[0].id]
    );
    return { id: existing.rows[0].id, created: false };
  }

  const result = await pool.query(
    `INSERT INTO merchants
     (id, user_id, restaurant_id, business_number, business_name, representative_name,
      bank_name, bank_account, bank_holder, verification_status, verified_at)
     VALUES (gen_random_uuid(), $1, $2, '123-45-67890', '잇테이블 데모', '데모 점주',
             '국민은행', '123456-78-901234', '데모 점주', 'verified', NOW())
     RETURNING id`,
    [userId, restaurantId]
  );
  return { id: result.rows[0].id, created: true };
}

async function upsertMenuCategories(restaurantId) {
  const ids = [];
  for (const c of MENU_CATEGORIES) {
    const existing = await pool.query(
      'SELECT id FROM menu_categories WHERE restaurant_id = $1 AND name = $2',
      [restaurantId, c.name]
    );
    if (existing.rows[0]) {
      ids.push(existing.rows[0].id);
      continue;
    }
    const r = await pool.query(
      `INSERT INTO menu_categories (id, restaurant_id, name, sort_order, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id`,
      [restaurantId, c.name, c.sort_order]
    );
    ids.push(r.rows[0].id);
  }
  return ids;
}

async function upsertMenus(restaurantId, categoryIds) {
  let inserted = 0;
  for (const m of MENUS) {
    const exists = await pool.query(
      'SELECT id FROM menus WHERE restaurant_id = $1 AND name = $2',
      [restaurantId, m.name]
    );
    if (exists.rows[0]) continue;
    await pool.query(
      `INSERT INTO menus
       (id, restaurant_id, category_id, name, description, price,
        prep_time_min, is_set_menu, serves, sort_order, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [restaurantId, categoryIds[m.category_idx], m.name, m.description,
       m.price, m.prep_time_min, m.is_set_menu, m.serves, m.sort_order]
    );
    inserted++;
  }
  return inserted;
}

async function upsertTimeSlots(restaurantId) {
  let inserted = 0;
  for (const s of TIME_SLOTS) {
    const r = await pool.query(
      `INSERT INTO restaurant_time_slots (id, restaurant_id, day_of_week, slot_time, max_reservations, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
       ON CONFLICT (restaurant_id, day_of_week, slot_time) DO NOTHING
       RETURNING id`,
      [restaurantId, s.day_of_week, s.slot_time, s.max_reservations]
    );
    if (r.rowCount > 0) inserted++;
  }
  return inserted;
}

async function upsertDemoReservations(restaurantId, customerUserId) {
  // 1) 오늘 저녁 7시 - confirmed (시연용 메인)
  // 2) 내일 점심 12시 - pending_payment
  // 3) 어제 완료 - completed
  const scenarios = [
    { date: new Date(), time: '19:00', party: 2, status: 'confirmed', tag: 'today-dinner' },
    { date: new Date(Date.now() + 86400000), time: '12:00', party: 4, status: 'pending_payment', tag: 'tomorrow-lunch' },
    { date: new Date(Date.now() - 86400000), time: '19:00', party: 2, status: 'completed', tag: 'yesterday-done' },
  ];

  let inserted = 0;
  for (const s of scenarios) {
    const dateStr = s.date.toISOString().slice(0, 10);
    const exists = await pool.query(
      `SELECT id FROM reservations
       WHERE restaurant_id = $1 AND user_id = $2 AND reservation_date = $3 AND reservation_time = $4`,
      [restaurantId, customerUserId, dateStr, s.time]
    );
    if (exists.rows[0]) continue;
    await pool.query(
      `INSERT INTO reservations
       (id, restaurant_id, user_id, reservation_date, reservation_time, party_size, status, qr_code)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
      [restaurantId, customerUserId, dateStr, s.time, s.party, s.status, `DEMO-${s.tag}-${Date.now()}`]
    );
    inserted++;
  }
  return inserted;
}

async function resetPendingMerchant(userId) {
  // 신규 점주는 매번 깨끗한 상태로 재설정 (영상 재촬영 가능하게)
  // user는 유지, merchant row만 제거
  const result = await pool.query(
    'DELETE FROM merchants WHERE user_id = $1 RETURNING id',
    [userId]
  );
  return result.rowCount;
}

async function main() {
  const summary = {};

  console.log('▶ 1) 사용자 계정');
  const customer = await upsertUser(ACCOUNTS.customer.email, ACCOUNTS.customer.password, ACCOUNTS.customer.name);
  const merchantUser = await upsertUser(ACCOUNTS.merchant.email, ACCOUNTS.merchant.password, ACCOUNTS.merchant.name);
  const merchantNewUser = await upsertUser(ACCOUNTS.merchantNew.email, ACCOUNTS.merchantNew.password, ACCOUNTS.merchantNew.name);
  const admin = await upsertAdmin(ACCOUNTS.admin.username, ACCOUNTS.admin.password, ACCOUNTS.admin.email);
  console.log(`   customer       ${customer.created ? '신규' : '기존'}: ${customer.id}`);
  console.log(`   merchant       ${merchantUser.created ? '신규' : '기존'}: ${merchantUser.id}`);
  console.log(`   merchant (new) ${merchantNewUser.created ? '신규' : '기존'}: ${merchantNewUser.id}`);
  console.log(`   admin          ${admin.created ? '신규' : '기존'}: ${admin.id}`);
  summary.accounts = {
    customer: customer.id,
    merchant: merchantUser.id,
    merchantNew: merchantNewUser.id,
    admin: admin.id,
  };

  console.log('▶ 2) 데모 매장 (기존 점주 소유)');
  const restaurant = await upsertRestaurant();
  console.log(`   restaurant ${restaurant.created ? '신규' : '기존'}: ${restaurant.id}`);
  summary.restaurant_id = restaurant.id;

  console.log('▶ 3) 점주 ↔ 매장 연결 (verified)');
  const merchantRow = await upsertMerchant(merchantUser.id, restaurant.id);
  console.log(`   merchant row ${merchantRow.created ? '신규' : '기존'}: ${merchantRow.id} (verified)`);

  console.log('▶ 4) 메뉴 카테고리/메뉴');
  const catIds = await upsertMenuCategories(restaurant.id);
  const menuCount = await upsertMenus(restaurant.id, catIds);
  console.log(`   categories=${catIds.length}, menus inserted=${menuCount}`);

  console.log('▶ 5) 시간 슬롯');
  const slotCount = await upsertTimeSlots(restaurant.id);
  console.log(`   slots inserted=${slotCount}`);

  console.log('▶ 6) 데모 예약');
  const resCount = await upsertDemoReservations(restaurant.id, customer.id);
  console.log(`   reservations inserted=${resCount}`);

  console.log('▶ 7) 신규 점주 사업자 등록 상태 리셋');
  const removed = await resetPendingMerchant(merchantNewUser.id);
  console.log(`   merchant rows removed: ${removed} (영상 촬영 시 신규 등록부터 시연 가능)`);

  console.log('\n✅ 시드 완료. 로그인 정보:');
  console.log('   고객         :', ACCOUNTS.customer.email, '/', ACCOUNTS.customer.password);
  console.log('   점주 (기존)  :', ACCOUNTS.merchant.email, '/', ACCOUNTS.merchant.password);
  console.log('   점주 (신규)  :', ACCOUNTS.merchantNew.email, '/', ACCOUNTS.merchantNew.password);
  console.log('   관리자       :', ACCOUNTS.admin.username, '/', ACCOUNTS.admin.password);
  console.log('\n📋 영상 시나리오 흐름:');
  console.log('   ① 점주 (신규) 로그인 → 사업자 등록 → AI 메뉴 사진 업로드');
  console.log('   ② 관리자 로그인 → 점주 관리 → 신규 점주 승인');
  console.log('   ③ 고객 로그인 → 매장 검색 → 예약/결제');

  await pool.end();
}

main().catch(err => {
  console.error('❌ Seed 실패:', err);
  process.exit(1);
});
