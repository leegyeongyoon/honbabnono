const pool = require('../../config/database');
const logger = require('../../config/logger');
const { createNotification } = require('../notifications/controller');

// ============================================================
// 예약 기반 1:1 채팅 (매장 ↔ 고객) — 잇테이블 v2
//
// 권한 모델: authenticateToken 단일 사용.
//   room 멤버십 = (customer_id == userId) OR (merchant_user_id == userId)
//   점주 토큰도 user 기반 JWT라 동일하게 동작한다.
// ============================================================

/** room 조회 + 멤버십 검사. 반환: { room, role } 또는 null */
const getRoomForUser = async (roomId, userId) => {
  const { rows } = await pool.query(
    'SELECT * FROM reservation_chat_rooms WHERE id = $1',
    [roomId]
  );
  const room = rows[0];
  if (!room) return null;
  if (room.customer_id === userId) return { room, role: 'customer' };
  if (room.merchant_user_id === userId) return { room, role: 'merchant' };
  return { room, role: null };
};

/**
 * 채팅방 생성/조회 (get-or-create)
 * POST /reservation-chat/rooms  body: { reservation_id }
 * 고객(예약자)만 생성 가능 — 점주는 기존 방 목록에서 진입.
 */
exports.createOrGetRoom = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reservation_id } = req.body;

    if (!reservation_id) {
      return res.status(400).json({ success: false, error: '예약 정보가 필요합니다.' });
    }

    // 예약 + 매장 점주 조회
    const reservationResult = await pool.query(
      `SELECT r.id, r.user_id, r.restaurant_id, m.user_id AS merchant_user_id
       FROM reservations r
       LEFT JOIN merchants m ON m.restaurant_id = r.restaurant_id
       WHERE r.id = $1`,
      [reservation_id]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 예약에만 문의할 수 있습니다.' });
    }

    if (!reservation.merchant_user_id) {
      return res.status(400).json({ success: false, error: '매장에 연결된 점주가 없어 문의할 수 없습니다.' });
    }

    // get-or-create (UNIQUE(reservation_id) 경합 안전)
    const insertResult = await pool.query(
      `INSERT INTO reservation_chat_rooms (reservation_id, restaurant_id, customer_id, merchant_user_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (reservation_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [reservation_id, reservation.restaurant_id, userId, reservation.merchant_user_id]
    );

    res.status(201).json({ success: true, room: insertResult.rows[0] });
  } catch (error) {
    logger.error('예약 채팅방 생성 실패:', error);
    res.status(500).json({ success: false, error: '채팅방 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 채팅방 목록 (고객)
 * GET /reservation-chat/rooms/my
 */
exports.getMyRooms = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `SELECT rcr.*, rst.name AS restaurant_name, rst.image_url AS restaurant_image,
              r.reservation_date, r.reservation_time,
              (SELECT COUNT(*)::int FROM reservation_chat_messages m
               WHERE m.room_id = rcr.id AND m.sender_role = 'merchant' AND m.is_read = false) AS unread_count
       FROM reservation_chat_rooms rcr
       JOIN restaurants rst ON rst.id = rcr.restaurant_id
       JOIN reservations r ON r.id = rcr.reservation_id
       WHERE rcr.customer_id = $1 AND rcr.is_active = true
       ORDER BY rcr.last_message_at DESC NULLS LAST, rcr.created_at DESC`,
      [userId]
    );

    res.json({ success: true, rooms: rows });
  } catch (error) {
    logger.error('내 채팅방 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '채팅방 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 매장 문의 목록 (점주)
 * GET /reservation-chat/merchant/rooms
 */
exports.getMerchantRooms = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;

    const { rows } = await pool.query(
      `SELECT rcr.*, u.name AS customer_name,
              r.reservation_date, r.reservation_time, r.party_size, r.status AS reservation_status,
              (SELECT COUNT(*)::int FROM reservation_chat_messages m
               WHERE m.room_id = rcr.id AND m.sender_role = 'customer' AND m.is_read = false) AS unread_count
       FROM reservation_chat_rooms rcr
       JOIN users u ON u.id = rcr.customer_id
       JOIN reservations r ON r.id = rcr.reservation_id
       WHERE rcr.restaurant_id = $1 AND rcr.is_active = true
       ORDER BY rcr.last_message_at DESC NULLS LAST, rcr.created_at DESC`,
      [restaurantId]
    );

    res.json({ success: true, rooms: rows });
  } catch (error) {
    logger.error('점주 문의 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '문의 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약으로 채팅방 조회 (고객/점주 공용)
 * GET /reservation-chat/rooms/by-reservation/:reservationId
 */
exports.getRoomByReservation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reservationId } = req.params;

    const { rows } = await pool.query(
      'SELECT * FROM reservation_chat_rooms WHERE reservation_id = $1',
      [reservationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '채팅방이 없습니다.' });
    }

    const room = rows[0];
    if (room.customer_id !== userId && room.merchant_user_id !== userId) {
      return res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
    }

    res.json({ success: true, room });
  } catch (error) {
    logger.error('채팅방 조회 실패:', error);
    res.status(500).json({ success: false, error: '채팅방 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 메시지 목록
 * GET /reservation-chat/rooms/:id/messages?page=1&limit=50
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const membership = await getRoomForUser(id, userId);
    if (!membership) {
      return res.status(404).json({ success: false, error: '채팅방을 찾을 수 없습니다.' });
    }
    if (!membership.role) {
      return res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
    }

    const { rows } = await pool.query(
      `SELECT m.*, u.name AS sender_name
       FROM reservation_chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.room_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({ success: true, messages: rows, role: membership.role });
  } catch (error) {
    logger.error('메시지 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '메시지 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 메시지 전송
 * POST /reservation-chat/rooms/:id/messages  body: { message }
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: '메시지 내용이 필요합니다.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: '메시지는 1000자 이하여야 합니다.' });
    }

    const membership = await getRoomForUser(id, userId);
    if (!membership) {
      return res.status(404).json({ success: false, error: '채팅방을 찾을 수 없습니다.' });
    }
    if (!membership.role) {
      return res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
    }

    const { room, role } = membership;

    const insertResult = await pool.query(
      `INSERT INTO reservation_chat_messages (room_id, sender_id, sender_role, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, userId, role, message.trim()]
    );

    await pool.query(
      `UPDATE reservation_chat_rooms
       SET last_message = $1, last_message_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [message.trim().slice(0, 200), id]
    );

    const saved = insertResult.rows[0];

    // 소켓 실시간 전파 (룸 prefix: resvchat:)
    const io = req.app.get('io');
    if (io) {
      io.to(`resvchat:${id}`).emit('reservation_chat_message', saved);
    }

    // 상대방 알림
    const targetUserId = role === 'customer' ? room.merchant_user_id : room.customer_id;
    createNotification(targetUserId, 'reservation_chat',
      '새 문의 메시지',
      message.trim().slice(0, 80),
      { roomId: id, reservationId: room.reservation_id, restaurantId: room.restaurant_id }
    ).catch(() => {});

    res.status(201).json({ success: true, message: saved });
  } catch (error) {
    logger.error('메시지 전송 실패:', error);
    res.status(500).json({ success: false, error: '메시지 전송 중 오류가 발생했습니다.' });
  }
};

