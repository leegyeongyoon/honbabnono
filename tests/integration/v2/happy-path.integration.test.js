/**
 * v2 풀플로우 해피패스 통합테스트 (실DB)
 *
 * 점주가입 → 사업자등록 → 관리자승인 → 매장등록 → 타임슬롯 → 메뉴등록
 * → 고객가입 → 매장검색 → 예약 → 주문 → 선결제(PortOne mock) → 조리 상태 전이
 * → 체크인 → 완료 → 리뷰 작성 → 정산 실행 → 점주 정산 조회
 *
 * 전제: 테스트 DB 연결 (globalSetup이 마이그레이션 자동 적용)
 */

// PortOne 외부 API 차단 (실네트워크 호출 금지)
jest.mock('../../../server/config/portone', () => ({
  config: {},
  getAccessToken: jest.fn(),
  verifyPayment: jest.fn(),
  cancelPayment: jest.fn().mockResolvedValue({ status: 'cancelled' }),
  verifyWebhookPayment: jest.fn(),
  isValidMerchantUid: jest.fn(() => true),
}));

const portone = require('../../../server/config/portone');
const {
  app, pool, request,
  cleanV2Data, registerUser, createAdmin,
  registerMerchant, verifyMerchant, createRestaurant,
  futureDate, createTimeSlot, createMenu,
  createReservation, createOrder, prepareAndCompletePayment,
} = require('./helpers/v2flow.helper');

