/**
 * 정산 처리 스케줄러
 *
 * 매일 자정(00:00)에 실행:
 * - D+3 영업일 전에 완료(completed)된 주문 중 미정산 건 조회
 * - 매장별로 정산 처리
 * - settlements + settlement_items 생성
 */

const pool = require('../../config/database');
const logger = require('../../config/logger');

const JOB_NAME = '[정산 처리]';
const PLATFORM_FEE_RATE = 0.05; // 5%
const PAYMENT_FEE_RATE = 0.03;  // 3%
const SETTLEMENT_DELAY_DAYS = 3; // D+3

async function run() {
  const client = await pool.connect();
  try {
    // D+3: 3일 전까지 완료된 주문만 정산 대상
    const cutoffDate = new Date(Date.now() - SETTLEMENT_DELAY_DAYS * 24 * 60 * 60 * 1000);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    await client.query('BEGIN');

    // 1. completed 상태 + 아직 정산되지 않은 주문 조회
    const unsettledResult = await client.query(`
      SELECT o.id AS order_id, o.reservation_id, o.restaurant_id,
             o.total_amount, o.created_at
      FROM orders o
      JOIN reservations r ON o.reservation_id = r.id
      WHERE o.cooking_status IN ('served', 'ready')
        AND r.status = 'completed'
        AND o.created_at::date <= $1
        AND NOT EXISTS (
          SELECT 1 FROM settlement_items si WHERE si.order_id = o.id
        )
      ORDER BY o.restaurant_id, o.created_at
    `, [cutoffDateStr]);

    if (unsettledResult.rows.length === 0) {
      await client.query('COMMIT');
      return;
    }

    logger.info(`${JOB_NAME} 미정산 주문 ${unsettledResult.rows.length}건 발견`);

    // 2. 매장별 그룹핑
    const ordersByRestaurant = {};
    for (const order of unsettledResult.rows) {
      const key = order.restaurant_id;
      if (!ordersByRestaurant[key]) {
        ordersByRestaurant[key] = [];
      }
      ordersByRestaurant[key].push(order);
    }

    let settlementsCreated = 0;
    let ordersProcessed = 0;

    // 3. 매장별 정산 생성
    for (const [restaurantId, orders] of Object.entries(ordersByRestaurant)) {
      // 점주 정보 조회
      const merchantResult = await client.query(
        'SELECT id, bank_name, bank_account, bank_holder FROM merchants WHERE restaurant_id = $1',
        [restaurantId]
      );
      if (merchantResult.rows.length === 0) {
        logger.warn(`${JOB_NAME} 매장 ${restaurantId}: 점주 없음, 정산 스킵`);
        continue;
      }

      const merchant = merchantResult.rows[0];

      // 주문 날짜 범위 계산
      const orderDates = orders.map((o) => new Date(o.created_at));
      const periodStart = new Date(Math.min(...orderDates)).toISOString().split('T')[0];
      const periodEnd = cutoffDateStr;

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

      // settlements INSERT
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
        periodStart,
        periodEnd,
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

      // settlement_items INSERT
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

      logger.info(`${JOB_NAME} 매장 ${restaurantId}: ${orders.length}건 정산 생성 (ID: ${settlementId}, 금액: ${settlementAmount})`);
    }

    await client.query('COMMIT');

    logger.info(`${JOB_NAME} 완료: ${settlementsCreated}개 정산, ${ordersProcessed}건 주문 처리`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`${JOB_NAME} 실행 실패:`, error);
  } finally {
    client.release();
  }
}

module.exports = { run };
