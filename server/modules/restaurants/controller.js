const pool = require('../../config/database');
const logger = require('../../config/logger');

// ============================================
// Public 조회 API
// ============================================

/**
 * 식당 목록 조회 (페이지네이션, 카테고리 필터)
 * GET /restaurants?page=1&limit=20&category=한식
 */
exports.getRestaurants = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { category } = req.query;

    let query = `
      SELECT r.*,
             COALESCE(AVG(rv.overall_rating), 0) AS avg_rating,
             COUNT(DISTINCT rv.id) AS review_count
      FROM restaurants r
      LEFT JOIN restaurant_reviews rv ON rv.restaurant_id = r.id
      WHERE r.is_active = true
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND r.category = $${params.length}`;
    }

    query += ` GROUP BY r.id ORDER BY r.created_at DESC`;

    // Count query
    let countQuery = `SELECT COUNT(*) FROM restaurants WHERE is_active = true`;
    const countParams = [];
    if (category) {
      countParams.push(category);
      countQuery += ` AND category = $${countParams.length}`;
    }

    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const [restaurantsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      restaurants: restaurantsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('식당 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '식당 목록을 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 주변 식당 검색 (Haversine 공식)
 * GET /restaurants/nearby?lat=37.5&lng=127.0&radius=3000&category=한식
 */
exports.getNearbyRestaurants = async (req, res) => {
  try {
    const { lat, lng, radius = 3000, category, limit = 20, offset = 0 } = req.query;

    const params = [lat, lng, radius];
    let categoryFilter = '';

    if (category) {
      params.push(category);
      categoryFilter = `AND r.category = $${params.length}`;
    }

    params.push(limit, offset);

    const query = `
      SELECT r.*,
             COALESCE(AVG(rv.overall_rating), 0) AS avg_rating,
             COUNT(DISTINCT rv.id) AS review_count,
             (6371000 * acos(
               cos(radians($1)) * cos(radians(r.latitude)) *
               cos(radians(r.longitude) - radians($2)) +
               sin(radians($1)) * sin(radians(r.latitude))
             )) AS distance
      FROM restaurants r
      LEFT JOIN restaurant_reviews rv ON rv.restaurant_id = r.id
      WHERE r.is_active = true
        AND r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
        AND (6371000 * acos(
          cos(radians($1)) * cos(radians(r.latitude)) *
          cos(radians(r.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(r.latitude))
        )) <= $3
        ${categoryFilter}
      GROUP BY r.id
      ORDER BY distance ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      restaurants: result.rows,
    });
  } catch (error) {
    logger.error('주변 식당 검색 오류:', error);
    res.status(500).json({ success: false, error: '주변 식당을 검색하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 식당 검색 (키워드/카테고리)
 * GET /restaurants/search?keyword=파스타&category=양식
 */
exports.searchRestaurants = async (req, res) => {
  try {
    const { keyword, category, limit = 20, offset = 0 } = req.query;

    const params = [];
    const conditions = ['r.is_active = true'];

    if (keyword) {
      params.push(`%${keyword}%`);
      conditions.push(`(r.name ILIKE $${params.length} OR r.category ILIKE $${params.length})`);
    }

    if (category) {
      params.push(category);
      conditions.push(`r.category = $${params.length}`);
    }

    params.push(limit, offset);

    const query = `
      SELECT r.*,
             COALESCE(AVG(rv.overall_rating), 0) AS avg_rating,
             COUNT(DISTINCT rv.id) AS review_count
      FROM restaurants r
      LEFT JOIN restaurant_reviews rv ON rv.restaurant_id = r.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY r.id
      ORDER BY r.name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      restaurants: result.rows,
    });
  } catch (error) {
    logger.error('식당 검색 오류:', error);
    res.status(500).json({ success: false, error: '식당을 검색하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 식당 상세 조회 (메뉴, 타임슬롯, 평균 평점 포함)
 * GET /restaurants/:id
 */
exports.getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;

    // 식당 기본 정보 + 평균 평점
    const restaurantQuery = `
      SELECT r.*,
             COALESCE(AVG(rv.overall_rating), 0) AS avg_rating,
             COUNT(DISTINCT rv.id) AS review_count
      FROM restaurants r
      LEFT JOIN restaurant_reviews rv ON rv.restaurant_id = r.id
      WHERE r.id = $1 AND r.is_active = true
      GROUP BY r.id
    `;

    // 메뉴 목록 (카테고리 join)
    const menusQuery = `
      SELECT m.id, m.name, m.description, m.price, m.image_url, m.is_active,
             m.sort_order, m.is_set_menu, m.serves, m.prep_time_min,
             m.category_id, c.name AS category_name
      FROM menus m
      LEFT JOIN menu_categories c ON c.id = m.category_id
      WHERE m.restaurant_id = $1 AND m.is_active = true
      ORDER BY c.sort_order NULLS LAST, m.sort_order, m.name
    `;

    // 타임슬롯 목록
    const timeSlotsQuery = `
      SELECT id, day_of_week, slot_time, max_reservations, current_reservations, is_active
      FROM restaurant_time_slots
      WHERE restaurant_id = $1 AND is_active = true
      ORDER BY day_of_week, slot_time
    `;

    const [restaurantResult, menusResult, timeSlotsResult] = await Promise.all([
      pool.query(restaurantQuery, [id]),
      pool.query(menusQuery, [id]),
      pool.query(timeSlotsQuery, [id]),
    ]);

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '식당을 찾을 수 없습니다.' });
    }

    // 메뉴를 카테고리별로 그룹핑
    const menusByCategory = {};
    for (const menu of menusResult.rows) {
      const cat = menu.category_name || '기타';
      if (!menusByCategory[cat]) {
        menusByCategory[cat] = [];
      }
      menusByCategory[cat].push(menu);
    }

    res.json({
      success: true,
      data: {
        ...restaurantResult.rows[0],
        menus: menusResult.rows,
        menusByCategory,
        timeSlots: timeSlotsResult.rows,
      },
    });
  } catch (error) {
    logger.error('식당 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '식당 정보를 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 식당 타임슬롯 조회
 * GET /restaurants/:id/time-slots?date=2026-04-28
 */
exports.getTimeSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const params = [id];
    let dayFilter = '';

    if (date) {
      // date 문자열로부터 요일 계산 (0=일, 1=월, ..., 6=토)
      const dayOfWeek = new Date(date).getDay();
      params.push(dayOfWeek);
      dayFilter = `AND rts.day_of_week = $${params.length}`;
    }

    const query = `
      SELECT rts.id, rts.day_of_week, rts.slot_time,
             rts.max_reservations, rts.current_reservations, rts.is_active
      FROM restaurant_time_slots rts
      WHERE rts.restaurant_id = $1
        AND rts.is_active = true
        ${dayFilter}
      ORDER BY rts.day_of_week, rts.slot_time
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    logger.error('타임슬롯 조회 오류:', error);
    res.status(500).json({ success: false, error: '타임슬롯을 불러오는 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 점주 전용 API
// ============================================

/**
 * 식당 등록
 * POST /restaurants
 */
exports.createRestaurant = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const existingRestaurantId = req.merchant.restaurantId;

    // 이미 식당이 등록되어 있는 경우
    if (existingRestaurantId) {
      return res.status(400).json({
        success: false,
        error: '이미 등록된 식당이 있습니다. 기존 식당 정보를 수정해주세요.',
      });
    }

    const {
      name, description, category, phone, address, address_detail,
      latitude, longitude, image_url, images, operating_hours, seat_count,
    } = req.body;

    const result = await pool.query(`
      INSERT INTO restaurants (
        name, description, category, phone, address, address_detail,
        latitude, longitude, image_url, images, operating_hours, seat_count,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      RETURNING *
    `, [
      name, description || null, category || null, phone || null,
      address, address_detail || null, latitude || null, longitude || null,
      image_url || null, JSON.stringify(images || []),
      JSON.stringify(operating_hours || {}), seat_count || null,
    ]);

    const restaurant = result.rows[0];

    // merchants 테이블의 restaurant_id 업데이트
    await pool.query(
      'UPDATE merchants SET restaurant_id = $1 WHERE id = $2',
      [restaurant.id, merchantId]
    );

    logger.info('식당 등록 완료:', { restaurantId: restaurant.id, merchantId });

    res.status(201).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    logger.error('식당 등록 오류:', error);
    res.status(500).json({ success: false, error: '식당 등록 중 오류가 발생했습니다.' });
  }
};

/**
 * 식당 정보 수정
 * PUT /restaurants/:id
 */
exports.updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantRestaurantId = req.merchant.restaurantId;

    // 본인 식당인지 확인
    if (String(id) !== String(merchantRestaurantId)) {
      return res.status(403).json({
        success: false,
        error: '본인 식당만 수정할 수 있습니다.',
      });
    }

    const {
      name, description, category, phone, address, address_detail,
      latitude, longitude, image_url, images, operating_hours, seat_count,
    } = req.body;

    // 동적 업데이트 쿼리 생성
    const fields = [];
    const params = [];

    const addField = (column, value) => {
      if (value !== undefined) {
        params.push(column === 'images' || column === 'operating_hours' ? JSON.stringify(value) : value);
        fields.push(`${column} = $${params.length}`);
      }
    };

    addField('name', name);
    addField('description', description);
    addField('category', category);
    addField('phone', phone);
    addField('address', address);
    addField('address_detail', address_detail);
    addField('latitude', latitude);
    addField('longitude', longitude);
    addField('image_url', image_url);
    addField('images', images);
    addField('operating_hours', operating_hours);
    addField('seat_count', seat_count);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목이 없습니다.' });
    }

    params.push(id);
    const query = `
      UPDATE restaurants
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length} AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '식당을 찾을 수 없습니다.' });
    }

    logger.info('식당 정보 수정 완료:', { restaurantId: id });

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('식당 정보 수정 오류:', error);
    res.status(500).json({ success: false, error: '식당 정보 수정 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 즐겨찾기 / 조회 기록 API
// ============================================

/**
 * 즐겨찾기 토글
 * POST /restaurants/:id/favorite
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const userId = req.user.userId;
    const restaurantId = req.params.id;

    // 식당 존재 확인
    const restaurantCheck = await pool.query(
      'SELECT id FROM restaurants WHERE id = $1 AND is_active = true',
      [restaurantId]
    );

    if (restaurantCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: '식당을 찾을 수 없습니다.' });
    }

    // 이미 즐겨찾기 되어 있는지 확인
    const existing = await pool.query(
      'SELECT id FROM restaurant_favorites WHERE user_id = $1 AND restaurant_id = $2',
      [userId, restaurantId]
    );

    let isFavorited;

    if (existing.rows.length > 0) {
      // 즐겨찾기 해제
      await pool.query(
        'DELETE FROM restaurant_favorites WHERE user_id = $1 AND restaurant_id = $2',
        [userId, restaurantId]
      );
      isFavorited = false;
    } else {
      // 즐겨찾기 추가
      await pool.query(
        'INSERT INTO restaurant_favorites (user_id, restaurant_id) VALUES ($1, $2)',
        [userId, restaurantId]
      );
      isFavorited = true;
    }

    res.json({
      success: true,
      data: { isFavorited },
    });
  } catch (error) {
    logger.error('즐겨찾기 토글 오류:', error);
    res.status(500).json({ success: false, error: '즐겨찾기 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * 즐겨찾기 목록 조회
 * GET /restaurants/favorites
 */
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT r.*,
             COALESCE(AVG(rv.overall_rating), 0) AS avg_rating,
             COUNT(DISTINCT rv.id) AS review_count,
             rf.created_at AS favorited_at
      FROM restaurants r
      INNER JOIN restaurant_favorites rf ON rf.restaurant_id = r.id
      LEFT JOIN restaurant_reviews rv ON rv.restaurant_id = r.id
      WHERE rf.user_id = $1 AND r.is_active = true
      GROUP BY r.id, rf.created_at
      ORDER BY rf.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      restaurants: result.rows,
    });
  } catch (error) {
    logger.error('즐겨찾기 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '즐겨찾기 목록을 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 조회 기록 저장
 * POST /restaurants/:id/view
 */
exports.recordView = async (req, res) => {
  try {
    const userId = req.user.userId;
    const restaurantId = req.params.id;

    await pool.query(`
      INSERT INTO user_recent_restaurant_views (user_id, restaurant_id, viewed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, restaurant_id)
      DO UPDATE SET viewed_at = NOW()
    `, [userId, restaurantId]);

    res.json({ success: true });
  } catch (error) {
    logger.error('조회 기록 저장 오류:', error);
    res.status(500).json({ success: false, error: '조회 기록 저장 중 오류가 발생했습니다.' });
  }
};

/**
 * 최근 본 식당 목록 조회
 * GET /restaurants/recent-views
 */
exports.getRecentViews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT r.*,
             COALESCE(AVG(rv.overall_rating), 0) AS avg_rating,
             COUNT(DISTINCT rv.id) AS review_count,
             urv.viewed_at
      FROM restaurants r
      INNER JOIN user_recent_restaurant_views urv ON urv.restaurant_id = r.id
      LEFT JOIN restaurant_reviews rv ON rv.restaurant_id = r.id
      WHERE urv.user_id = $1 AND r.is_active = true
      GROUP BY r.id, urv.viewed_at
      ORDER BY urv.viewed_at DESC
      LIMIT 20
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      restaurants: result.rows,
    });
  } catch (error) {
    logger.error('최근 본 식당 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '최근 본 식당 목록을 불러오는 중 오류가 발생했습니다.' });
  }
};

