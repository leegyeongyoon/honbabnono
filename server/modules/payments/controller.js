const pool = require('../../config/database');
const logger = require('../../config/logger');
const portone = require('../../config/portone');
const { combineReservationDateTime, pickRefundRate } = require('../../utils/helpers');
const { createNotification } = require('../notifications/controller');
const { emitNewReservation } = require('../reservations/socket');

/**
 * 결제 확정(confirmed 전이) 시 점주 알림 + 예약 보드 실시간 emit
 * 주의: complete/webhook 양쪽에서 호출되므로, 실제 상태 전이가 일어난 경우에만
 *       (조건부 UPDATE rowCount > 0) 호출할 것 — 중복 알림 방지.
 */
const notifyMerchantOfPaidReservation = async (io, reservationId) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.restaurant_id, r.reservation_date, r.reservation_time, r.party_size,
              rst.name AS restaurant_name, u.name AS customer_name,
              m.user_id AS owner_user_id, p.amount
       FROM reservations r
       JOIN restaurants rst ON rst.id = r.restaurant_id
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN merchants m ON m.restaurant_id = r.restaurant_id
       LEFT JOIN payments p ON p.reservation_id = r.id AND p.status = 'paid'
       WHERE r.id = $1`,
      [reservationId]
    );
    const row = rows[0];
    if (!row) return;

    const d = row.reservation_date;
    const dateStr = d instanceof Date
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : String(d);
    const timeStr = String(row.reservation_time).slice(0, 5);

    if (row.owner_user_id) {
      createNotification(row.owner_user_id, 'reservation_paid',
        `${row.restaurant_name} 새 예약`,
        `${dateStr} ${timeStr} ${row.party_size}명 예약이 결제 완료되었습니다.`,
        { reservationId, restaurantId: row.restaurant_id }
      ).catch(() => {});
    }

    if (io) {
      emitNewReservation(io, row.restaurant_id, {
        reservationId,
        customerName: row.customer_name,
        reservationDate: dateStr,
        reservationTime: timeStr,
        partySize: row.party_size,
        amount: row.amount,
      });
    }
  } catch (error) {
    logger.error('점주 새 예약 알림 실패:', error.message);
  }
};

// ============================================
// 결제 준비 (merchant_uid 생성 및 pending 레코드 생성)
// POST /payments/prepare
// ============================================
exports.preparePayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reservation_id, amount, payment_method } = req.body;

    logger.info('결제 준비 요청:', { userId, reservation_id, amount, payment_method });

    // 1. 예약 존재 확인 + 본인 확인 + status 확인
    const reservationResult = await pool.query(
      'SELECT id, user_id, restaurant_id, status FROM reservations WHERE id = $1',
      [reservation_id]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 예약만 결제할 수 있습니다.' });
    }

    if (reservation.status !== 'pending_payment') {
      return res.status(400).json({ success: false, error: `결제 가능한 상태가 아닙니다. (현재: ${reservation.status})` });
    }

    // 2. 주문 존재 확인 + total_amount 확인
    const orderResult = await pool.query(
      'SELECT id, total_amount FROM orders WHERE reservation_id = $1',
      [reservation_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '주문 정보를 찾을 수 없습니다.' });
    }

    const order = orderResult.rows[0];

    // 3. 요청 금액과 주문 금액 일치 확인
    if (amount !== order.total_amount) {
      return res.status(400).json({
        success: false,
        error: '결제 금액이 주문 금액과 일치하지 않습니다.',
        expected: order.total_amount,
        received: amount,
      });
    }

    // 4. 이미 pending 결제가 있는지 확인 (중복 방지)
    const existingPayment = await pool.query(
      "SELECT id, merchant_uid FROM payments WHERE reservation_id = $1 AND status = 'pending'",
      [reservation_id]
    );

    if (existingPayment.rows.length > 0) {
      // 기존 pending 결제가 있으면 재사용
      const existing = existingPayment.rows[0];
      const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0] || {};

      return res.json({
        success: true,
        paymentData: {
          paymentId: existing.id,
          merchantUid: existing.merchant_uid,
          amount,
          storeId: process.env.PORTONE_STORE_ID,
          name: '잇테이블 예약 결제',
          buyerName: user.name || '사용자',
          buyerEmail: user.email || '',
        },
      });
    }

    // 5. merchant_uid 생성
    const merchantUid = `reservation_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 6. payments 레코드 생성
    const paymentResult = await pool.query(`
      INSERT INTO payments (reservation_id, order_id, user_id, amount, payment_method, status, merchant_uid, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), NOW())
      RETURNING id
    `, [reservation_id, order.id, userId, amount, payment_method || 'card', merchantUid]);

    const paymentId = paymentResult.rows[0].id;

    // 7. 사용자 정보 조회 (buyerName, buyerEmail)
    const userResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0] || {};

    logger.info('결제 준비 완료:', { paymentId, merchantUid });

    res.json({
      success: true,
      paymentData: {
        paymentId,
        merchantUid,
        amount,
        storeId: process.env.PORTONE_STORE_ID,
        name: '잇테이블 예약 결제',
        buyerName: user.name || '사용자',
        buyerEmail: user.email || '',
      },
    });
  } catch (error) {
    logger.error('결제 준비 실패:', error);
    res.status(500).json({ success: false, error: '결제 준비 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 결제 완료 확인 (imp_uid로 PortOne 검증, 상태 업데이트)
// POST /payments/complete
// ============================================
exports.completePayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imp_uid, merchant_uid } = req.body;

    logger.info('결제 완료 확인 요청:', { userId, imp_uid, merchant_uid });

    // 1. payments 테이블에서 merchant_uid로 조회
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE merchant_uid = $1',
      [merchant_uid]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '결제 정보를 찾을 수 없습니다.' });
    }

    const payment = paymentResult.rows[0];

    // 본인 확인
    if (payment.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 결제만 확인할 수 있습니다.' });
    }

    // 2. 이미 paid면 바로 성공 반환 (멱등성)
    if (payment.status === 'paid') {
      return res.json({ success: true, message: '이미 결제 완료된 건입니다.', payment });
    }

    // 3. PortOne API로 실제 결제 정보 조회
    const paymentData = await portone.verifyPayment(imp_uid);

    // 4. 금액 일치 확인
    if (paymentData.amount !== payment.amount) {
      logger.error('결제 금액 불일치:', {
        expected: payment.amount,
        actual: paymentData.amount,
        imp_uid,
        merchant_uid,
      });

      // 금액 불일치 시 결제 취소
      try {
        await portone.cancelPayment(imp_uid, '금액 불일치로 인한 자동 취소');
      } catch (cancelError) {
        logger.error('자동 취소 실패:', cancelError);
      }

      return res.status(400).json({
        success: false,
        error: '결제 금액이 일치하지 않습니다. 결제가 취소되었습니다.',
      });
    }

    // 5. 트랜잭션: payments 업데이트 + reservations 상태 변경
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 조건부 UPDATE — 웹훅이 먼저 처리했으면 rowCount 0 (중복 전이/알림 방지)
      const updatedPayment = await client.query(`
        UPDATE payments
        SET status = 'paid',
            imp_uid = $1,
            paid_at = NOW(),
            pg_provider = $2,
            card_name = $3,
            card_number = $4,
            receipt_url = $5,
            updated_at = NOW()
        WHERE id = $6 AND status = 'pending'
        RETURNING *
      `, [
        imp_uid,
        paymentData.pg_provider || null,
        paymentData.card_name || null,
        paymentData.card_number || null,
        paymentData.receipt_url || null,
        payment.id,
      ]);

      const transitioned = updatedPayment.rowCount > 0;

      if (transitioned) {
        await client.query(`
          UPDATE reservations
          SET status = 'confirmed', updated_at = NOW()
          WHERE id = $1
        `, [payment.reservation_id]);
      }

      await client.query('COMMIT');

      logger.info('결제 완료 확인 성공:', { paymentId: payment.id, imp_uid, amount: payment.amount });

      // 실제 전이가 일어난 경우에만 점주 알림 (웹훅 선처리 시 중복 방지)
      if (transitioned) {
        notifyMerchantOfPaidReservation(req.app.get('io'), payment.reservation_id).catch(() => {});
      }

      if (!transitioned) {
        const current = await pool.query('SELECT * FROM payments WHERE id = $1', [payment.id]);
        return res.json({ success: true, message: '이미 결제 완료된 건입니다.', payment: current.rows[0] });
      }

      res.json({ success: true, payment: updatedPayment.rows[0] });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('결제 완료 확인 실패:', error);
    res.status(500).json({ success: false, error: '결제 확인 중 오류가 발생했습니다.' });
  }
};

