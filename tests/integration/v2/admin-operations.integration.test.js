/**
 * W4 관리자 운영 통합테스트 — 정산 지급 + 결제 환불 (실DB)
 *
 * (a) 결제 완료된 예약 → 정산 process → GET /api/admin/settlements 노출
 *     → PATCH pay → status='paid' + 재호출 409 + 점주 settlement_paid 알림 1건
 * (b) paid 결제 → POST /api/admin/payments/:id/refund 전액
 *     → payments refunded + 예약 cancelled + portone.cancelPayment 호출 + 고객 알림
 * (c) 부분 환불 → partial_refund + refund_amount 누적 + 잔액 초과 요청 400
 */

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

/** verified 점주 + 매장 + 슬롯 + 메뉴 셋업 */
async function setupRestaurant({ slotTime = '18:00', menuPrice = 10000 } = {}) {
  const owner = await registerUser('merchant');
  const reg = await registerMerchant(owner.token);
  const admin = await createAdmin();
  await verifyMerchant(admin.token, reg.body.data.id, 'verified');
  const rest = await createRestaurant(owner.token);
  const restaurantId = rest.body.data?.id ?? rest.body.id;
  const { dateStr, dayOfWeek } = futureDate(7);
  await createTimeSlot(owner.token, restaurantId, { day_of_week: dayOfWeek, slot_time: slotTime });
  const menu = await createMenu(owner.token, restaurantId, { price: menuPrice });
  const menuId = menu.body.data?.id ?? menu.body.id;
  return { owner, admin, restaurantId, menuId, dateStr, slotTime };
}

/** 결제 완료된 예약 1건 생성 → { reservationId, paymentId } */
async function createPaidReservation(ctx, { slotTime, amount = 10000 } = {}) {
  const customer = await registerUser('customer');
  const rsv = await createReservation(customer.token, {
    restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: slotTime ?? ctx.slotTime,
  });
  const reservation = rsv.body.reservation;
  await createOrder(customer.token, reservation.id, [{ menu_id: ctx.menuId, quantity: amount / 10000 }]);
  await prepareAndCompletePayment(customer.token, reservation.id, amount, portone);

  const { rows } = await pool.query(
    "SELECT id FROM payments WHERE reservation_id = $1 AND status = 'paid'", [reservation.id]
  );
  return { customer, reservationId: reservation.id, paymentId: rows[0].id };
}

/** 알림 카운트 */
async function countNotifications(userId, type) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM notifications WHERE user_id = $1 AND type = $2',
    [userId, type]
  );
  return rows[0].cnt;
}