// ============================================
// 타임슬롯 CRUD (점주)
// ============================================

exports.createTimeSlot = async (req, res) => {
  try {
    const { id: restaurantId } = req.params;
    const merchantRestaurantId = req.merchant && req.merchant.restaurantId;
    if (!merchantRestaurantId || merchantRestaurantId !== restaurantId) {
      return res.status(403).json({ success: false, error: '본인 매장만 슬롯을 추가할 수 있습니다.' });
    }

    const { day_of_week, slot_time, max_reservations } = req.body;
    if (typeof day_of_week !== 'number' || day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ success: false, error: 'day_of_week는 0~6이어야 합니다.' });
    }
    if (!slot_time) {
      return res.status(400).json({ success: false, error: 'slot_time이 필요합니다.' });
    }

    const result = await pool.query(
      `INSERT INTO restaurant_time_slots (restaurant_id, day_of_week, slot_time, max_reservations, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (restaurant_id, day_of_week, slot_time)
       DO UPDATE SET max_reservations = EXCLUDED.max_reservations, is_active = true
       RETURNING *`,
      [restaurantId, day_of_week, slot_time, max_reservations || 5]
    );

    res.status(201).json({ success: true, timeSlot: result.rows[0] });
  } catch (error) {
    logger.error('타임슬롯 생성 오류:', error);
    res.status(500).json({ success: false, error: '타임슬롯 생성 중 오류가 발생했습니다.' });
  }
};

exports.deleteTimeSlot = async (req, res) => {
  try {
    const { id: restaurantId, slotId } = req.params;
    const merchantRestaurantId = req.merchant && req.merchant.restaurantId;
    if (!merchantRestaurantId || merchantRestaurantId !== restaurantId) {
      return res.status(403).json({ success: false, error: '본인 매장의 슬롯만 삭제할 수 있습니다.' });
    }

    const result = await pool.query(
      `DELETE FROM restaurant_time_slots WHERE id = $1 AND restaurant_id = $2 RETURNING id`,
      [slotId, restaurantId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: '슬롯을 찾을 수 없습니다.' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('타임슬롯 삭제 오류:', error);
    res.status(500).json({ success: false, error: '타임슬롯 삭제 중 오류가 발생했습니다.' });
  }
};