// ============================================
// PortOne 웹훅 핸들러 (결제 상태 변경 시 자동 처리)
// POST /payments/webhook
// ============================================
exports.handleWebhook = async (req, res) => {
  try {
    const { imp_uid, merchant_uid } = req.body;

    logger.info('결제 웹훅 수신:', { imp_uid, merchant_uid });

    if (!imp_uid) {
      return res.status(200).json({ success: false, error: 'imp_uid 누락' });
    }

    // reservation_ 으로 시작하지 않으면 이 핸들러의 대상이 아님 (기존 deposit_ 웹훅은 별도 처리)
    if (merchant_uid && !merchant_uid.startsWith('reservation_')) {
      logger.info('웹훅: reservation_ 이외의 merchant_uid, 무시:', { merchant_uid });
      return res.status(200).json({ success: true, message: '대상 아님' });
    }

    // PortOne API로 실제 결제 정보 조회
    const paymentData = await portone.verifyWebhookPayment(imp_uid, merchant_uid);

    // payments 테이블에서 merchant_uid로 조회
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE merchant_uid = $1',
      [paymentData.merchant_uid]
    );

    if (paymentResult.rows.length === 0) {
      logger.warn('웹훅: 매칭되는 결제 레코드 없음:', { imp_uid, merchant_uid: paymentData.merchant_uid });
      return res.status(200).json({ success: true, message: '매칭 레코드 없음' });
    }

    const payment = paymentResult.rows[0];

    // 멱등성: 이미 최종 상태면 무시
    if (payment.status === 'paid' && paymentData.status === 'paid') {
      logger.info('웹훅: 이미 처리 완료 (멱등성 스킵):', { paymentId: payment.id });
      return res.status(200).json({ success: true, message: '이미 처리됨' });
    }

    if (payment.status === 'refunded' && paymentData.status === 'cancelled') {
      logger.info('웹훅: 이미 환불 처리 완료 (멱등성 스킵):', { paymentId: payment.id });
      return res.status(200).json({ success: true, message: '이미 처리됨' });
    }

    // 상태에 따라 처리
    let webhookTransitioned = false; // confirmed 전이 발생 여부 (점주 알림 멱등 가드)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      switch (paymentData.status) {
        case 'paid': {
          // 금액 일치 확인
          if (paymentData.amount !== payment.amount) {
            logger.error('웹훅: 금액 불일치, 결제 취소 시도:', {
              expected: payment.amount,
              actual: paymentData.amount,
            });
            try {
              await portone.cancelPayment(imp_uid, '금액 불일치로 인한 자동 취소');
            } catch (cancelErr) {
              logger.error('웹훅: 자동 취소 실패:', cancelErr);
            }
            break;
          }

          const webhookUpdate = await client.query(`
            UPDATE payments
            SET status = 'paid', imp_uid = $1, paid_at = NOW(),
                pg_provider = $2, card_name = $3, card_number = $4, receipt_url = $5,
                updated_at = NOW()
            WHERE id = $6 AND status = 'pending'
          `, [
            imp_uid,
            paymentData.pg_provider || null,
            paymentData.card_name || null,
            paymentData.card_number || null,
            paymentData.receipt_url || null,
            payment.id,
          ]);

          if (webhookUpdate.rowCount > 0) {
            await client.query(`
              UPDATE reservations SET status = 'confirmed', updated_at = NOW()
              WHERE id = $1
            `, [payment.reservation_id]);

            // COMMIT 후 점주 알림을 위해 플래그 기록
            webhookTransitioned = true;
          }

          logger.info('웹훅: 결제 확정:', { paymentId: payment.id, imp_uid });
          break;
        }

        case 'cancelled':
          await client.query(`
            UPDATE payments SET status = 'refunded', refunded_at = NOW(), updated_at = NOW()
            WHERE id = $1
          `, [payment.id]);

          logger.info('웹훅: 결제 취소 반영:', { paymentId: payment.id, imp_uid });
          break;

        case 'failed':
          logger.warn('웹훅: 결제 실패 (무시):', { paymentId: payment.id, imp_uid });
          break;

        default:
          logger.info('웹훅: 처리하지 않는 상태:', { status: paymentData.status });
      }

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    // 실제 confirmed 전이가 일어난 경우에만 점주 알림 (complete 선처리 시 중복 방지)
    if (webhookTransitioned) {
      notifyMerchantOfPaidReservation(req.app.get('io'), payment.reservation_id).catch(() => {});
    }

    res.status(200).json({ success: true, message: '웹훅 처리 완료' });
  } catch (error) {
    logger.error('웹훅 처리 실패:', error.message);
    // 웹훅은 항상 200 반환 (재시도 방지)
    res.status(200).json({ success: false, error: '웹훅 처리 중 오류' });
  }
};

