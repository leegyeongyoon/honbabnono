const pool = require('../../config/database');
const logger = require('../../config/logger');
const crypto = require('crypto');

/**
 * 예약 생성
 * POST /reservations
 */
exports.createReservation = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { restaurant_id, reservation_date, reservation_time, party_size, special_request } = req.body;

    await client.query('BEGIN');

    // 1. 식당 존재 + 활성 확인
    const restaurantResult = await client.query(
      'SELECT id, name, is_active FROM restaurants WHERE id = $1',
      [restaurant_id]
    );

    if (restaurantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: '식당을 찾을 수 없습니다.' });
    }

    if (!restaurantResult.rows[0].is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: '현재 예약을 받지 않는 식당입니다.' });
    }

    // 2. time_slot 잔여 확인 (요일 기반 슬롯 + 같은 날짜 내 이미 잡힌 예약 수)
    const dayOfWeek = new Date(reservation_date).getDay();
    const slotResult = await client.query(
      `SELECT id, max_reservations
       FROM restaurant_time_slots
       WHERE restaurant_id = $1 AND day_of_week = $2 AND slot_time = $3 AND is_active = true`,
      [restaurant_id, dayOfWeek, reservation_time]
    );

    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: '해당 시간대에 예약이 불가합니다.' });
    }

    const slot = slotResult.rows[0];

    // 같은 날짜/시간에 이미 confirmed/preparing 예약 수 카운트
    const bookedResult = await client.query(
      `SELECT COUNT(*)::int AS booked
       FROM reservations
       WHERE restaurant_id = $1
         AND reservation_date = $2
         AND reservation_time = $3
         AND status NOT IN ('cancelled', 'pending_payment')`,
      [restaurant_id, reservation_date, reservation_time]
    );

    if (bookedResult.rows[0].booked >= slot.max_reservations) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: '해당 시간대 예약이 마감되었습니다.' });
    }

    // 3. QR 코드 생성
    const qrCode = crypto.randomBytes(16).toString('hex');

    // 4. INSERT reservation (status: pending_payment)
    const reservationResult = await client.query(
      `INSERT INTO reservations (user_id, restaurant_id, reservation_date, reservation_time, party_size, special_request, qr_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment')
       RETURNING id, user_id, restaurant_id, reservation_date, reservation_time, party_size, special_request, qr_code, status, created_at`,
      [userId, restaurant_id, reservation_date, reservation_time, party_size, special_request || null, qrCode]
    );

    // 5. time_slot current_reservations +1 (요일 슬롯의 누적 카운터)
    await client.query(
      'UPDATE restaurant_time_slots SET current_reservations = current_reservations + 1 WHERE id = $1',
      [slot.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      reservation: reservationResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('예약 생성 실패:', error);
    res.status(500).json({ success: false, error: '예약 생성 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

/**
 * 내 예약 목록 조회
 * GET /reservations/my?status=...&page=1&limit=20
 */
exports.getMyReservations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT r.id, r.reservation_date, r.reservation_time, r.party_size,
             r.status, r.arrival_status, r.special_request, r.qr_code,
             r.checked_in_at, r.created_at,
             rst.id AS restaurant_id, rst.name AS restaurant_name,
             rst.address AS restaurant_address, rst.image_url AS restaurant_image,
             (
               SELECT json_build_object(
                 'id', o.id,
                 'total_amount', o.total_amount,
                 'items', COALESCE(
                   (SELECT json_agg(json_build_object(
                     'menu_name', oi.menu_name,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price
                   ))
                   FROM order_items oi WHERE oi.order_id = o.id),
                   '[]'::json
                 )
               )
               FROM orders o WHERE o.reservation_id = r.id
               LIMIT 1
             ) AS "order"
      FROM reservations r
      JOIN restaurants rst ON r.restaurant_id = rst.id
      WHERE r.user_id = $1
    `;
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    query += ' ORDER BY r.reservation_date DESC, r.reservation_time DESC';
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // 전체 건수 조회
    let countQuery = 'SELECT COUNT(*) FROM reservations WHERE user_id = $1';
    const countParams = [userId];
    if (status) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      reservations: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    logger.error('내 예약 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '예약 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 점주 예약 목록 조회
 * GET /reservations/merchant?date=YYYY-MM-DD
 */
exports.getMerchantReservations = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    const { date } = req.query;

    let query = `
      SELECT r.id, r.reservation_date, r.reservation_time, r.party_size,
             r.status, r.arrival_status, r.special_request, r.qr_code,
             r.checked_in_at, r.cancelled_by, r.cancel_reason, r.created_at,
             u.id AS user_id, u.name AS user_name, u.phone AS user_phone,
             u.profile_image AS user_profile_image
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      WHERE r.restaurant_id = $1
    `;
    const params = [restaurantId];

    if (date) {
      params.push(date);
      query += ` AND r.reservation_date = $${params.length}`;
    }

    query += ' ORDER BY r.reservation_time ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      reservations: result.rows,
    });
  } catch (error) {
    logger.error('점주 예약 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '예약 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약 상세 조회
 * GET /reservations/:id
 */
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT r.id, r.user_id, r.restaurant_id, r.reservation_date, r.reservation_time,
              r.party_size, r.status, r.arrival_status, r.special_request, r.qr_code,
              r.checked_in_at, r.cancelled_by, r.cancel_reason, r.created_at, r.updated_at,
              rst.name AS restaurant_name, rst.address AS restaurant_address,
              rst.phone AS restaurant_phone, rst.image_url AS restaurant_image,
              rst.latitude AS restaurant_latitude, rst.longitude AS restaurant_longitude
       FROM reservations r
       JOIN restaurants rst ON r.restaurant_id = rst.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = result.rows[0];

    // 본인 예약이거나 해당 식당 점주인지 확인
    if (reservation.user_id !== userId) {
      // 점주 확인
      const merchantResult = await pool.query(
        'SELECT id FROM merchants WHERE user_id = $1 AND restaurant_id = $2 AND verification_status = $3',
        [userId, reservation.restaurant_id, 'verified']
      );
      if (merchantResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
      }
    }

    // 주문 정보 조회 (있으면)
    const orderResult = await pool.query(
      `SELECT o.id, o.total_amount, o.cooking_status, o.created_at,
              json_agg(json_build_object(
                'id', oi.id, 'menu_name', oi.menu_name, 'unit_price', oi.unit_price,
                'quantity', oi.quantity, 'subtotal', oi.subtotal, 'options', oi.options
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.reservation_id = $1
       GROUP BY o.id`,
      [id]
    );

    res.json({
      success: true,
      reservation,
      order: orderResult.rows.length > 0 ? orderResult.rows[0] : null,
    });
  } catch (error) {
    logger.error('예약 상세 조회 실패:', error);
    res.status(500).json({ success: false, error: '예약 상세 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약 취소
 * PUT /reservations/:id/cancel
 */
exports.cancelReservation = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { cancel_reason } = req.body;

    await client.query('BEGIN');

    // 1. 본인 예약 확인
    const reservationResult = await client.query(
      'SELECT id, user_id, restaurant_id, reservation_date, reservation_time, status FROM reservations WHERE id = $1',
      [id]
    );

    if (reservationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: '본인의 예약만 취소할 수 있습니다.' });
    }

    // 2. 취소 불가 상태 확인
    if (['cancelled', 'completed', 'seated'].includes(reservation.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: `현재 상태(${reservation.status})에서는 취소할 수 없습니다.` });
    }

    // 3. UPDATE status
    await client.query(
      `UPDATE reservations SET status = 'cancelled', cancel_reason = $1, cancelled_by = 'customer', updated_at = NOW()
       WHERE id = $2`,
      [cancel_reason || null, id]
    );

    // 4. time_slot current_reservations -1 (요일 기반)
    const dayOfWeek = new Date(reservation.reservation_date).getDay();
    await client.query(
      `UPDATE restaurant_time_slots
       SET current_reservations = GREATEST(current_reservations - 1, 0)
       WHERE restaurant_id = $1 AND day_of_week = $2 AND slot_time = $3`,
      [reservation.restaurant_id, dayOfWeek, reservation.reservation_time]
    );

    // 5. 결제가 있으면 자동 환불 처리
    let refundInfo = null;
    const paymentResult = await client.query(
      "SELECT id, amount, payment_method, status FROM payments WHERE reservation_id = $1 AND status = 'paid'",
      [id]
    );

    if (paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];

      // 환불 정책 적용: 예약일까지 남은 일수 기반
      const daysUntil = Math.ceil(
        (new Date(reservation.reservation_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // 매장 환불 정책 조회
      const policyResult = await client.query(
        'SELECT days_before, refund_rate FROM restaurant_refund_policies WHERE restaurant_id = $1 ORDER BY days_before ASC',
        [reservation.restaurant_id]
      );

      let refundRate = 100;
      if (policyResult.rows.length > 0) {
        const matched = policyResult.rows.filter(p => daysUntil >= p.days_before);
        if (matched.length > 0) {
          refundRate = matched[matched.length - 1].refund_rate;
        } else {
          refundRate = policyResult.rows[0].refund_rate;
        }
      } else {
        // 기본 정책: 당일 50%, 1일 전 90%, 그외 100%
        if (daysUntil <= 0) refundRate = 50;
        else if (daysUntil <= 1) refundRate = 90;
      }

      const refundAmount = Math.floor(payment.amount * refundRate / 100);

      if (refundAmount > 0) {
        if (payment.payment_method === 'points') {
          await client.query(
            'UPDATE users SET points = points + $2 WHERE id = $1',
            [userId, refundAmount]
          );
        }

        const newStatus = refundAmount === payment.amount ? 'refunded' : 'partial_refund';
        await client.query(
          `UPDATE payments SET status = $1, refund_amount = $2, refund_rate = $3,
                  refund_reason = $4, refunded_at = NOW(), updated_at = NOW()
           WHERE id = $5`,
          [newStatus, refundAmount, refundRate, cancel_reason || '예약 취소에 의한 환불', payment.id]
        );

        refundInfo = { refundRate, refundAmount, originalAmount: payment.amount };
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '예약이 취소되었습니다.',
      refund: refundInfo,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('예약 취소 실패:', error);
    res.status(500).json({ success: false, error: '예약 취소 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

/**
 * 도착 상태 업데이트
 * PUT /reservations/:id/arrival
 */
exports.updateArrival = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { arrival_status } = req.body;

    // 본인 확인 (식당 정보 포함)
    const reservationResult = await pool.query(
      `SELECT r.id, r.user_id, r.restaurant_id,
              u.name AS user_name
       FROM reservations r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 예약만 수정할 수 있습니다.' });
    }

    await pool.query(
      'UPDATE reservations SET arrival_status = $1, updated_at = NOW() WHERE id = $2',
      [arrival_status, id]
    );

    // 소켓을 통해 점주에게 도착 상태 변경 알림
    const io = req.app.get('io');
    if (io) {
      const { emitArrivalUpdate } = require('./socket');
      emitArrivalUpdate(io, reservation.restaurant_id, {
        reservationId: reservation.id,
        arrivalStatus: arrival_status,
        userId: reservation.user_id,
        userName: reservation.user_name,
      });
    }

    res.json({
      success: true,
      message: '도착 상태가 업데이트되었습니다.',
    });
  } catch (error) {
    logger.error('도착 상태 업데이트 실패:', error);
    res.status(500).json({ success: false, error: '도착 상태 업데이트 중 오류가 발생했습니다.' });
  }
};

/**
 * 체크인
 * POST /reservations/:id/checkin
 *
 * Body (택 1):
 * - { qrCode: "..." }  — QR 스캔 체크인 (QR 코드 값 검증)
 * - {} (빈 body)        — 예약번호 기반 체크인 (본인 인증만으로)
 */
exports.checkin = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { qrCode } = req.body;

    // 1. 예약 조회 (QR 코드, 식당 정보 포함)
    const reservationResult = await pool.query(
      `SELECT r.id, r.user_id, r.status, r.qr_code, r.restaurant_id, r.party_size,
              rst.name AS restaurant_name, u.name AS user_name
       FROM reservations r
       JOIN restaurants rst ON r.restaurant_id = rst.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 예약만 체크인할 수 있습니다.' });
    }

    // 2. status가 confirmed 또는 preparing인지 확인
    if (!['confirmed', 'preparing'].includes(reservation.status)) {
      return res.status(400).json({ success: false, error: `현재 상태(${reservation.status})에서는 체크인할 수 없습니다.` });
    }

    // 3. QR 코드 검증 (qrCode가 전달된 경우)
    if (qrCode) {
      if (qrCode !== reservation.qr_code) {
        return res.status(400).json({ success: false, error: 'QR 코드가 일치하지 않습니다.' });
      }
    }

    // 4. UPDATE checked_in_at, arrival_status
    await pool.query(
      `UPDATE reservations SET checked_in_at = NOW(), arrival_status = 'arrived', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // 5. 소켓을 통해 점주에게 체크인 알림 (io가 app에 설정된 경우)
    const io = req.app.get('io');
    if (io) {
      const { emitCheckin } = require('./socket');
      emitCheckin(io, reservation.restaurant_id, {
        reservationId: reservation.id,
        userId: reservation.user_id,
        userName: reservation.user_name,
        partySize: reservation.party_size,
        restaurantName: reservation.restaurant_name,
      });
    }

    res.json({
      success: true,
      message: '체크인이 완료되었습니다.',
    });
  } catch (error) {
    logger.error('체크인 실패:', error);
    res.status(500).json({ success: false, error: '체크인 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약 상태 업데이트 (점주)
 * PUT /reservations/:id/status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.merchant.restaurantId;
    const { status } = req.body;

    // 1. 소유권 확인
    const reservationResult = await pool.query(
      'SELECT id, restaurant_id, status FROM reservations WHERE id = $1',
      [id]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.restaurant_id !== restaurantId) {
      return res.status(403).json({ success: false, error: '해당 식당의 예약이 아닙니다.' });
    }

    // 2. 상태 전이 검증
    const validTransitions = {
      confirmed: ['preparing'],
      preparing: ['ready'],
      ready: ['seated'],
      seated: ['completed'],
    };

    const allowedNextStatuses = validTransitions[reservation.status];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `현재 상태(${reservation.status})에서 ${status}(으)로 변경할 수 없습니다.`,
      });
    }

    // 3. UPDATE status
    const previousStatus = reservation.status;
    await pool.query(
      'UPDATE reservations SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );

    // 소켓을 통해 고객에게 상태 변경 알림
    const io = req.app.get('io');
    if (io) {
      const { emitStatusUpdate } = require('./socket');
      emitStatusUpdate(io, id, {
        status,
        previousStatus,
        restaurantId: reservation.restaurant_id,
      });
    }

    res.json({
      success: true,
      message: `예약 상태가 ${status}(으)로 변경되었습니다.`,
    });
  } catch (error) {
    logger.error('예약 상태 업데이트 실패:', error);
    res.status(500).json({ success: false, error: '예약 상태 업데이트 중 오류가 발생했습니다.' });
  }
};

/**
 * 노쇼 처리 (점주)
 * PUT /reservations/:id/noshow
 */
exports.processNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.merchant.restaurantId;

    // 1. 소유권 확인
    const reservationResult = await pool.query(
      'SELECT id, restaurant_id, status FROM reservations WHERE id = $1',
      [id]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.restaurant_id !== restaurantId) {
      return res.status(403).json({ success: false, error: '해당 식당의 예약이 아닙니다.' });
    }

    // 2. status가 confirmed/preparing인지 확인
    if (!['confirmed', 'preparing'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        error: `현재 상태(${reservation.status})에서는 노쇼 처리할 수 없습니다.`,
      });
    }

    // 3. UPDATE
    await pool.query(
      `UPDATE reservations
       SET status = 'cancelled', cancelled_by = 'merchant', cancel_reason = '노쇼',
           arrival_status = 'noshow', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: '노쇼 처리가 완료되었습니다.',
    });
  } catch (error) {
    logger.error('노쇼 처리 실패:', error);
    res.status(500).json({ success: false, error: '노쇼 처리 중 오류가 발생했습니다.' });
  }
};