/**
 * 읽음 처리
 * POST /reservation-chat/rooms/:id/read
 */
exports.markRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const membership = await getRoomForUser(id, userId);
    if (!membership || !membership.role) {
      return res.status(membership ? 403 : 404).json({
        success: false,
        error: membership ? '접근 권한이 없습니다.' : '채팅방을 찾을 수 없습니다.',
      });
    }

    const { role } = membership;
    const readColumn = role === 'customer' ? 'customer_last_read_at' : 'merchant_last_read_at';
    const counterpartRole = role === 'customer' ? 'merchant' : 'customer';

    await pool.query(
      `UPDATE reservation_chat_rooms SET ${readColumn} = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
    await pool.query(
      `UPDATE reservation_chat_messages SET is_read = true
       WHERE room_id = $1 AND sender_role = $2 AND is_read = false`,
      [id, counterpartRole]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('읽음 처리 실패:', error);
    res.status(500).json({ success: false, error: '읽음 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 미읽음 합계 (고객)
 * GET /reservation-chat/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS unread
       FROM reservation_chat_messages m
       JOIN reservation_chat_rooms r ON r.id = m.room_id
       WHERE r.customer_id = $1 AND m.sender_role = 'merchant' AND m.is_read = false`,
      [userId]
    );
    res.json({ success: true, unread: rows[0].unread });
  } catch (error) {
    logger.error('미읽음 조회 실패:', error);
    res.status(500).json({ success: false, error: '미읽음 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 미읽음 합계 (점주)
 * GET /reservation-chat/merchant/unread-count
 */
exports.getMerchantUnreadCount = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS unread
       FROM reservation_chat_messages m
       JOIN reservation_chat_rooms r ON r.id = m.room_id
       WHERE r.restaurant_id = $1 AND m.sender_role = 'customer' AND m.is_read = false`,
      [restaurantId]
    );
    res.json({ success: true, unread: rows[0].unread });
  } catch (error) {
    logger.error('점주 미읽음 조회 실패:', error);
    res.status(500).json({ success: false, error: '미읽음 조회 중 오류가 발생했습니다.' });
  }
};
