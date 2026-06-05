/**
 * W5 예약 기반 1:1 채팅 통합테스트 (실DB)
 *
 * - 고객 방 생성(get-or-create 멱등) → 점주 문의 목록 노출
 * - 메시지 전송 → 상대 unread 증가 + 알림 발송
 * - 읽음 처리 → unread 0
 * - 제3자 접근 403
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

async function setupChatContext() {
  const owner = await registerUser('merchant');
  const reg = await registerMerchant(owner.token);
  const admin = await createAdmin();
  await verifyMerchant(admin.token, reg.body.data.id, 'verified');
  const rest = await createRestaurant(owner.token);
  const restaurantId = rest.body.data?.id ?? rest.body.id;
  const { dateStr, dayOfWeek } = futureDate(7);
  await createTimeSlot(owner.token, restaurantId, { day_of_week: dayOfWeek, slot_time: '18:00' });
  await createMenu(owner.token, restaurantId);

  const customer = await registerUser('customer');
  const rsv = await createReservation(customer.token, {
    restaurant_id: restaurantId, reservation_date: dateStr, reservation_time: '18:00',
  });

  return { owner, customer, restaurantId, reservation: rsv.body.reservation };
}

describe('W5: 예약 기반 1:1 채팅', () => {
  beforeAll(async () => {
    await cleanV2Data();
    await pool.query('TRUNCATE TABLE reservation_chat_messages, reservation_chat_rooms CASCADE');
  });

  afterAll(async () => {
    await pool.query('TRUNCATE TABLE reservation_chat_messages, reservation_chat_rooms CASCADE');
    await cleanV2Data();
    await pool.end().catch(() => {});
  });

  it('고객이 방을 만들고 메시지를 보내면 점주 문의함에 노출되고 unread가 증가한다', async () => {
    const ctx = await setupChatContext();

    // 방 생성 (멱등 — 두 번 호출해도 같은 방)
    const room1 = await request(app)
      .post('/api/reservation-chat/rooms')
      .set('Authorization', `Bearer ${ctx.customer.token}`)
      .send({ reservation_id: ctx.reservation.id });
    expect(room1.status).toBe(201);

    const room2 = await request(app)
      .post('/api/reservation-chat/rooms')
      .set('Authorization', `Bearer ${ctx.customer.token}`)
      .send({ reservation_id: ctx.reservation.id });
    expect(room2.body.room.id).toBe(room1.body.room.id);
    const roomId = room1.body.room.id;

    // 고객 메시지 전송
    const msgRes = await request(app)
      .post(`/api/reservation-chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${ctx.customer.token}`)
      .send({ message: '창가 자리로 부탁드려요!' });
    expect(msgRes.status).toBe(201);
    expect(msgRes.body.message.sender_role).toBe('customer');

    // 점주 문의 목록에 노출 + unread 1
    const inboxRes = await request(app)
      .get('/api/reservation-chat/merchant/rooms')
      .set('Authorization', `Bearer ${ctx.owner.token}`);
    expect(inboxRes.status).toBe(200);
    const inboxRoom = inboxRes.body.rooms.find((r) => r.id === roomId);
    expect(inboxRoom).toBeTruthy();
    expect(inboxRoom.unread_count).toBe(1);
    expect(inboxRoom.last_message).toContain('창가');

    // 점주에게 알림 발송 확인
    await new Promise((r) => setTimeout(r, 300));
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS cnt FROM notifications WHERE user_id = $1 AND type = 'reservation_chat'",
      [ctx.owner.userId]
    );
    expect(rows[0].cnt).toBe(1);

    // 점주 답장 → 고객 unread 1
    const replyRes = await request(app)
      .post(`/api/reservation-chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${ctx.owner.token}`)
      .send({ message: '네, 준비해두겠습니다 :)' });
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.message.sender_role).toBe('merchant');

    const unreadRes = await request(app)
      .get('/api/reservation-chat/unread-count')
      .set('Authorization', `Bearer ${ctx.customer.token}`);
    expect(unreadRes.body.unread).toBe(1);

    // 고객 읽음 처리 → 0
    await request(app)
      .post(`/api/reservation-chat/rooms/${roomId}/read`)
      .set('Authorization', `Bearer ${ctx.customer.token}`);

    const unreadAfter = await request(app)
      .get('/api/reservation-chat/unread-count')
      .set('Authorization', `Bearer ${ctx.customer.token}`);
    expect(unreadAfter.body.unread).toBe(0);

    // 메시지 목록 (고객 시점)
    const messagesRes = await request(app)
      .get(`/api/reservation-chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${ctx.customer.token}`);
    expect(messagesRes.status).toBe(200);
    expect(messagesRes.body.messages).toHaveLength(2);
    expect(messagesRes.body.role).toBe('customer');
  }, 30000);

  it('제3자는 채팅방에 접근할 수 없다', async () => {
    const ctx = await setupChatContext();

    const roomRes = await request(app)
      .post('/api/reservation-chat/rooms')
      .set('Authorization', `Bearer ${ctx.customer.token}`)
      .send({ reservation_id: ctx.reservation.id });
    const roomId = roomRes.body.room.id;

    const stranger = await registerUser('stranger');

    const readRes = await request(app)
      .get(`/api/reservation-chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(readRes.status).toBe(403);

    const sendRes = await request(app)
      .post(`/api/reservation-chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ message: '몰래 끼어들기' });
    expect(sendRes.status).toBe(403);

    // 타인 예약으로 방 생성 시도 → 403
    const hijack = await request(app)
      .post('/api/reservation-chat/rooms')
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ reservation_id: ctx.reservation.id });
    expect(hijack.status).toBe(403);
  }, 30000);
});
