/**
 * v2 풀플로우 통합테스트 헬퍼
 *
 * 실제 엔드포인트만 호출해 플로우를 구성한다 (test-seed-v2 같은 단축 경로 사용 금지).
 * 테스트 데이터 네임스페이스: 이메일 *@test.local, 관리자 username v2test-*
 */
const request = require('supertest');
const { app } = require('../../../../server/index');
const pool = require('../../../../server/config/database');
const { createAdminToken } = require('../../../mocks/jwt.mock');

let seq = 0;
const uniq = () => `${Date.now()}${process.pid}${seq++}`;

/** v2 테이블 + 테스트 네임스페이스 데이터 정리 (suite 단위 격리) */
async function cleanV2Data() {
  await pool.query(`
    TRUNCATE TABLE
      settlement_items, settlements, restaurant_reviews, payments,
      order_items, orders, reservations, restaurant_refund_policies,
      menu_option_items, menu_option_groups, menus, menu_categories,
      restaurant_time_slots, restaurants, merchants
    CASCADE
  `);
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.local'");
  await pool.query("DELETE FROM admins WHERE username LIKE 'v2test-%'");
}

/** 실제 회원가입 엔드포인트로 사용자 생성 → { token, userId, email } */
async function registerUser(label) {
  const email = `${label}-${uniq()}@test.local`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'test-pass-1234!', name: `${label}유저` });

  if (res.status !== 201 || !res.body.token) {
    throw new Error(`회원가입 실패(${res.status}): ${JSON.stringify(res.body)}`);
  }
  const userId = res.body.user?.id;
  if (!userId) throw new Error(`회원가입 응답에 user.id 없음: ${JSON.stringify(res.body)}`);
  return { token: res.body.token, userId, email };
}

/** admins 테이블에 테스트 관리자 INSERT → { adminId, token } */
async function createAdmin() {
  const username = `v2test-${uniq()}`;
  const { rows } = await pool.query(
    `INSERT INTO admins (username, password_hash, email, role, is_active)
     VALUES ($1, 'test-hash', $2, 'admin', true) RETURNING id`,
    [username, `${username}@test.local`]
  );
  return { adminId: rows[0].id, token: createAdminToken({ adminId: rows[0].id, username }) };
}

/** 점주 등록 신청 (verification_status=pending) */
async function registerMerchant(token, overrides = {}) {
  const res = await request(app)
    .post('/api/merchants/register')
    .set('Authorization', `Bearer ${token}`)
    .send({
      business_number: '1234567890',
      business_name: '잇테이블 테스트식당',
      representative_name: '김테스트',
      bank_name: '국민은행',
      bank_account: '12345678901234',
      bank_holder: '김테스트',
      ...overrides,
    });
  return res;
}

/** 관리자가 점주 승인/거절 */
async function verifyMerchant(adminToken, merchantId, status = 'verified', reject_reason) {
  return request(app)
    .patch(`/api/admin/merchants/${merchantId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status, reject_reason });
}

/** 매장 등록 (verified 점주 전용) */
async function createRestaurant(merchantToken, overrides = {}) {
  return request(app)
    .post('/api/restaurants')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      name: `테스트식당-${uniq()}`,
      category: '한식',
      address: '서울시 강남구 테스트로 1',
      description: '통합테스트용 매장',
      phone: '02-1234-5678',
      ...overrides,
    });
}

/** N일 뒤 날짜를 YYYY-MM-DD(로컬)로 반환 + 해당 날짜의 day_of_week */
function futureDate(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  // createReservation과 동일한 방식으로 요일 계산 (new Date('YYYY-MM-DD').getDay())
  return { dateStr, dayOfWeek: new Date(dateStr).getDay() };
}

/** 타임슬롯 생성 */
async function createTimeSlot(merchantToken, restaurantId, { day_of_week, slot_time = '18:00', max_reservations = 5 }) {
  return request(app)
    .post(`/api/restaurants/${restaurantId}/time-slots`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ day_of_week, slot_time, max_reservations });
}

/** 메뉴 생성 */
async function createMenu(merchantToken, restaurantId, overrides = {}) {
  return request(app)
    .post('/api/menus')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      restaurant_id: restaurantId,
      name: `테스트메뉴-${uniq()}`,
      price: 15000,
      description: '통합테스트용 메뉴입니다',
      ...overrides,
    });
}

/** 예약 생성 */
async function createReservation(customerToken, { restaurant_id, reservation_date, reservation_time = '18:00', party_size = 2 }) {
  return request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ restaurant_id, reservation_date, reservation_time, party_size });
}

/** 주문 생성 */
async function createOrder(customerToken, reservationId, items) {
  return request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ reservation_id: reservationId, items });
}

/**
 * 결제 준비 + 완료 (PortOne mock 필요 — 테스트 파일에서 jest.mock 선언)
 * @param {Object} portoneMock - mock된 portone 모듈 (verifyPayment를 여기서 설정)
 */
async function prepareAndCompletePayment(customerToken, reservationId, amount, portoneMock) {
  const prepareRes = await request(app)
    .post('/api/payments/prepare')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ reservation_id: reservationId, amount, payment_method: 'card' });

  if (prepareRes.status !== 200) {
    throw new Error(`결제 준비 실패(${prepareRes.status}): ${JSON.stringify(prepareRes.body)}`);
  }

  const { merchantUid } = prepareRes.body.paymentData;
  const impUid = `imp_test_${uniq()}`;

  // completePayment의 금액 일치 검증을 통과하도록 mock 설정
  portoneMock.verifyPayment.mockResolvedValue({
    amount,
    status: 'paid',
    merchant_uid: merchantUid,
    pg_provider: 'mock-pg',
    card_name: '테스트카드',
    card_number: '1234-12**-****-1234',
    receipt_url: null,
  });

  const completeRes = await request(app)
    .post('/api/payments/complete')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ imp_uid: impUid, merchant_uid: merchantUid });

  return { prepareRes, completeRes, merchantUid, impUid };
}

module.exports = {
  app,
  pool,
  request,
  uniq,
  cleanV2Data,
  registerUser,
  createAdmin,
  registerMerchant,
  verifyMerchant,
  createRestaurant,
  futureDate,
  createTimeSlot,
  createMenu,
  createReservation,
  createOrder,
  prepareAndCompletePayment,
};
