const pool = require('../../config/database');
const logger = require('../../config/logger');

/**
 * 주문 생성
 * POST /orders
 */
exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { reservation_id, items } = req.body;

    await client.query('BEGIN');

    // 1. 예약 존재 확인 + 본인 확인
    const reservationResult = await client.query(
      'SELECT id, user_id, restaurant_id, status FROM reservations WHERE id = $1',
      [reservation_id]
    );

    if (reservationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: '본인의 예약에만 주문할 수 있습니다.' });
    }

    // 2. 각 menu_id에 대해 price 조회 + 해당 restaurant 소속 확인
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuResult = await client.query(
        'SELECT id, name, price, restaurant_id FROM menus WHERE id = $1',
        [item.menu_id]
      );

      if (menuResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: `메뉴를 찾을 수 없습니다. (${item.menu_id})` });
      }

      const menu = menuResult.rows[0];

      if (menu.restaurant_id !== reservation.restaurant_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `해당 식당의 메뉴가 아닙니다. (${menu.name})` });
      }

      const subtotal = menu.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        menu_id: menu.id,
        menu_name: menu.name,
        unit_price: menu.price,
        quantity: item.quantity,
        subtotal,
        options: item.options || null,
      });
    }

    // 3. INSERT order
    const orderResult = await client.query(
      `INSERT INTO orders (reservation_id, restaurant_id, user_id, total_amount, cooking_status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, reservation_id, restaurant_id, user_id, total_amount, cooking_status, created_at`,
      [reservation_id, reservation.restaurant_id, userId, totalAmount]
    );

    const order = orderResult.rows[0];

    // 4. INSERT order_items
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_id, menu_name, unit_price, quantity, subtotal, options)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.menu_id, item.menu_name, item.unit_price, item.quantity, item.subtotal, item.options ? JSON.stringify(item.options) : null]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      order: {
        ...order,
        items: orderItems,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('주문 생성 실패:', error);
    res.status(500).json({ success: false, error: '주문 생성 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

/**
 * 주문 상세 조회
 * GET /orders/:id
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const orderResult = await pool.query(
      `SELECT o.id, o.reservation_id, o.restaurant_id, o.user_id,
              o.total_amount, o.cooking_status, o.cooking_started_at,
              o.cooking_ready_at, o.created_at, o.updated_at
       FROM orders o
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }

    const order = orderResult.rows[0];

    // 본인 또는 점주 확인
    if (order.user_id !== userId) {
      const merchantResult = await pool.query(
        'SELECT id FROM merchants WHERE user_id = $1 AND restaurant_id = $2 AND verification_status = $3',
        [userId, order.restaurant_id, 'verified']
      );
      if (merchantResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
      }
    }

    // 주문 항목 조회
    const itemsResult = await pool.query(
      `SELECT id, menu_id, menu_name, unit_price, quantity, subtotal, options
       FROM order_items
       WHERE order_id = $1
       ORDER BY id ASC`,
      [id]
    );

    res.json({
      success: true,
      order: {
        ...order,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    logger.error('주문 상세 조회 실패:', error);
    res.status(500).json({ success: false, error: '주문 상세 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 예약별 주문 조회
 * GET /orders/reservation/:reservationId
 */
exports.getOrderByReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userId = req.user.userId;

    // 예약 본인 확인
    const reservationResult = await pool.query(
      'SELECT id, user_id FROM reservations WHERE id = $1',
      [reservationId]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    if (reservationResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: '접근 권한이 없습니다.' });
    }

    const orderResult = await pool.query(
      `SELECT o.id, o.reservation_id, o.restaurant_id, o.user_id,
              o.total_amount, o.cooking_status, o.cooking_started_at,
              o.cooking_ready_at, o.created_at
       FROM orders o
       WHERE o.reservation_id = $1`,
      [reservationId]
    );

    if (orderResult.rows.length === 0) {
      return res.json({ success: true, order: null });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT id, menu_id, menu_name, unit_price, quantity, subtotal, options
       FROM order_items
       WHERE order_id = $1
       ORDER BY id ASC`,
      [order.id]
    );

    res.json({
      success: true,
      order: {
        ...order,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    logger.error('예약별 주문 조회 실패:', error);
    res.status(500).json({ success: false, error: '주문 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 점주 주문 목록 조회
 * GET /orders/merchant?date=YYYY-MM-DD
 */
exports.getMerchantOrders = async (req, res) => {
  try {
    const restaurantId = req.merchant.restaurantId;
    const { date } = req.query;

    let query = `
      SELECT o.id, o.reservation_id, o.total_amount, o.cooking_status,
             o.cooking_started_at, o.cooking_ready_at, o.created_at,
             r.reservation_date, r.reservation_time, r.party_size,
             u.name AS user_name
      FROM orders o
      JOIN reservations r ON o.reservation_id = r.id
      JOIN users u ON o.user_id = u.id
      WHERE o.restaurant_id = $1
    `;
    const params = [restaurantId];

    if (date) {
      params.push(date);
      query += ` AND r.reservation_date = $${params.length}`;
    }

    query += ' ORDER BY o.created_at DESC';

    const ordersResult = await pool.query(query, params);

    // 각 주문의 항목도 조회
    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await pool.query(
        `SELECT id, menu_id, menu_name, unit_price, quantity, subtotal, options
         FROM order_items
         WHERE order_id = $1
         ORDER BY id ASC`,
        [order.id]
      );
      orders.push({
        ...order,
        items: itemsResult.rows,
      });
    }

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    logger.error('점주 주문 목록 조회 실패:', error);
    res.status(500).json({ success: false, error: '주문 목록 조회 중 오류가 발생했습니다.' });
  }
};

/**
 * 조리 상태 업데이트 (점주)
 * PUT /orders/:id/cooking-status
 */
exports.updateCookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.merchant.restaurantId;
    const { cooking_status } = req.body;

    // 1. 주문의 restaurant_id 확인
    const orderResult = await pool.query(
      'SELECT id, restaurant_id, cooking_status FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }

    const order = orderResult.rows[0];

    if (order.restaurant_id !== restaurantId) {
      return res.status(403).json({ success: false, error: '해당 식당의 주문이 아닙니다.' });
    }

    // 2. 상태 전이 검증
    const validTransitions = {
      pending: ['preparing'],
      preparing: ['cooking'],
      cooking: ['ready'],
      ready: ['served'],
    };

    const allowedNextStatuses = validTransitions[order.cooking_status];
    if (!allowedNextStatuses || !allowedNextStatuses.includes(cooking_status)) {
      return res.status(400).json({
        success: false,
        error: `현재 상태(${order.cooking_status})에서 ${cooking_status}(으)로 변경할 수 없습니다.`,
      });
    }

    // 3. UPDATE cooking_status + timestamp
    let updateQuery = 'UPDATE orders SET cooking_status = $1, updated_at = NOW()';
    const params = [cooking_status];

    if (cooking_status === 'preparing') {
      updateQuery += ', cooking_started_at = NOW()';
    } else if (cooking_status === 'ready') {
      updateQuery += ', cooking_ready_at = NOW()';
    }

    params.push(id);
    updateQuery += ` WHERE id = $${params.length}`;

    await pool.query(updateQuery, params);

    res.json({
      success: true,
      message: `조리 상태가 ${cooking_status}(으)로 변경되었습니다.`,
    });
  } catch (error) {
    logger.error('조리 상태 업데이트 실패:', error);
    res.status(500).json({ success: false, error: '조리 상태 업데이트 중 오류가 발생했습니다.' });
  }
};
