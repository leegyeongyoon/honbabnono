/**
 * W1 운영 정책 통합테스트 (실DB)
 *
 * - 예약 일시중지 / 휴무일 / 과거 날짜 / 예약 상한 차단
 * - getTimeSlots 휴무일 플래그
 * - 점주 수동(전화) 예약 + 보드 노출 (LEFT JOIN 회귀)
 * - 메뉴 품절(is_active) 토글
 */

jest.mock('../../../server/config/portone', () => ({
  config: {},
  getAccessToken: jest.fn(),
  verifyPayment: jest.fn(),
  cancelPayment: jest.fn().mockResolvedValue({ status: 'cancelled' }),
  verifyWebhookPayment: jest.fn(),
  isValidMerchantUid: jest.fn(() => true),
}));

const {
  app, pool, request,
  cleanV2Data, registerUser, createAdmin,
  registerMerchant, verifyMerchant, createRestaurant,
  futureDate, createTimeSlot, createMenu, createReservation,
} = require('./helpers/v2flow.helper');

async function setupRestaurant({ slotTime = '18:00', daysAhead = 7 } = {}) {
  const owner = await registerUser('merchant');
  const reg = await registerMerchant(owner.token);
  const admin = await createAdmin();
  await verifyMerchant(admin.token, reg.body.data.id, 'verified');
  const rest = await createRestaurant(owner.token);
  const restaurantId = rest.body.data?.id ?? rest.body.id;
  const { dateStr, dayOfWeek } = futureDate(daysAhead);
  await createTimeSlot(owner.token, restaurantId, { day_of_week: dayOfWeek, slot_time: slotTime });
  const menu = await createMenu(owner.token, restaurantId);
  const menuId = menu.body.data?.id ?? menu.body.id;
  return { owner, admin, restaurantId, menuId, dateStr, slotTime };
}

