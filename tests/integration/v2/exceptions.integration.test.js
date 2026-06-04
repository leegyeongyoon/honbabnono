/**
 * v2 풀플로우 예외 시나리오 통합테스트 (실DB)
 *
 * - 만석 슬롯 예약 차단 (pending_payment도 좌석 점유)
 * - 동시 예약 레이스 → 정원 초과 없음 (FOR UPDATE 직렬화 회귀 테스트)
 * - 취소 + 매장 환불 정책 적용 (실제 PortOne 취소 호출 검증)
 * - 노쇼 처리
 * - 주문 거절 + 자동 환불
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
async function setupRestaurant({ maxReservations = 5, slotTime = '18:00', daysAhead = 7 } = {}) {
  const owner = await registerUser('merchant');
  const reg = await registerMerchant(owner.token);
  expect(reg.status).toBe(201);

  const admin = await createAdmin();
  const ver = await verifyMerchant(admin.token, reg.body.data.id, 'verified');
  expect(ver.status).toBe(200);

  const rest = await createRestaurant(owner.token);
  expect(rest.status).toBe(201);
  const restaurantId = rest.body.data?.id ?? rest.body.id;

  const { dateStr, dayOfWeek } = futureDate(daysAhead);
  const slot = await createTimeSlot(owner.token, restaurantId, {
    day_of_week: dayOfWeek, slot_time: slotTime, max_reservations: maxReservations,
  });
  expect(slot.status).toBe(201);

  const menu = await createMenu(owner.token, restaurantId, { price: 10000 });
  expect(menu.status).toBe(201);
  const menuId = menu.body.data?.id ?? menu.body.id;

  return { owner, admin, restaurantId, menuId, dateStr, slotTime };
}

/** 예약 + 주문 + 결제(paid)까지 완료한 고객 셋업 */
async function setupPaidReservation(ctx, { quantity = 1 } = {}) {
  const customer = await registerUser('customer');
  const rsv = await createReservation(customer.token, {
    restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: ctx.slotTime,
  });
  expect(rsv.status).toBe(201);
  const reservation = rsv.body.reservation;

  const order = await createOrder(customer.token, reservation.id, [
    { menu_id: ctx.menuId, quantity },
  ]);
  expect(order.status).toBe(201);
  const orderData = order.body.order ?? order.body.data;
  const amount = Number(orderData.total_amount);

  const { completeRes } = await prepareAndCompletePayment(customer.token, reservation.id, amount, portone);
  expect(completeRes.status).toBe(200);

  return { customer, reservation, order: orderData, amount };
}

