const pool = require('../../config/database');
const logger = require('../../config/logger');
const OpenAI = require('openai');

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

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const merchantRestaurantId = req.merchant && req.merchant.restaurantId;

    const cat = await pool.query('SELECT id, restaurant_id FROM menu_categories WHERE id = $1', [id]);
    if (cat.rows.length === 0) {
      return res.status(404).json({ success: false, error: '카테고리를 찾을 수 없습니다.' });
    }
    if (cat.rows[0].restaurant_id !== merchantRestaurantId) {
      return res.status(403).json({ success: false, error: '본인 매장의 카테고리만 삭제할 수 있습니다.' });
    }

    await pool.query('DELETE FROM menu_categories WHERE id = $1', [id]);

    res.json({ success: true, message: '카테고리가 삭제되었습니다.' });
  } catch (error) {
    logger.error('카테고리 삭제 오류:', error);
    res.status(500).json({ success: false, error: '카테고리 삭제 중 오류가 발생했습니다.' });
  }
};

/**
 * AI 메뉴판 사진 분석
 * POST /menus/analyze-image
 * Body: { image_base64: string } (data:image/...;base64,... or raw base64)
 */
exports.analyzeMenuImage = async (req, res) => {
  try {
    const { image_base64 } = req.body;

    if (!image_base64) {
      return res.status(400).json({ success: false, error: '이미지가 필요합니다.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY가 설정되지 않았습니다.');
      return res.status(500).json({ success: false, error: 'AI 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.' });
    }
    const openai = new OpenAI({ apiKey });

    // data URL이면 그대로, 아니면 data URL로 변환
    const imageUrl = image_base64.startsWith('data:')
      ? image_base64
      : `data:image/jpeg;base64,${image_base64}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `당신은 메뉴판 사진을 분석하여 메뉴 항목을 추출하는 전문가입니다.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "menus": [
    {
      "name": "메뉴명",
      "price": 숫자(원 단위),
      "description": "설명 (있으면)",
      "category": "카테고리명 (추정)"
    }
  ]
}

규칙:
- 가격은 반드시 숫자만 (원 단위, 콤마/만원 등 변환)
- 가격을 못 읽으면 0으로
- 카테고리는 메뉴판 구분이 있으면 그대로, 없으면 "메인", "사이드", "음료", "주류", "디저트" 등으로 추정
- 세트메뉴는 description에 구성 내용 포함`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '이 메뉴판 사진에서 모든 메뉴 항목을 추출해주세요.' },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content || '';

    // JSON 파싱 (```json ... ``` 블록 처리)
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      logger.error('AI 메뉴 분석 JSON 파싱 실패:', content);
      return res.status(422).json({ success: false, error: 'AI 응답을 파싱할 수 없습니다.', raw: content });
    }

    logger.info('AI 메뉴 분석 완료:', { count: parsed.menus?.length || 0 });

    res.json({
      success: true,
      data: {
        menus: parsed.menus || [],
      },
    });
  } catch (error) {
    logger.error('AI 메뉴 분석 오류:', { status: error.status, code: error.code, message: error.message });
    if (error.code === 'image_parse_error') {
      return res.status(400).json({ success: false, error: '이미지를 인식할 수 없습니다. 선명한 메뉴판 사진을 업로드해주세요.' });
    }
    if (error.status === 401 || error.code === 'invalid_api_key') {
      return res.status(500).json({ success: false, error: 'AI 서비스 인증 오류입니다. 관리자에게 문의하세요.' });
    }
    res.status(500).json({ success: false, error: 'AI 메뉴 분석 중 오류가 발생했습니다.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// 옵션 그룹 CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * 메뉴별 옵션 그룹 목록 조회
 * GET /menus/:menuId/options
 */
exports.getOptionGroups = async (req, res) => {
  try {
    const { menuId } = req.params;

    const groups = await pool.query(
      `SELECT id, menu_id, name, is_required, min_select, max_select, sort_order, created_at
       FROM menu_option_groups
       WHERE menu_id = $1
       ORDER BY sort_order, created_at`,
      [menuId]
    );

    // 각 그룹의 아이템도 함께 조회
    const groupIds = groups.rows.map((g) => g.id);
    let items = [];
    if (groupIds.length > 0) {
      const itemsResult = await pool.query(
        `SELECT id, option_group_id, name, additional_price, is_active, sort_order, created_at
         FROM menu_option_items
         WHERE option_group_id = ANY($1)
         ORDER BY sort_order, created_at`,
        [groupIds]
      );
      items = itemsResult.rows;
    }

    // 그룹에 아이템 매핑
    const data = groups.rows.map((group) => ({
      ...group,
      items: items.filter((item) => item.option_group_id === group.id),
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('옵션 그룹 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '옵션 그룹 목록을 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 옵션 그룹 생성
 * POST /menus/:menuId/options
 */
exports.createOptionGroup = async (req, res) => {
  try {
    const { menuId } = req.params;
    const { name, is_required, min_select, max_select, sort_order } = req.body;

    // 메뉴 존재 및 소유권 확인
    const menu = await pool.query('SELECT id, restaurant_id FROM menus WHERE id = $1', [menuId]);
    if (menu.rows.length === 0) {
      return res.status(404).json({ success: false, error: '메뉴를 찾을 수 없습니다.' });
    }
    if (menu.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({ success: false, error: '본인 레스토랑의 메뉴만 수정할 수 있습니다.' });
    }

    const result = await pool.query(
      `INSERT INTO menu_option_groups (menu_id, name, is_required, min_select, max_select, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [menuId, name, is_required || false, min_select || 0, max_select || 1, sort_order || 0]
    );

    res.status(201).json({
      success: true,
      data: { ...result.rows[0], items: [] },
      message: '옵션 그룹이 생성되었습니다.',
    });
  } catch (error) {
    logger.error('옵션 그룹 생성 오류:', error);
    res.status(500).json({ success: false, error: '옵션 그룹 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 옵션 그룹 수정
 * PUT /menus/options/:groupId
 */
exports.updateOptionGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, is_required, min_select, max_select, sort_order } = req.body;

    // 그룹 존재 확인 + 소유권 확인
    const group = await pool.query(
      `SELECT og.id, m.restaurant_id
       FROM menu_option_groups og
       JOIN menus m ON og.menu_id = m.id
       WHERE og.id = $1`,
      [groupId]
    );
    if (group.rows.length === 0) {
      return res.status(404).json({ success: false, error: '옵션 그룹을 찾을 수 없습니다.' });
    }
    if (group.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({ success: false, error: '본인 레스토랑의 옵션만 수정할 수 있습니다.' });
    }

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    if (name !== undefined) { setClauses.push(`name = $${paramIdx}`); values.push(name); paramIdx++; }
    if (is_required !== undefined) { setClauses.push(`is_required = $${paramIdx}`); values.push(is_required); paramIdx++; }
    if (min_select !== undefined) { setClauses.push(`min_select = $${paramIdx}`); values.push(min_select); paramIdx++; }
    if (max_select !== undefined) { setClauses.push(`max_select = $${paramIdx}`); values.push(max_select); paramIdx++; }
    if (sort_order !== undefined) { setClauses.push(`sort_order = $${paramIdx}`); values.push(sort_order); paramIdx++; }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목이 없습니다.' });
    }

    values.push(groupId);
    const result = await pool.query(
      `UPDATE menu_option_groups SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0], message: '옵션 그룹이 수정되었습니다.' });
  } catch (error) {
    logger.error('옵션 그룹 수정 오류:', error);
    res.status(500).json({ success: false, error: '옵션 그룹 수정 중 오류가 발생했습니다.' });
  }
};

/**
 * 옵션 그룹 삭제
 * DELETE /menus/options/:groupId
 */
exports.deleteOptionGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // 그룹 존재 확인 + 소유권 확인
    const group = await pool.query(
      `SELECT og.id, m.restaurant_id
       FROM menu_option_groups og
       JOIN menus m ON og.menu_id = m.id
       WHERE og.id = $1`,
      [groupId]
    );
    if (group.rows.length === 0) {
      return res.status(404).json({ success: false, error: '옵션 그룹을 찾을 수 없습니다.' });
    }
    if (group.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({ success: false, error: '본인 레스토랑의 옵션만 삭제할 수 있습니다.' });
    }

    await pool.query('DELETE FROM menu_option_groups WHERE id = $1', [groupId]);

    res.json({ success: true, message: '옵션 그룹이 삭제되었습니다.' });
  } catch (error) {
    logger.error('옵션 그룹 삭제 오류:', error);
    res.status(500).json({ success: false, error: '옵션 그룹 삭제 중 오류가 발생했습니다.' });
  }
};

// ═══════════════════════════════════════════════════════════════
// 옵션 아이템 CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * 옵션 아이템 생성
 * POST /menus/options/:groupId/items
 */
exports.createOptionItem = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, additional_price, is_active, sort_order } = req.body;

    // 그룹 존재 확인 + 소유권 확인
    const group = await pool.query(
      `SELECT og.id, m.restaurant_id
       FROM menu_option_groups og
       JOIN menus m ON og.menu_id = m.id
       WHERE og.id = $1`,
      [groupId]
    );
    if (group.rows.length === 0) {
      return res.status(404).json({ success: false, error: '옵션 그룹을 찾을 수 없습니다.' });
    }
    if (group.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({ success: false, error: '본인 레스토랑의 옵션만 수정할 수 있습니다.' });
    }

    const result = await pool.query(
      `INSERT INTO menu_option_items (option_group_id, name, additional_price, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, name, additional_price || 0, is_active !== false, sort_order || 0]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '옵션 아이템이 생성되었습니다.',
    });
  } catch (error) {
    logger.error('옵션 아이템 생성 오류:', error);
    res.status(500).json({ success: false, error: '옵션 아이템 생성 중 오류가 발생했습니다.' });
  }
};

