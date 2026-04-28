const pool = require('../../config/database');
const logger = require('../../config/logger');

/**
 * 레스토랑별 메뉴 목록 조회 (카테고리별 그룹핑)
 * GET /menus/restaurant/:restaurantId
 */
exports.getMenusByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const result = await pool.query(
      `SELECT
        m.id, m.restaurant_id, m.category_id, m.name, m.description,
        m.price, m.image_url, m.prep_time_min, m.min_order_qty, m.max_order_qty,
        m.is_set_menu, m.serves, m.options, m.sort_order,
        m.created_at, m.updated_at,
        mc.name AS category_name, mc.sort_order AS category_sort_order
      FROM menus m
      LEFT JOIN menu_categories mc ON m.category_id = mc.id
      WHERE m.restaurant_id = $1 AND m.is_active = true
      ORDER BY COALESCE(mc.sort_order, 999999), m.sort_order, m.name`,
      [restaurantId]
    );

    // 카테고리별로 그룹핑
    const grouped = {};
    const uncategorized = { category_id: null, category_name: '기타', menus: [] };

    for (const row of result.rows) {
      if (!row.category_id) {
        uncategorized.menus.push(row);
        continue;
      }

      if (!grouped[row.category_id]) {
        grouped[row.category_id] = {
          category_id: row.category_id,
          category_name: row.category_name,
          category_sort_order: row.category_sort_order,
          menus: [],
        };
      }
      grouped[row.category_id].menus.push(row);
    }

    const categories = Object.values(grouped).sort(
      (a, b) => (a.category_sort_order || 0) - (b.category_sort_order || 0)
    );

    if (uncategorized.menus.length > 0) {
      categories.push(uncategorized);
    }

    res.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        categories,
        total_count: result.rows.length,
      },
    });
  } catch (error) {
    logger.error('메뉴 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '메뉴 목록을 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 레스토랑별 카테고리 목록 조회
 * GET /menus/categories/:restaurantId
 */
exports.getCategoriesByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const result = await pool.query(
      `SELECT id, restaurant_id, name, sort_order, created_at, updated_at
      FROM menu_categories
      WHERE restaurant_id = $1
      ORDER BY sort_order, name`,
      [restaurantId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('카테고리 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '카테고리 목록을 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 메뉴 상세 조회
 * GET /menus/:id
 */
exports.getMenuById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        m.id, m.restaurant_id, m.category_id, m.name, m.description,
        m.price, m.image_url, m.prep_time_min, m.min_order_qty, m.max_order_qty,
        m.is_set_menu, m.serves, m.options, m.sort_order, m.is_active,
        m.created_at, m.updated_at,
        mc.name AS category_name
      FROM menus m
      LEFT JOIN menu_categories mc ON m.category_id = mc.id
      WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '메뉴를 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('메뉴 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '메뉴 정보를 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 메뉴 생성
 * POST /menus
 */
exports.createMenu = async (req, res) => {
  try {
    const {
      restaurant_id, category_id, name, description, price,
      image_url, prep_time_min, min_order_qty, max_order_qty,
      is_set_menu, serves, options, sort_order,
    } = req.body;

    // 점주의 레스토랑과 요청 restaurant_id 일치 확인
    if (req.merchant.restaurantId !== restaurant_id) {
      return res.status(403).json({
        success: false,
        error: '본인 레스토랑의 메뉴만 생성할 수 있습니다.',
      });
    }

    const result = await pool.query(
      `INSERT INTO menus (
        restaurant_id, category_id, name, description, price,
        image_url, prep_time_min, min_order_qty, max_order_qty,
        is_set_menu, serves, options, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        restaurant_id, category_id || null, name, description || null, price,
        image_url || null, prep_time_min, min_order_qty || null, max_order_qty || null,
        is_set_menu, serves || null, JSON.stringify(options || []), sort_order,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '메뉴가 생성되었습니다.',
    });
  } catch (error) {
    logger.error('메뉴 생성 오류:', error);
    res.status(500).json({ success: false, error: '메뉴 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 메뉴 수정
 * PUT /menus/:id
 */
exports.updateMenu = async (req, res) => {
  try {
    const { id } = req.params;

    // 메뉴 존재 및 소유권 확인
    const existing = await pool.query(
      'SELECT id, restaurant_id FROM menus WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: '메뉴를 찾을 수 없습니다.' });
    }

    if (existing.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({
        success: false,
        error: '본인 레스토랑의 메뉴만 수정할 수 있습니다.',
      });
    }

    // 동적 업데이트 쿼리 생성
    const allowedFields = [
      'category_id', 'name', 'description', 'price', 'image_url',
      'prep_time_min', 'min_order_qty', 'max_order_qty',
      'is_set_menu', 'serves', 'options', 'sort_order',
    ];

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx}`);
        values.push(field === 'options' ? JSON.stringify(req.body[field]) : req.body[field]);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목이 없습니다.' });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE menus SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: '메뉴가 수정되었습니다.',
    });
  } catch (error) {
    logger.error('메뉴 수정 오류:', error);
    res.status(500).json({ success: false, error: '메뉴 수정 중 오류가 발생했습니다.' });
  }
};

/**
 * 메뉴 삭제 (소프트 삭제)
 * DELETE /menus/:id
 */
exports.deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    // 메뉴 존재 및 소유권 확인
    const existing = await pool.query(
      'SELECT id, restaurant_id FROM menus WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: '메뉴를 찾을 수 없습니다.' });
    }

    if (existing.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({
        success: false,
        error: '본인 레스토랑의 메뉴만 삭제할 수 있습니다.',
      });
    }

    await pool.query(
      'UPDATE menus SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: '메뉴가 삭제되었습니다.',
    });
  } catch (error) {
    logger.error('메뉴 삭제 오류:', error);
    res.status(500).json({ success: false, error: '메뉴 삭제 중 오류가 발생했습니다.' });
  }
};