// ============================================
// 예약별 결제 조회
// GET /payments/reservation/:reservationId
// ============================================
exports.getPaymentByReservation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reservationId } = req.params;

    const result = await pool.query(
      'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at DESC LIMIT 1',
      [reservationId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, payment: null });
    }

    const payment = result.rows[0];

    // 본인 확인
    if (payment.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 결제만 조회할 수 있습니다.' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    logger.error('결제 조회 실패:', error);
    res.status(500).json({ success: false, error: '결제 조회 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 결제 환불 (매장별 환불 정책 적용)
// POST /payments/:id/refund
// ============================================
exports.refundPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: paymentId } = req.params;
    const { reason } = req.body;

    logger.info('환불 요청:', { paymentId, userId, reason });

    // 1. 결제 조회 + 본인 확인 + status 확인
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '결제 정보를 찾을 수 없습니다.' });
    }

    const payment = paymentResult.rows[0];

    if (payment.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 결제만 환불할 수 있습니다.' });
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({ success: false, error: `환불 가능한 상태가 아닙니다. (현재: ${payment.status})` });
    }

    // 2. 예약 및 주문 조회
    const reservationResult = await pool.query(
      'SELECT * FROM reservations WHERE id = $1',
      [payment.reservation_id]
    );
    const reservation = reservationResult.rows[0];

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [payment.order_id]
    );
    const order = orderResult.rows[0];

    // 3. 매장별 환불 정책 적용
    let refundRate = 100;

    if (reservation && reservation.restaurant_id) {
      // 매장 환불 정책 조회
      const policyResult = await pool.query(
        'SELECT days_before, refund_rate FROM restaurant_refund_policies WHERE restaurant_id = $1 ORDER BY days_before ASC',
        [reservation.restaurant_id]
      );

      if (policyResult.rows.length > 0) {
        // 예약 시각(일자+시각 합산)까지 남은 일수 계산
        // 주의: new Date(TIME 문자열)은 Invalid Date — 반드시 합산 헬퍼 사용
        const reservationAt = combineReservationDateTime(reservation.reservation_date, reservation.reservation_time);
        const daysUntilReservation = Math.ceil((reservationAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // 정책 매칭 (cancelReservation과 동일 의미: days_before일 이상 남았으면 해당 요율)
        refundRate = pickRefundRate(policyResult.rows, daysUntilReservation);
      } else {
        // 매장 정책이 없으면 기본 조리 상태 기반 환불
        if (order) {
          const cookingStatus = order.cooking_status;
          if (cookingStatus === 'ready' || cookingStatus === 'served') {
            refundRate = 0;
          } else if (cookingStatus === 'cooking') {
            refundRate = 50;
          } else if (cookingStatus === 'preparing') {
            refundRate = 90;
          }
        }

        // 예약 시간 3시간 이전이면 무조건 100%
        if (reservation && reservation.reservation_date) {
          const reservationAt = combineReservationDateTime(reservation.reservation_date, reservation.reservation_time);
          const hoursBeforeReservation = (reservationAt.getTime() - Date.now()) / (1000 * 60 * 60);
          if (hoursBeforeReservation >= 3) {
            refundRate = 100;
          }
        }
      }
    }

    if (refundRate === 0) {
      return res.status(400).json({
        success: false,
        error: '현재 환불이 불가합니다.',
        refundRate: 0,
      });
    }

    const refundAmount = Math.floor(payment.amount * refundRate / 100);

    // 4. 환불 처리
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (payment.payment_method === 'points') {
        // 포인트 환불
        await client.query(`
          INSERT INTO user_points (user_id, total_earned, available_points, total_used)
          VALUES ($1, $2, $2, 0)
          ON CONFLICT (user_id)
          DO UPDATE SET
            available_points = user_points.available_points + $2,
            updated_at = NOW()
        `, [userId, refundAmount]);

        await client.query(`
          INSERT INTO point_transactions (user_id, type, amount, description, created_at)
          VALUES ($1, 'earned', $2, $3, NOW())
        `, [userId, refundAmount, `예약 결제 환불 (결제 ID: ${paymentId})`]);
      } else {
        // PortOne 결제 취소
        await portone.cancelPayment(
          payment.imp_uid,
          reason || '사용자 요청에 의한 환불',
          refundAmount
        );
      }

      // payments 상태 업데이트
      const newStatus = refundAmount === payment.amount ? 'refunded' : 'partial_refund';
      await client.query(`
        UPDATE payments
        SET status = $1, refund_amount = $2, refund_rate = $3, refund_reason = $4,
            refunded_at = NOW(), updated_at = NOW()
        WHERE id = $5
      `, [newStatus, refundAmount, refundRate, reason || null, paymentId]);

      // reservations 상태 업데이트
      await client.query(`
        UPDATE reservations
        SET status = 'cancelled', cancelled_by = 'customer', updated_at = NOW()
        WHERE id = $1
      `, [payment.reservation_id]);

      await client.query('COMMIT');

      logger.info('환불 완료:', { paymentId, refundRate, refundAmount });

      res.json({
        success: true,
        refund: {
          refundRate,
          refundAmount,
          originalAmount: payment.amount,
        },
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('환불 실패:', error);
    res.status(500).json({ success: false, error: '환불 처리 중 오류가 발생했습니다.' });
  }
};