describe('W1: 운영 정책', () => {
  beforeAll(async () => {
    await cleanV2Data();
  });

  afterAll(async () => {
    await cleanV2Data();
    await pool.end().catch(() => {});
  });

  it('예약 일시중지 토글 시 예약이 차단되고, 해제하면 다시 가능하다', async () => {
    const ctx = await setupRestaurant();
    const customer = await registerUser('customer');

    // 일시중지 (사유 포함)
    const pauseRes = await request(app)
      .put(`/api/restaurants/${ctx.restaurantId}`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ is_accepting_reservations: false, pause_reason: '재료 소진' });
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.is_accepting_reservations).toBe(false);

    const blocked = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: ctx.slotTime,
    });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toContain('재료 소진');

    // 재개
    await request(app)
      .put(`/api/restaurants/${ctx.restaurantId}`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ is_accepting_reservations: true, pause_reason: null });

    const ok = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: ctx.slotTime,
    });
    expect(ok.status).toBe(201);
  }, 30000);

  it('휴무일로 지정된 날짜는 예약이 차단되고 슬롯 조회에 is_holiday가 표시된다', async () => {
    const ctx = await setupRestaurant({ slotTime: '12:00' });
    const customer = await registerUser('customer');

    const holidayRes = await request(app)
      .put(`/api/restaurants/${ctx.restaurantId}`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ holidays: [ctx.dateStr] });
    expect(holidayRes.status).toBe(200);

    const blocked = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: '12:00',
    });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toContain('휴무일');

    const slotsRes = await request(app)
      .get(`/api/restaurants/${ctx.restaurantId}/time-slots`)
      .query({ date: ctx.dateStr });
    expect(slotsRes.status).toBe(200);
    expect(slotsRes.body.is_holiday).toBe(true);
    expect(slotsRes.body.data).toEqual([]);
  }, 30000);

  it('과거 날짜와 예약 상한 초과 날짜는 차단된다', async () => {
    const ctx = await setupRestaurant({ slotTime: '13:00' });
    const customer = await registerUser('customer');

    // 과거
    const past = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: '2020-01-01', reservation_time: '13:00',
    });
    expect(past.status).toBe(400);
    expect(past.body.error).toContain('과거');

    // 상한 (max_advance_days=3으로 좁힌 뒤 7일 후 예약 시도)
    await request(app)
      .put(`/api/restaurants/${ctx.restaurantId}`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ max_advance_days: 3 });

    const tooFar = await createReservation(customer.token, {
      restaurant_id: ctx.restaurantId, reservation_date: ctx.dateStr, reservation_time: '13:00',
    });
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.error).toContain('3일');
  }, 30000);

  it('점주가 전화 예약을 수동 등록하면 보드 목록에 게스트 이름으로 노출된다', async () => {
    const ctx = await setupRestaurant({ slotTime: '14:00' });

    const manualRes = await request(app)
      .post('/api/reservations/manual')
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({
        reservation_date: ctx.dateStr,
        reservation_time: '14:00',
        party_size: 4,
        guest_name: '김전화',
        guest_phone: '010-1234-5678',
      });
    expect(manualRes.status).toBe(201);
    expect(manualRes.body.reservation.status).toBe('confirmed');
    expect(manualRes.body.reservation.is_manual).toBe(true);
    expect(manualRes.body.reservation.guest_name).toBe('김전화');

    // 보드 목록 노출 (LEFT JOIN — user_id NULL이어도 누락되지 않아야 함)
    const boardRes = await request(app)
      .get('/api/reservations/merchant')
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .query({ date: ctx.dateStr });
    expect(boardRes.status).toBe(200);
    const manual = boardRes.body.reservations.find((r) => r.is_manual);
    expect(manual).toBeTruthy();
    expect(manual.customer_name).toBe('김전화');
  }, 30000);

  it('수동 예약도 정원을 점유한다', async () => {
    const ctx = await setupRestaurant({ slotTime: '15:00' });
    // max_reservations 1로 재설정
    await createTimeSlot(ctx.owner.token, ctx.restaurantId, {
      day_of_week: new Date(ctx.dateStr).getDay(), slot_time: '15:00', max_reservations: 1,
    });

    const first = await request(app)
      .post('/api/reservations/manual')
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ reservation_date: ctx.dateStr, reservation_time: '15:00', party_size: 2, guest_name: '첫손님' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/reservations/manual')
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ reservation_date: ctx.dateStr, reservation_time: '15:00', party_size: 2, guest_name: '둘째손님' });
    expect(second.status).toBe(400);
    expect(second.body.error).toContain('마감');
  }, 30000);

  it('점주가 메뉴를 품절(is_active=false) 처리할 수 있다', async () => {
    const ctx = await setupRestaurant({ slotTime: '16:00' });

    const offRes = await request(app)
      .put(`/api/menus/${ctx.menuId}`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ is_active: false });
    expect(offRes.status).toBe(200);

    const { rows } = await pool.query('SELECT is_active FROM menus WHERE id = $1', [ctx.menuId]);
    expect(rows[0].is_active).toBe(false);

    // 다시 판매 재개
    const onRes = await request(app)
      .put(`/api/menus/${ctx.menuId}`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ is_active: true });
    expect(onRes.status).toBe(200);
  }, 30000);

  it('주간(기간) 조회 파라미터로 점주 예약 목록을 가져올 수 있다', async () => {
    const ctx = await setupRestaurant({ slotTime: '17:00' });
    await request(app)
      .post('/api/reservations/manual')
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ reservation_date: ctx.dateStr, reservation_time: '17:00', party_size: 2, guest_name: '주간뷰' });

    const start = ctx.dateStr;
    const endDate = new Date(ctx.dateStr);
    endDate.setDate(endDate.getDate() + 6);
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const rangeRes = await request(app)
      .get('/api/reservations/merchant')
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .query({ start_date: start, end_date: end });
    expect(rangeRes.status).toBe(200);
    expect(rangeRes.body.reservations.some((r) => r.customer_name === '주간뷰')).toBe(true);
  }, 30000);
});