/**
 * 옵션 아이템 수정
 * PUT /menus/options/items/:itemId
 */
exports.updateOptionItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, additional_price, is_active, sort_order } = req.body;

    // 아이템 존재 확인 + 소유권 확인
    const item = await pool.query(
      `SELECT oi.id, m.restaurant_id
       FROM menu_option_items oi
       JOIN menu_option_groups og ON oi.option_group_id = og.id
       JOIN menus m ON og.menu_id = m.id
       WHERE oi.id = $1`,
      [itemId]
    );
    if (item.rows.length === 0) {
      return res.status(404).json({ success: false, error: '옵션 아이템을 찾을 수 없습니다.' });
    }
    if (item.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({ success: false, error: '본인 레스토랑의 옵션만 수정할 수 있습니다.' });
    }

    const setClauses = [];
    const values = [];
    let paramIdx = 1;

    if (name !== undefined) { setClauses.push(`name = $${paramIdx}`); values.push(name); paramIdx++; }
    if (additional_price !== undefined) { setClauses.push(`additional_price = $${paramIdx}`); values.push(additional_price); paramIdx++; }
    if (is_active !== undefined) { setClauses.push(`is_active = $${paramIdx}`); values.push(is_active); paramIdx++; }
    if (sort_order !== undefined) { setClauses.push(`sort_order = $${paramIdx}`); values.push(sort_order); paramIdx++; }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목이 없습니다.' });
    }

    values.push(itemId);
    const result = await pool.query(
      `UPDATE menu_option_items SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    res.json({ success: true, data: result.rows[0], message: '옵션 아이템이 수정되었습니다.' });
  } catch (error) {
    logger.error('옵션 아이템 수정 오류:', error);
    res.status(500).json({ success: false, error: '옵션 아이템 수정 중 오류가 발생했습니다.' });
  }
};

/**
 * 옵션 아이템 삭제
 * DELETE /menus/options/items/:itemId
 */
exports.deleteOptionItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    // 아이템 존재 확인 + 소유권 확인
    const item = await pool.query(
      `SELECT oi.id, m.restaurant_id
       FROM menu_option_items oi
       JOIN menu_option_groups og ON oi.option_group_id = og.id
       JOIN menus m ON og.menu_id = m.id
       WHERE oi.id = $1`,
      [itemId]
    );
    if (item.rows.length === 0) {
      return res.status(404).json({ success: false, error: '옵션 아이템을 찾을 수 없습니다.' });
    }
    if (item.rows[0].restaurant_id !== req.merchant.restaurantId) {
      return res.status(403).json({ success: false, error: '본인 레스토랑의 옵션만 삭제할 수 있습니다.' });
    }

    await pool.query('DELETE FROM menu_option_items WHERE id = $1', [itemId]);

    res.json({ success: true, message: '옵션 아이템이 삭제되었습니다.' });
  } catch (error) {
    logger.error('옵션 아이템 삭제 오류:', error);
    res.status(500).json({ success: false, error: '옵션 아이템 삭제 중 오류가 발생했습니다.' });
  }
};

/**
 * 일괄 가격 조정
 * POST /menus/bulk-price
 * Body: { restaurant_id, menu_ids?: number[], adjustment: number, type: 'fixed' | 'percent' }
 */
exports.bulkPriceAdjust = async (req, res) => {
  try {
    const merchantRestaurantId = req.merchant.restaurantId;
    const { restaurant_id, menu_ids, adjustment, type } = req.body;

    if (restaurant_id !== merchantRestaurantId) {
      return res.status(403).json({ success: false, error: '본인 매장의 메뉴만 수정할 수 있습니다.' });
    }

    if (adjustment === undefined || adjustment === null || !type) {
      return res.status(400).json({ success: false, error: 'adjustment와 type은 필수입니다.' });
    }

    let query, params;
    if (type === 'percent') {
      // 퍼센트 조정: price = price * (1 + adjustment/100)
      if (menu_ids && menu_ids.length > 0) {
        query = `UPDATE menus SET price = ROUND(price * (1 + $1::numeric / 100)), updated_at = NOW()
                 WHERE restaurant_id = $2 AND id = ANY($3) AND is_active = true RETURNING id, name, price`;
        params = [adjustment, restaurant_id, menu_ids];
      } else {
        query = `UPDATE menus SET price = ROUND(price * (1 + $1::numeric / 100)), updated_at = NOW()
                 WHERE restaurant_id = $2 AND is_active = true RETURNING id, name, price`;
        params = [adjustment, restaurant_id];
      }
    } else {
      // 고정 금액 조정: price = price + adjustment
      if (menu_ids && menu_ids.length > 0) {
        query = `UPDATE menus SET price = GREATEST(0, price + $1), updated_at = NOW()
                 WHERE restaurant_id = $2 AND id = ANY($3) AND is_active = true RETURNING id, name, price`;
        params = [adjustment, restaurant_id, menu_ids];
      } else {
        query = `UPDATE menus SET price = GREATEST(0, price + $1), updated_at = NOW()
                 WHERE restaurant_id = $2 AND is_active = true RETURNING id, name, price`;
        params = [adjustment, restaurant_id];
      }
    }

    const result = await pool.query(query, params);

    logger.info('일괄 가격 조정:', { restaurant_id, type, adjustment, updated: result.rowCount });

    res.json({
      success: true,
      data: {
        updated_count: result.rowCount,
        menus: result.rows,
      },
    });
  } catch (error) {
    logger.error('일괄 가격 조정 오류:', error);
    res.status(500).json({ success: false, error: '가격 조정 중 오류가 발생했습니다.' });
  }
};
