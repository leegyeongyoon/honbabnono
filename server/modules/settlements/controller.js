const pool = require('../../config/database');
const logger = require('../../config/logger');
const { createNotification } = require('../notifications/controller');

const PLATFORM_FEE_RATE = 0.05; // 5%
const PAYMENT_FEE_RATE = 0.03;  // 3%

// ============================================
// 점주 정산 목록 조회
// GET /settlements/merchant?page=1&limit=20&period_start=2026-01-01&period_end=2026-01-31
// ============================================
exports.getMerchantSettlements = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { period_start, period_end } = req.query;

    const params = [restaurantId];
    const conditions = ['s.restaurant_id = $1'];

    if (period_start) {
      params.push(period_start);
      conditions.push(`s.period_start >= $${params.length}`);
    }

    if (period_end) {
      params.push(period_end);
      conditions.push(`s.period_end <= $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // 카운트 쿼리
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM settlements s WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 목록 쿼리
    const listParams = [...params, limit, offset];
    const settlementsResult = await pool.query(`
      SELECT s.id, s.restaurant_id, s.merchant_id,
             s.period_start, s.period_end,
             s.total_sales, s.platform_fee, s.payment_fee,
             s.settlement_amount, s.fee_rate, s.payment_fee_rate,
             s.order_count, s.status,
             s.bank_name, s.bank_account, s.bank_holder,
             s.paid_at, s.created_at
      FROM settlements s
      WHERE ${whereClause}
      ORDER BY s.period_end DESC, s.created_at DESC
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
    `, listParams);

    res.json({
      success: true,
      data: {
        settlements: settlementsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('점주 정산 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '정산 목록 조회 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 점주 정산 상세 (개별 주문 분해)
// GET /settlements/merchant/:id
// ============================================
exports.getMerchantSettlementDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.merchant.restaurantId;

    // 정산 기본 정보 조회
    const settlementResult = await pool.query(`
      SELECT s.*
      FROM settlements s
      WHERE s.id = $1 AND s.restaurant_id = $2
    `, [id, restaurantId]);

    if (settlementResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '정산 내역을 찾을 수 없습니다.' });
    }

    const settlement = settlementResult.rows[0];

    // 정산 항목 (개별 주문 분해) 조회
    const itemsResult = await pool.query(`
      SELECT si.id, si.order_id, si.reservation_id,
             si.order_amount, si.platform_fee, si.payment_fee, si.net_amount,
             o.created_at AS order_date,
             o.cooking_status,
             u.name AS customer_name,
             r.reservation_date, r.reservation_time, r.party_size
      FROM settlement_items si
      LEFT JOIN orders o ON o.id = si.order_id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN reservations r ON r.id = si.reservation_id
      WHERE si.settlement_id = $1
      ORDER BY o.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        settlement,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    logger.error('점주 정산 상세 조회 실패:', error);
    res.status(500).json({ success: false, error: '정산 상세 조회 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 점주 정산 요약 (총매출, 수수료, 순정산)
// GET /settlements/merchant/summary?period_start=2026-01-01&period_end=2026-01-31
// ============================================
exports.getMerchantSettlementSummary = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    const { period_start, period_end } = req.query;

    const params = [restaurantId];
    const conditions = ['s.restaurant_id = $1'];

    if (period_start) {
      params.push(period_start);
      conditions.push(`s.period_start >= $${params.length}`);
    }

    if (period_end) {
      params.push(period_end);
      conditions.push(`s.period_end <= $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const summaryResult = await pool.query(`
      SELECT
        COALESCE(SUM(s.total_sales), 0) AS total_sales,
        COALESCE(SUM(s.platform_fee), 0) AS total_platform_fee,
        COALESCE(SUM(s.payment_fee), 0) AS total_payment_fee,
        COALESCE(SUM(s.settlement_amount), 0) AS total_settlement,
        COALESCE(SUM(s.order_count), 0) AS total_orders,
        COUNT(s.id) AS settlement_count
      FROM settlements s
      WHERE ${whereClause}
    `, params);

    const summary = summaryResult.rows[0];

    // 상태별 집계
    const statusResult = await pool.query(`
      SELECT s.status, COUNT(*) AS count,
             COALESCE(SUM(s.settlement_amount), 0) AS amount
      FROM settlements s
      WHERE ${whereClause}
      GROUP BY s.status
    `, params);

    res.json({
      success: true,
      data: {
        total_sales: parseFloat(summary.total_sales),
        total_platform_fee: parseFloat(summary.total_platform_fee),
        total_payment_fee: parseFloat(summary.total_payment_fee),
        total_settlement: parseFloat(summary.total_settlement),
        total_orders: parseInt(summary.total_orders),
        settlement_count: parseInt(summary.settlement_count),
        by_status: statusResult.rows.map((r) => ({
          status: r.status,
          count: parseInt(r.count),
          amount: parseFloat(r.amount),
        })),
      },
    });
  } catch (error) {
    logger.error('점주 정산 요약 조회 실패:', error);
    res.status(500).json({ success: false, error: '정산 요약 조회 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 정산 실행 (관리자 또는 스케줄러)
// POST /settlements/process
// body: { period_start, period_end } (optional - 미지정 시 D+3 기준)
// ============================================
exports.processSettlements = async (req, res) => {
  const client = await pool.connect();
  try {
    const { period_start, period_end } = req.body || {};

    // 기본: D+3 영업일 전 완료된 주문 (간단하게 3일 전까지)
    const cutoffDate = period_end
      ? new Date(period_end)
      : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const startDate = period_start
      ? new Date(period_start)
      : new Date(cutoffDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 기본 30일 범위

    await client.query('BEGIN');

    // 1. completed 상태 + 아직 정산되지 않은 주문 조회
    const unsettledOrders = await client.query(`
      SELECT o.id AS order_id, o.reservation_id, o.restaurant_id,
             o.total_amount, o.created_at,
             r.reservation_date,
             rst.id AS rest_id
      FROM orders o
      JOIN reservations r ON o.reservation_id = r.id
      JOIN restaurants rst ON o.restaurant_id = rst.id
      WHERE o.cooking_status IN ('served', 'ready')
        AND r.status = 'completed'
        AND o.created_at <= $1
        AND o.created_at >= $2
        AND NOT EXISTS (
          SELECT 1 FROM settlement_items si WHERE si.order_id = o.id
        )
      ORDER BY o.restaurant_id, o.created_at
    `, [cutoffDate.toISOString(), startDate.toISOString()]);

    if (unsettledOrders.rows.length === 0) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        message: '정산할 주문이 없습니다.',
        data: { settlementsCreated: 0, ordersProcessed: 0 },
      });
    }

    // 2. 매장별 그룹핑
    const ordersByRestaurant = {};
    for (const order of unsettledOrders.rows) {
      const key = order.restaurant_id;
      if (!ordersByRestaurant[key]) {
        ordersByRestaurant[key] = [];
      }
      ordersByRestaurant[key].push(order);
    }

    let settlementsCreated = 0;
    const pendingNotifications = []; // COMMIT 후 발송할 점주 알림
    let ordersProcessed = 0;

    // 3. 각 매장별 정산 생성
    for (const [restaurantId, orders] of Object.entries(ordersByRestaurant)) {
      // 매장에 연결된 점주 조회
      const merchantResult = await client.query(
        'SELECT id, user_id, bank_name, bank_account, bank_holder FROM merchants WHERE restaurant_id = $1',
        [restaurantId]
      );

      if (merchantResult.rows.length === 0) {
        logger.warn('정산 스킵: 매장에 연결된 점주 없음:', { restaurantId });
        continue;
      }

      const merchant = merchantResult.rows[0];

      // 매장별 집계
      let totalSales = 0;
      const orderItems = [];

      for (const order of orders) {
        const orderAmount = parseFloat(order.total_amount) || 0;
        const platformFee = Math.round(orderAmount * PLATFORM_FEE_RATE);
        const paymentFee = Math.round(orderAmount * PAYMENT_FEE_RATE);
        const netAmount = orderAmount - platformFee - paymentFee;

        totalSales += orderAmount;

        orderItems.push({
          order_id: order.order_id,
          reservation_id: order.reservation_id,
          order_amount: orderAmount,
          platform_fee: platformFee,
          payment_fee: paymentFee,
          net_amount: netAmount,
        });
      }

      const totalPlatformFee = Math.round(totalSales * PLATFORM_FEE_RATE);
      const totalPaymentFee = Math.round(totalSales * PAYMENT_FEE_RATE);
      const settlementAmount = totalSales - totalPlatformFee - totalPaymentFee;

      // 4. settlements INSERT
      const settlementResult = await client.query(`
        INSERT INTO settlements (
          restaurant_id, merchant_id, period_start, period_end,
          total_sales, platform_fee, payment_fee, settlement_amount,
          fee_rate, payment_fee_rate, order_count, status,
          bank_name, bank_account, bank_holder,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, $14, NOW())
        RETURNING id
      `, [
        restaurantId,
        merchant.id || null,
        startDate.toISOString().split('T')[0],
        cutoffDate.toISOString().split('T')[0],
        totalSales,
        totalPlatformFee,
        totalPaymentFee,
        settlementAmount,
        PLATFORM_FEE_RATE,
        PAYMENT_FEE_RATE,
        orders.length,
        merchant.bank_name || null,
        merchant.bank_account || null,
        merchant.bank_holder || null,
      ]);

      const settlementId = settlementResult.rows[0].id;

      // 5. settlement_items INSERT
      for (const item of orderItems) {
        await client.query(`
          INSERT INTO settlement_items (
            settlement_id, order_id, reservation_id,
            order_amount, platform_fee, payment_fee, net_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          settlementId,
          item.order_id,
          item.reservation_id,
          item.order_amount,
          item.platform_fee,
          item.payment_fee,
          item.net_amount,
        ]);
      }

      settlementsCreated++;
      ordersProcessed += orders.length;

      // COMMIT 후 일괄 발송할 점주 알림 큐
      pendingNotifications.push({
        userId: merchant.user_id,
        settlementId,
        restaurantId,
        amount: settlementAmount,
        periodStart: startDate.toISOString().split('T')[0],
        periodEnd: cutoffDate.toISOString().split('T')[0],
      });

      logger.info('정산 생성 완료:', {
        settlementId,
        restaurantId,
        orderCount: orders.length,
        totalSales,
        settlementAmount,
      });
    }

    await client.query('COMMIT');

    // 점주 알림 (트랜잭션 외부, 비동기)
    for (const n of pendingNotifications) {
      if (!n.userId) continue;
      createNotification(n.userId, 'settlement_created',
        '정산 내역 생성',
        `${n.periodStart}~${n.periodEnd} 정산 ${Number(n.amount).toLocaleString('ko-KR')}원이 생성되었습니다.`,
        { settlementId: n.settlementId, restaurantId: n.restaurantId, amount: n.amount }
      ).catch(() => {});
    }

    res.json({
      success: true,
      message: '정산 처리가 완료되었습니다.',
      data: {
        settlementsCreated,
        ordersProcessed,
        periodStart: startDate.toISOString().split('T')[0],
        periodEnd: cutoffDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('정산 실행 실패:', error);
    res.status(500).json({ success: false, error: '정산 처리 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

// ============================================
// 점주 기간 매출 통계
// GET /settlements/merchant/stats?period=7d|30d
// 정산(D+3) 기준이 아닌 실매출(주문) 기준 집계 — 운영 의사결정용
// ============================================
exports.getMerchantStats = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: '매장 등록을 먼저 완료해주세요.' });
    }

    const period = req.query.period === '30d' ? 30 : 7;

    // 일별 매출/예약 수 (취소 제외)
    const dailyResult = await pool.query(
      `SELECT r.reservation_date::text AS date,
              COALESCE(SUM(o.total_amount), 0)::int AS sales,
              COUNT(DISTINCT r.id)::int AS reservations
       FROM reservations r
       LEFT JOIN orders o ON o.reservation_id = r.id AND o.cooking_status != 'rejected'
       WHERE r.restaurant_id = $1
         AND r.status != 'cancelled'
         AND r.reservation_date >= CURRENT_DATE - ($2 - 1) * INTERVAL '1 day'
         AND r.reservation_date <= CURRENT_DATE
       GROUP BY r.reservation_date
       ORDER BY r.reservation_date`,
      [restaurantId, period]
    );

    // 인기 메뉴 TOP 5 (수량 기준)
    const topMenusResult = await pool.query(
      `SELECT oi.menu_name,
              SUM(oi.quantity)::int AS qty,
              SUM(oi.subtotal)::int AS sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN reservations r ON o.reservation_id = r.id
       WHERE o.restaurant_id = $1
         AND o.cooking_status != 'rejected'
         AND r.status != 'cancelled'
         AND r.reservation_date >= CURRENT_DATE - ($2 - 1) * INTERVAL '1 day'
       GROUP BY oi.menu_name
       ORDER BY qty DESC, sales DESC
       LIMIT 5`,
      [restaurantId, period]
    );

    // 시간대별 (예약 시간 기준)
    const hourlyResult = await pool.query(
      `SELECT EXTRACT(HOUR FROM r.reservation_time)::int AS hour,
              COALESCE(SUM(o.total_amount), 0)::int AS sales,
              COUNT(DISTINCT r.id)::int AS reservations
       FROM reservations r
       LEFT JOIN orders o ON o.reservation_id = r.id AND o.cooking_status != 'rejected'
       WHERE r.restaurant_id = $1 AND r.status != 'cancelled'
         AND r.reservation_date >= CURRENT_DATE - ($2 - 1) * INTERVAL '1 day'
       GROUP BY hour ORDER BY hour`,
      [restaurantId, period]
    );

    // 요일별 (0=일 ~ 6=토)
    const weekdayResult = await pool.query(
      `SELECT EXTRACT(DOW FROM r.reservation_date)::int AS dow,
              COALESCE(SUM(o.total_amount), 0)::int AS sales,
              COUNT(DISTINCT r.id)::int AS reservations
       FROM reservations r
       LEFT JOIN orders o ON o.reservation_id = r.id AND o.cooking_status != 'rejected'
       WHERE r.restaurant_id = $1 AND r.status != 'cancelled'
         AND r.reservation_date >= CURRENT_DATE - ($2 - 1) * INTERVAL '1 day'
       GROUP BY dow ORDER BY dow`,
      [restaurantId, period]
    );

    const daily = dailyResult.rows;
    const totals = daily.reduce(
      (acc, d) => ({ sales: acc.sales + d.sales, reservations: acc.reservations + d.reservations }),
      { sales: 0, reservations: 0 }
    );

    res.json({
      success: true,
      data: {
        period: `${period}d`,
        total_sales: totals.sales,
        total_reservations: totals.reservations,
        daily,
        top_menus: topMenusResult.rows,
        hourly: hourlyResult.rows,
        weekday: weekdayResult.rows,
      },
    });
  } catch (error) {
    logger.error('점주 매출 통계 조회 실패:', error);
    res.status(500).json({ success: false, error: '매출 통계를 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 단골 고객 목록 — 완료 예약 N회 이상
 * GET /settlements/merchant/regulars?min_visits=N
 */
exports.getRegulars = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: '매장 등록을 먼저 완료해주세요.' });
    }
    const minVisits = Math.max(2, parseInt(req.query.min_visits || '2', 10));

    const result = await pool.query(
      `SELECT u.id AS user_id, u.name, u.phone_number,
              COUNT(*)::int AS visit_count,
              MAX(r.reservation_date)::text AS last_visit,
              COALESCE(SUM(o.total_amount), 0)::int AS total_spent
       FROM reservations r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN orders o ON o.reservation_id = r.id AND o.cooking_status != 'rejected'
       WHERE r.restaurant_id = $1 AND r.status = 'completed'
       GROUP BY u.id, u.name, u.phone_number
       HAVING COUNT(*) >= $2
       ORDER BY visit_count DESC, last_visit DESC
       LIMIT 100`,
      [restaurantId, minVisits]
    );

    res.json({ success: true, data: { regulars: result.rows, min_visits: minVisits } });
  } catch (error) {
    logger.error('단골 고객 조회 실패:', error);
    res.status(500).json({ success: false, error: '단골 고객을 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 단골 고객에게 알림 발송 (본인 매장 단골만 — 서버 재검증)
 * POST /settlements/merchant/regulars/notify  body: { user_ids[], title, message }
 */
exports.notifyRegulars = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: '매장 등록을 먼저 완료해주세요.' });
    }
    const { user_ids, title, message } = req.body;
    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title || !message) {
      return res.status(400).json({ success: false, error: '대상/제목/내용을 입력해주세요.' });
    }
    if (user_ids.length > 100) {
      return res.status(400).json({ success: false, error: '한 번에 최대 100명까지 발송할 수 있습니다.' });
    }

    // 본인 매장 단골(완료 예약 보유)인 user_id만 화이트리스트
    const verified = await pool.query(
      `SELECT DISTINCT user_id FROM reservations
       WHERE restaurant_id = $1 AND status = 'completed' AND user_id = ANY($2::uuid[])`,
      [restaurantId, user_ids]
    );
    const validIds = verified.rows.map((r) => r.user_id);
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, error: '발송 가능한 단골 고객이 없습니다.' });
    }

    const { restaurantName } = req.merchant;
    await Promise.all(validIds.map((uid) =>
      createNotification(uid, 'merchant_message',
        title,
        message,
        { restaurantId, fromRestaurant: restaurantName || '' }
      ).catch(() => {})
    ));

    res.json({ success: true, data: { sent: validIds.length } });
  } catch (error) {
    logger.error('단골 알림 발송 실패:', error);
    res.status(500).json({ success: false, error: '알림 발송 중 오류가 발생했습니다.' });
  }
};