describe('W4: 관리자 정산 지급 + 결제 환불', () => {
  beforeAll(async () => {
    await cleanV2Data();
  });

  afterAll(async () => {
    await cleanV2Data();
    await pool.end().catch(() => {});
  });

  beforeEach(() => {
    portone.cancelPayment.mockClear();
  });

  it('(a) 정산 생성→목록 노출→지급 처리→재호출 409→점주 알림 1건', async () => {
    const ctx = await setupRestaurant({ slotTime: '18:00' });
    const { reservationId } = await createPaidReservation(ctx, { slotTime: '18:00' });

    // 조리 served + 예약 completed → 정산 대상화
    await pool.query(`UPDATE orders SET cooking_status = 'served' WHERE reservation_id = $1`, [reservationId]);
    await pool.query(`UPDATE reservations SET status = 'completed' WHERE id = $1`, [reservationId]);

    // 정산 실행
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const settleRes = await request(app)
      .post('/api/settlements/process')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ period_end: tomorrow });
    expect(settleRes.status).toBe(200);
    expect(settleRes.body.data.settlementsCreated).toBeGreaterThanOrEqual(1);

    // GET /api/admin/settlements 노출 + counts
    const listRes = await request(app)
      .get('/api/admin/settlements')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    const settlement = listRes.body.settlements.find((s) => s.restaurant_id === ctx.restaurantId);
    expect(settlement).toBeTruthy();
    expect(settlement.status).toBe('pending');
    expect(settlement.restaurant_name).toBeTruthy();
    expect(settlement.owner_name).toBeTruthy();
    expect(listRes.body.counts.pending.count).toBeGreaterThanOrEqual(1);

    // PATCH pay
    const payRes = await request(app)
      .patch(`/api/admin/settlements/${settlement.id}/pay`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(payRes.status).toBe(200);
    expect(payRes.body.settlement.status).toBe('paid');
    expect(payRes.body.settlement.paid_at).toBeTruthy();

    // DB 상태 확인
    const { rows } = await pool.query('SELECT status, paid_at FROM settlements WHERE id = $1', [settlement.id]);
    expect(rows[0].status).toBe('paid');
    expect(rows[0].paid_at).toBeTruthy();

    // 재호출 → 409
    const payAgain = await request(app)
      .patch(`/api/admin/settlements/${settlement.id}/pay`)
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(payAgain.status).toBe(409);
    expect(payAgain.body.error).toContain('이미 지급');

    // 점주 알림 1건 (비동기 — 대기)
    await new Promise((r) => setTimeout(r, 300));
    expect(await countNotifications(ctx.owner.userId, 'settlement_paid')).toBe(1);

    // 존재하지 않는 정산 → 404
    const notFound = await request(app)
      .patch('/api/admin/settlements/00000000-0000-0000-0000-000000000000/pay')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(notFound.status).toBe(404);
  }, 40000);

  it('(b) paid 결제 전액 환불 → refunded + 예약 cancelled + PG 취소 호출 + 고객 알림', async () => {
    const ctx = await setupRestaurant({ slotTime: '19:00' });
    const { customer, reservationId, paymentId } = await createPaidReservation(ctx, { slotTime: '19:00' });

    // GET /api/admin/payments 노출 + totals
    const listRes = await request(app)
      .get('/api/admin/payments')
      .set('Authorization', `Bearer ${ctx.admin.token}`);
    expect(listRes.status).toBe(200);
    const payment = listRes.body.payments.find((p) => p.id === paymentId);
    expect(payment).toBeTruthy();
    expect(payment.customer_name).toBeTruthy();
    expect(payment.restaurant_name).toBeTruthy();
    expect(listRes.body.totals.paid_amount).toBeGreaterThanOrEqual(10000);

    // 전액 환불 (amount 미지정 → 잔액 전액)
    const refundRes = await request(app)
      .post(`/api/admin/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ reason: '관리자 테스트 환불' });
    expect(refundRes.status).toBe(200);
    expect(refundRes.body.refund.status).toBe('refunded');
    expect(refundRes.body.refund.refund_amount).toBe(10000);

    // portone.cancelPayment 호출 확인
    expect(portone.cancelPayment).toHaveBeenCalledTimes(1);

    // DB: payment refunded + reservation cancelled (cancelled_by='admin')
    const { rows: pRows } = await pool.query(
      'SELECT status, refund_amount FROM payments WHERE id = $1', [paymentId]);
    expect(pRows[0].status).toBe('refunded');
    expect(Number(pRows[0].refund_amount)).toBe(10000);

    const { rows: rRows } = await pool.query(
      'SELECT status, cancelled_by FROM reservations WHERE id = $1', [reservationId]);
    expect(rRows[0].status).toBe('cancelled');
    expect(rRows[0].cancelled_by).toBe('admin');

    // 고객 알림 (비동기)
    await new Promise((r) => setTimeout(r, 300));
    expect(await countNotifications(customer.userId, 'refund')).toBe(1);
  }, 40000);

  it('(c) 부분 환불 → partial_refund + 누적 + 잔액 초과 요청 400', async () => {
    const ctx = await setupRestaurant({ slotTime: '20:00' });
    const { paymentId } = await createPaidReservation(ctx, { slotTime: '20:00' });

    // 1차: 3000원 부분 환불 → partial_refund
    const refund1 = await request(app)
      .post(`/api/admin/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ amount: 3000, reason: '부분환불 1' });
    expect(refund1.status).toBe(200);
    expect(refund1.body.refund.status).toBe('partial_refund');
    expect(refund1.body.refund.refund_amount).toBe(3000);
    expect(refund1.body.refund.total_refunded).toBe(3000);

    // 2차: 4000원 추가 → 누적 7000, 여전히 partial_refund
    const refund2 = await request(app)
      .post(`/api/admin/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ amount: 4000, reason: '부분환불 2' });
    expect(refund2.status).toBe(200);
    expect(refund2.body.refund.status).toBe('partial_refund');
    expect(refund2.body.refund.total_refunded).toBe(7000);

    // DB: 누적 7000
    const { rows } = await pool.query(
      'SELECT status, refund_amount FROM payments WHERE id = $1', [paymentId]);
    expect(rows[0].status).toBe('partial_refund');
    expect(Number(rows[0].refund_amount)).toBe(7000);

    // 잔액(3000) 초과 요청 → 400
    const refundOver = await request(app)
      .post(`/api/admin/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ amount: 5000, reason: '초과 시도' });
    expect(refundOver.status).toBe(400);
    expect(refundOver.body.error).toContain('잔액');

    // 잔액 전액(3000) 환불 → refunded
    const refundFinal = await request(app)
      .post(`/api/admin/payments/${paymentId}/refund`)
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ reason: '나머지 전액' });
    expect(refundFinal.status).toBe(200);
    expect(refundFinal.body.refund.status).toBe('refunded');
    expect(refundFinal.body.refund.total_refunded).toBe(10000);
  }, 40000);
});