/**
 * 카테고리 생성
 * POST /menus/categories
 */
exports.createCategory = async (req, res) => {
  try {
    const { restaurant_id, name, sort_order } = req.body;

    // 점주의 레스토랑과 요청 restaurant_id 일치 확인
    if (req.merchant.restaurantId !== restaurant_id) {
      return res.status(403).json({
        success: false,
        error: '본인 레스토랑의 카테고리만 생성할 수 있습니다.',
      });
    }

    const result = await pool.query(
      `INSERT INTO menu_categories (restaurant_id, name, sort_order)
      VALUES ($1, $2, $3)
      RETURNING *`,
      [restaurant_id, name, sort_order]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '카테고리가 생성되었습니다.',
    });
  } catch (error) {
    logger.error('카테고리 생성 오류:', error);
    res.status(500).json({ success: false, error: '카테고리 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 카테고리 수정
 * PUT /menus/categories/:id
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // 카테고리 존재 및 소유권 확인
    const existing = await pool.query(
      'SELECT id, restaurant_id FROM menu_categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: '카테고리를 찾을 수 없습니다.' });
    }

    if (existing.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({
        success: false,
        error: '본인 레스토랑의 카테고리만 수정할 수 있습니다.',
      });
    }

    // 동적 업데이트 쿼리 생성
    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    if (req.body.name !== undefined) {
      setClauses.push(`name = $${paramIdx}`);
      values.push(req.body.name);
      paramIdx++;
    }

    if (req.body.sort_order !== undefined) {
      setClauses.push(`sort_order = $${paramIdx}`);
      values.push(req.body.sort_order);
      paramIdx++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목이 없습니다.' });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE menu_categories SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: '카테고리가 수정되었습니다.',
    });
  } catch (error) {
    logger.error('카테고리 수정 오류:', error);
    res.status(500).json({ success: false, error: '카테고리 수정 중 오류가 발생했습니다.' });
  }
};
