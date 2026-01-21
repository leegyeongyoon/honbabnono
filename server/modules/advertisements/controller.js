const pool = require('../../config/database');

// 전체 광고 목록 조회
exports.getAllAds = async (req, res) => {
  try {
    const { page = 1, limit = 20, position, isActive } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (position) {
      whereConditions.push(`position = $${paramIndex}`);
      params.push(position);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      params.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT id, title, description, image_url as "imageUrl", link_url as "linkUrl",
             use_detail_page as "useDetailPage", detail_content as "detailContent",
             business_name as "businessName", contact_info as "contactInfo",
             position, priority, is_active as "isActive",
             start_date as "startDate", end_date as "endDate",
             view_count as "viewCount", click_count as "clickCount",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM advertisements
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM advertisements ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('광고 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고 목록을 불러오는데 실패했습니다.'
    });
  }
};

// 활성 광고 목록 조회 (홈 화면용)
exports.getActiveAds = async (req, res) => {
  try {
    const { position = 'home_banner' } = req.query;
    const now = new Date();

    const result = await pool.query(`
      SELECT id, title, description, image_url as "imageUrl", link_url as "linkUrl",
             use_detail_page as "useDetailPage", detail_content as "detailContent",
             business_name as "businessName", contact_info as "contactInfo",
             position, priority, created_at as "createdAt"
      FROM advertisements
      WHERE is_active = true
        AND position = $1
        AND (start_date IS NULL OR start_date <= $2)
        AND (end_date IS NULL OR end_date >= $2)
      ORDER BY priority DESC, created_at DESC
    `, [position, now]);

    // 노출 수 증가
    if (result.rows.length > 0) {
      const adIds = result.rows.map(ad => ad.id);
      await pool.query(`
        UPDATE advertisements
        SET view_count = view_count + 1
        WHERE id = ANY($1)
      `, [adIds]);
    }

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('활성 광고 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고를 불러오는데 실패했습니다.'
    });
  }
};

// 광고 클릭 카운트 증가
exports.recordClick = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE advertisements
      SET click_count = click_count + 1
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '클릭이 기록되었습니다.'
    });
  } catch (error) {
    console.error('광고 클릭 기록 오류:', error);
    res.status(500).json({
      success: false,
      error: '클릭 기록에 실패했습니다.'
    });
  }
};

// 광고 디테일 조회
exports.getAdDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT id, title, description, image_url as "imageUrl", link_url as "linkUrl",
             use_detail_page as "useDetailPage", detail_content as "detailContent",
             business_name as "businessName", contact_info as "contactInfo",
             position, priority, created_at as "createdAt"
      FROM advertisements
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    // 노출 수 증가
    await pool.query(`
      UPDATE advertisements
      SET view_count = view_count + 1
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('광고 디테일 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고를 불러오는데 실패했습니다.'
    });
  }
};
