/**
 * W0 고도화 통합테스트 — 알림 커버리지 + 옵션 금액 서버 계산 (실DB)
 *
 * - 결제 완료 → 점주 reservation_paid 알림 1건 (complete 재호출/웹훅 중복 시에도 1건)
 * - 고객 취소 → 점주 reservation_cancelled 알림
 * - 정산 생성 → 점주 settlement_created 알림
 * - 옵션 포함 주문 → 서버 권위 금액 계산 + 스냅샷 저장
 * - 타 메뉴의 옵션 ID → 400
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

/** 점주 알림 카운트 조회 */
async function countNotifications(userId, type) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM notifications WHERE user_id = $1 AND type = $2',
    [userId, type]
  );
  return rows[0].cnt;
}

describe('W0: 알림 커버리지 + 옵션 금액', () => {
  beforeAll(async () => {
    await cleanV2Data();
  });

  afterAll(async () => {
    await cleanV2Data();
    await pool.end().catch(() => {});
  });

  it('결제 완료 시 점주에게 새 예약 알림이 정확히 1건 발송된다 (중복 호출 멱등)', async () => {
    const ctx = await setupRestaurant();
    const customer = await registerUser('customer');

    const rsv = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: ctx.slotTime,
    });
    const reservation = rsv.body.reservation;
    await createOrder(customer.token, reservation.id, [{ menu_id: ctx.menuId, quantity: 1 }]);

    const { completeRes, merchantUid, impUid } = await prepareAndCompletePayment(
      customer.token, reservation.id, 10000, portone
    );
    expect(completeRes.status).toBe(200);

    // 알림은 비동기 발송 — 짧게 대기
    await new Promise((r) => setTimeout(r, 300));
    expect(await countNotifications(ctx.owner.userId, 'reservation_paid')).toBe(1);

    // complete 재호출 (이미 paid — 멱등) → 알림 그대로 1건
    const again = await request(app)
      .post('/api/payments/complete')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ imp_uid: impUid, merchant_uid: merchantUid });
    expect(again.status).toBe(200);

    // 웹훅 중복 수신 → 알림 그대로 1건
    portone.verifyWebhookPayment.mockResolvedValue({
      amount: 10000, status: 'paid', merchant_uid: merchantUid,
    });
    await request(app).post('/api/payments/webhook').send({ imp_uid: impUid, merchant_uid: merchantUid });

    await new Promise((r) => setTimeout(r, 300));
    expect(await countNotifications(ctx.owner.userId, 'reservation_paid')).toBe(1);
  }, 30000);

  it('고객 취소 시 점주에게 취소 알림이 발송된다', async () => {
    const ctx = await setupRestaurant({ slotTime: '12:00' });
    const customer = await registerUser('customer');

    const rsv = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: '12:00',
    });
    const reservation = rsv.body.reservation;
    await createOrder(customer.token, reservation.id, [{ menu_id: ctx.menuId, quantity: 1 }]);
    await prepareAndCompletePayment(customer.token, reservation.id, 10000, portone);

    const cancelRes = await request(app)
      .put(`/api/reservations/${reservation.id}/cancel`)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({});
    expect(cancelRes.status).toBe(200);

    // 알림은 비동기 발송 — 짧게 대기
    await new Promise((r) => setTimeout(r, 300));
    expect(await countNotifications(ctx.owner.userId, 'reservation_cancelled')).toBe(1);
  }, 30000);

  it('정산 생성 시 점주에게 정산 알림이 발송된다', async () => {
    const ctx = await setupRestaurant({ slotTime: '13:00' });
    const customer = await registerUser('customer');

    const rsv = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: '13:00',
    });
    const reservation = rsv.body.reservation;
    await createOrder(customer.token, reservation.id, [{ menu_id: ctx.menuId, quantity: 1 }]);
    await prepareAndCompletePayment(customer.token, reservation.id, 10000, portone);

    // 조리 served + 예약 completed 로 정산 대상화
    await pool.query(
      `UPDATE orders SET cooking_status = 'served' WHERE reservation_id = $1`, [reservation.id]);
    await pool.query(
      `UPDATE reservations SET status = 'completed' WHERE id = $1`, [reservation.id]);

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const settleRes = await request(app)
      .post('/api/settlements/process')
      .set('Authorization', `Bearer ${ctx.admin.token}`)
      .send({ period_end: tomorrow });
    expect(settleRes.status).toBe(200);
    expect(settleRes.body.data.settlementsCreated).toBeGreaterThanOrEqual(1);

    await new Promise((r) => setTimeout(r, 300));
    expect(await countNotifications(ctx.owner.userId, 'settlement_created')).toBe(1);
  }, 30000);

  it('옵션 포함 주문은 서버가 옵션 가격을 재조회해 합산한다', async () => {
    const ctx = await setupRestaurant({ slotTime: '14:00', menuPrice: 10000 });

    // 옵션 그룹 + 아이템 2개 (+500, +1500)
    const groupRes = await request(app)
      .post(`/api/menus/${ctx.menuId}/options`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ name: '맵기 선택', is_required: true, min_select: 1, max_select: 2 });
    expect(groupRes.status).toBe(201);
    const groupId = groupRes.body.data.id;

    const item1 = await request(app)
      .post(`/api/menus/options/${groupId}/items`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ name: '매운맛', additional_price: 500 });
    const item2 = await request(app)
      .post(`/api/menus/options/${groupId}/items`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ name: '곱빼기', additional_price: 1500 });
    expect(item1.status).toBe(201);
    expect(item2.status).toBe(201);

    const customer = await registerUser('customer');
    const rsv = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: '14:00',
    });

    // (10000 + 500 + 1500) × 2 = 24000
    const orderRes = await createOrder(customer.token, rsv.body.reservation.id, [{
      menu_id: ctx.menuId,
      quantity: 2,
      options: [{ group_id: groupId, item_ids: [item1.body.data.id, item2.body.data.id] }],
    }]);
    expect(orderRes.status).toBe(201);
    const order = orderRes.body.order;
    expect(Number(order.total_amount)).toBe(24000);

    // 스냅샷 저장 확인 (점주 표시용 — 이름/가격)
    const { rows } = await pool.query(
      'SELECT options, unit_price, subtotal FROM order_items WHERE order_id = $1', [order.id]);
    expect(rows[0].unit_price).toBe(12000);
    expect(rows[0].subtotal).toBe(24000);
    const snapshot = rows[0].options;
    expect(Array.isArray(snapshot)).toBe(true);
    expect(snapshot.map((s) => s.name).sort()).toEqual(['곱빼기', '매운맛']);
    expect(snapshot.find((s) => s.name === '곱빼기').additional_price).toBe(1500);
  }, 30000);

  it('다른 메뉴의 옵션 ID로 주문하면 400을 반환한다', async () => {
    const ctx = await setupRestaurant({ slotTime: '15:00' });

    // 다른 메뉴 + 그 메뉴의 옵션
    const otherMenu = await createMenu(ctx.owner.token, ctx.restaurantId, { name: '다른메뉴', price: 5000 });
    const otherMenuId = otherMenu.body.data?.id ?? otherMenu.body.id;
    const groupRes = await request(app)
      .post(`/api/menus/${otherMenuId}/options`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ name: '사이즈' });
    const itemRes = await request(app)
      .post(`/api/menus/options/${groupRes.body.data.id}/items`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ name: '대', additional_price: 1000 });

    const customer = await registerUser('customer');
    const rsv = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: '15:00',
    });

    // ctx.menuId 주문에 otherMenu의 옵션을 끼워넣기 → 400
    const orderRes = await createOrder(customer.token, rsv.body.reservation.id, [{
      menu_id: ctx.menuId,
      quantity: 1,
      options: [{ group_id: groupRes.body.data.id, item_ids: [itemRes.body.data.id] }],
    }]);
    expect(orderRes.status).toBe(400);
    expect(orderRes.body.error).toContain('옵션');
  }, 30000);
});