describe('v2 풀플로우 예외 시나리오', () => {
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

  it('만석 슬롯은 예약을 차단한다 (미결제 예약도 좌석 점유)', async () => {
    const ctx = await setupRestaurant({ maxReservations: 1 });

    // 첫 예약 (pending_payment — 결제 전이지만 좌석 점유)
    const c1 = await registerUser('cust-full-1');
    const r1 = await createReservation(c1.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: ctx.slotTime,
    });
    expect(r1.status).toBe(201);
    expect(r1.body.reservation.status).toBe('pending_payment');

    // 두 번째 예약 → 만석 차단 (기존엔 pending_payment 미포함 버그로 통과됐었음)
    const c2 = await registerUser('cust-full-2');
    const r2 = await createReservation(c2.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: ctx.slotTime,
    });
    expect(r2.status).toBe(400);
    expect(r2.body.error).toContain('마감');
  }, 30000);

  it('동시 예약 요청이 몰려도 정원을 초과하지 않는다 (FOR UPDATE 직렬화)', async () => {
    const MAX = 3;
    const ATTEMPTS = 6;
    const ctx = await setupRestaurant({ maxReservations: MAX, slotTime: '19:00' });

    // 고객 6명 생성 후 동시에 같은 슬롯 예약 시도
    const customers = await Promise.all(
      Array.from({ length: ATTEMPTS }, (_, i) => registerUser(`cust-race-${i}`))
    );

    const results = await Promise.all(
      customers.map((c) => createReservation(c.token, {
        restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: '19:00',
      }))
    );

    const created = results.filter((r) => r.status === 201).length;
    const blocked = results.filter((r) => r.status === 400).length;

    expect(created).toBe(MAX);        // 정확히 정원만큼만 성공
    expect(blocked).toBe(ATTEMPTS - MAX);

    // DB 레벨 재확인
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM reservations
       WHERE restaurant_id = $1 AND reservation_date = $2 AND reservation_time = $3
         AND status != 'cancelled'`,
      [ctx.restaurantId, ctx.dateStr, '19:00']
    );
    expect(rows[0].cnt).toBe(MAX);
  }, 30000);

  it('예약 취소 시 매장 환불 정책에 따라 환불되고 실제 PG 취소가 호출된다', async () => {
    const ctx = await setupRestaurant({ daysAhead: 7 });

    // 환불 정책: 3일 전 100%, 1일 전 90%, 당일 50%
    const policyRes = await request(app)
      .post(`/api/restaurants/${ctx.restaurantId}/refund-policy`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ policies: [
        { days_before: 3, refund_rate: 100 },
        { days_before: 1, refund_rate: 90 },
        { days_before: 0, refund_rate: 50 },
      ]});
    expect([200, 201]).toContain(policyRes.status);

    const { customer, reservation, amount } = await setupPaidReservation(ctx);

    // 7일 전 취소 → 100% 환불
    const cancelRes = await request(app)
      .put(`/api/reservations/${reservation.id}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ cancel_reason: '통합테스트 취소' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.refund).toBeTruthy();
    expect(cancelRes.body.refund.refundRate).toBe(100);
    expect(cancelRes.body.refund.refundAmount).toBe(amount);

    // 실제 PortOne 취소 호출 검증 (기존엔 DB 상태만 바꾸고 실환불 누락 버그)
    expect(portone.cancelPayment).toHaveBeenCalledTimes(1);

    const { rows } = await pool.query('SELECT status, refund_amount FROM payments WHERE reservation_id = $1', [reservation.id]);
    expect(rows[0].status).toBe('refunded');
    expect(Number(rows[0].refund_amount)).toBe(amount);
  }, 30000);

  it('취소된 예약을 점주가 상태 변경하려 하면 409를 반환한다 (레이스 방어)', async () => {
    const ctx = await setupRestaurant({ slotTime: '12:00' });
    const { customer, reservation } = await setupPaidReservation(ctx);

    // 고객이 먼저 취소
    const cancelRes = await request(app)
      .put(`/api/reservations/${reservation.id}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({});
    expect(cancelRes.status).toBe(200);

    // 점주가 (취소된) 예약을 preparing으로 변경 시도 → 상태 머신에서 차단
    const stRes = await request(app)
      .put(`/api/reservations/${reservation.id}/status`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ status: 'preparing' });
    expect([400, 409]).toContain(stRes.status);
  }, 30000);

  it('노쇼 처리 시 예약이 취소되고 noshow로 기록된다', async () => {
    const ctx = await setupRestaurant({ slotTime: '13:00' });
    const { reservation } = await setupPaidReservation(ctx);

    const noshowRes = await request(app)
      .put(`/api/reservations/${reservation.id}/noshow`)
      .set('Authorization', `Bearer ${ctx.owner.token}`);
    expect(noshowRes.status).toBe(200);

    const { rows } = await pool.query(
      'SELECT status, arrival_status, cancelled_by FROM reservations WHERE id = $1', [reservation.id]
    );
    expect(rows[0].status).toBe('cancelled');
    expect(rows[0].arrival_status).toBe('noshow');
    expect(rows[0].cancelled_by).toBe('merchant');
  }, 30000);

  it('주문 거절 시 예약이 취소되고 전액 자동 환불된다', async () => {
    const ctx = await setupRestaurant({ slotTime: '14:00' });
    const { reservation, order, amount } = await setupPaidReservation(ctx);

    const rejectRes = await request(app)
      .put(`/api/orders/${order.id}/reject`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ reject_reason: '재료 소진' });
    expect(rejectRes.status).toBe(200);

    // 주문 rejected + 예약 cancelled + 결제 refunded + PG 취소 호출
    const orderRow = await pool.query('SELECT cooking_status FROM orders WHERE id = $1', [order.id]);
    expect(orderRow.rows[0].cooking_status).toBe('rejected');

    const rsvRow = await pool.query('SELECT status, cancelled_by FROM reservations WHERE id = $1', [reservation.id]);
    expect(rsvRow.rows[0].status).toBe('cancelled');
    expect(rsvRow.rows[0].cancelled_by).toBe('merchant');

    const payRow = await pool.query('SELECT status, refund_amount FROM payments WHERE reservation_id = $1', [reservation.id]);
    expect(payRow.rows[0].status).toBe('refunded');
    expect(Number(payRow.rows[0].refund_amount)).toBe(amount);

    expect(portone.cancelPayment).toHaveBeenCalledTimes(1);
  }, 30000);

  it('착석(seated) 상태의 주문은 거절할 수 없다', async () => {
    const ctx = await setupRestaurant({ slotTime: '15:00' });
    const { customer, reservation, order } = await setupPaidReservation(ctx);

    // confirmed → preparing → 체크인 → ready → seated
    await request(app).put(`/api/reservations/${reservation.id}/status`)
      .set('Authorization', `Bearer ${ctx.owner.token}`).send({ status: 'preparing' });
    await request(app).post(`/api/reservations/${reservation.id}/checkin`)
      .set('Authorization', `Bearer ${customer.token}`).send({});
    await request(app).put(`/api/reservations/${reservation.id}/status`)
      .set('Authorization', `Bearer ${ctx.owner.token}`).send({ status: 'ready' });
    await request(app).put(`/api/reservations/${reservation.id}/status`)
      .set('Authorization', `Bearer ${ctx.owner.token}`).send({ status: 'seated' });

    const rejectRes = await request(app)
      .put(`/api/orders/${order.id}/reject`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ reject_reason: '거절 시도' });

    expect(rejectRes.status).toBe(400);
    expect(rejectRes.body.error).toContain('착석');
    expect(portone.cancelPayment).not.toHaveBeenCalled();
  }, 30000);
});