describe('v2 풀플로우 해피패스', () => {
  beforeAll(async () => {
    await cleanV2Data();
  });

  afterAll(async () => {
    await cleanV2Data();
    await pool.end().catch(() => {});
  });

  it('점주가입부터 정산까지 전체 플로우가 끊김 없이 동작한다', async () => {
    // ── 1. 점주 회원가입 ──
    const owner = await registerUser('merchant');

    // ── 2. 사업자 등록 신청 (pending) ──
    const regRes = await registerMerchant(owner.token);
    expect(regRes.status).toBe(201);
    expect(regRes.body.data.verification_status).toBe('pending');
    const merchantId = regRes.body.data.id;

    // 미승인 상태에서는 매장 등록 불가
    const blockedRes = await createRestaurant(owner.token);
    expect(blockedRes.status).toBe(403);

    // ── 3. 관리자 승인 ──
    const admin = await createAdmin();
    const verifyRes = await verifyMerchant(admin.token, merchantId, 'verified');
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verification_status).toBe('verified');
    expect(verifyRes.body.data.verified_at).toBeTruthy();

    // ── 4. 매장 등록 ──
    const restRes = await createRestaurant(owner.token, { name: '잇테이블 해피패스점' });
    expect(restRes.status).toBe(201);
    const restaurantId = restRes.body.data?.id ?? restRes.body.id;
    expect(restaurantId).toBeTruthy();

    // ── 5. 타임슬롯 생성 (7일 뒤 요일, 18:00) ──
    const { dateStr, dayOfWeek } = futureDate(7);
    const slotRes = await createTimeSlot(owner.token, restaurantId, {
      day_of_week: dayOfWeek, slot_time: '18:00', max_reservations: 5,
    });
    expect(slotRes.status).toBe(201);

    // ── 6. 메뉴 등록 ──
    const menuRes = await createMenu(owner.token, restaurantId, { name: '돼지국밥', price: 12000 });
    expect(menuRes.status).toBe(201);
    const menuId = menuRes.body.data?.id ?? menuRes.body.id;
    expect(menuId).toBeTruthy();

    // ── 7. 고객 회원가입 ──
    const customer = await registerUser('customer');

    // ── 8. 매장 검색으로 노출 확인 ──
    const searchRes = await request(app)
      .get('/api/restaurants/search')
      .query({ q: '해피패스' });
    expect(searchRes.status).toBe(200);
    const searched = (searchRes.body.data ?? searchRes.body.restaurants ?? []);
    expect(JSON.stringify(searched)).toContain(restaurantId);

    // ── 9. 예약 생성 (pending_payment + QR 발급) ──
    const rsvRes = await createReservation(customer.token, {
      restaurant_id: restaurantId, reservation_date: dateStr, reservation_time: '18:00', party_size: 2,
    });
    expect(rsvRes.status).toBe(201);
    const reservation = rsvRes.body.reservation;
    expect(reservation.status).toBe('pending_payment');
    expect(reservation.qr_code).toBeTruthy();

    // ── 10. 주문 생성 (12000 × 2 = 24000) ──
    const orderRes = await createOrder(customer.token, reservation.id, [
      { menu_id: menuId, quantity: 2 },
    ]);
    expect(orderRes.status).toBe(201);
    const order = orderRes.body.order ?? orderRes.body.data;
    expect(Number(order.total_amount)).toBe(24000);

    // ── 11~12. 결제 준비 + 완료 (PortOne mock) ──
    const { completeRes } = await prepareAndCompletePayment(customer.token, reservation.id, 24000, portone);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.payment.status).toBe('paid');
    expect(portone.verifyPayment).toHaveBeenCalled();

    // 예약이 confirmed로 전이됐는지 확인
    const afterPay = await pool.query('SELECT status FROM reservations WHERE id = $1', [reservation.id]);
    expect(afterPay.rows[0].status).toBe('confirmed');

    // ── 13. 점주: 조리 상태 전이 (pending → preparing → cooking → ready) ──
    for (const cooking_status of ['preparing', 'cooking', 'ready']) {
      const cookRes = await request(app)
        .put(`/api/orders/${order.id}/cooking-status`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ cooking_status });
      expect(cookRes.status).toBe(200);
    }

    // 점주: 예약 보드 상태 전이 (confirmed → preparing)
    const prepRes = await request(app)
      .put(`/api/reservations/${reservation.id}/status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'preparing' });
    expect(prepRes.status).toBe(200);

    // ── 14. 고객 QR 체크인 (preparing 상태에서 가능) ──
    const wrongQr = await request(app)
      .post(`/api/reservations/${reservation.id}/checkin`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ qrCode: 'wrong-qr-code' });
    expect(wrongQr.status).toBe(400); // 잘못된 QR 차단

    const checkinRes = await request(app)
      .post(`/api/reservations/${reservation.id}/checkin`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ qrCode: reservation.qr_code });
    expect(checkinRes.status).toBe(200);

    const afterCheckin = await pool.query(
      'SELECT checked_in_at, arrival_status FROM reservations WHERE id = $1', [reservation.id]
    );
    expect(afterCheckin.rows[0].checked_in_at).toBeTruthy();
    expect(afterCheckin.rows[0].arrival_status).toBe('arrived');

    // 점주: 완료 처리 (preparing → ready → seated → completed)
    for (const status of ['ready', 'seated', 'completed']) {
      const stRes = await request(app)
        .put(`/api/reservations/${reservation.id}/status`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ status });
      expect(stRes.status).toBe(200);
    }

    // 주문 제공 완료 (ready → served)
    const servedRes = await request(app)
      .put(`/api/orders/${order.id}/cooking-status`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ cooking_status: 'served' });
    expect(servedRes.status).toBe(200);

    // ── 15. 리뷰 작성 (3축 평가, completed 예약만 가능) ──
    const reviewRes = await request(app)
      .post('/api/reviews/restaurant')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        reservation_id: reservation.id,
        restaurant_id: restaurantId,
        taste_rating: 5, service_rating: 4, ambiance_rating: 5,
        content: '통합테스트 리뷰입니다. 음식이 빨리 나와서 좋았어요!',
      });
    expect(reviewRes.status).toBe(201);

    // ── 16. 정산 실행 (관리자) — period_end를 내일로 지정해 오늘 주문 포함 ──
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const settleRes = await request(app)
      .post('/api/settlements/process')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ period_end: tomorrow });
    expect(settleRes.status).toBe(200);
    expect(settleRes.body.data.settlementsCreated).toBeGreaterThanOrEqual(1);
    expect(settleRes.body.data.ordersProcessed).toBeGreaterThanOrEqual(1);

    // ── 17. 점주 정산 조회 ──
    const summaryRes = await request(app)
      .get('/api/settlements/merchant/summary')
      .set('Authorization', `Bearer ${owner.token}`);
    expect(summaryRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/settlements/merchant')
      .set('Authorization', `Bearer ${owner.token}`);
    expect(listRes.status).toBe(200);
    const settlements = listRes.body.data?.settlements ?? listRes.body.settlements ?? listRes.body.data ?? [];
    expect(JSON.stringify(settlements)).toContain('24000');

    // ── 최종 무결성: 정산액 = 총매출 - 플랫폼수수료 - 결제수수료 ──
    const settlementRow = await pool.query(
      'SELECT total_sales, platform_fee, payment_fee, settlement_amount FROM settlements WHERE restaurant_id = $1',
      [restaurantId]
    );
    expect(settlementRow.rows.length).toBe(1);
    const s = settlementRow.rows[0];
    expect(Number(s.total_sales)).toBe(24000);
    expect(Number(s.settlement_amount)).toBe(
      Number(s.total_sales) - Number(s.platform_fee) - Number(s.payment_fee)
    );
  }, 60000);
});
