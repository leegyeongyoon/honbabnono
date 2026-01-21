const pool = require('../../config/database');

// FAQ 목록 조회
exports.getFaq = async (req, res) => {
  try {
    console.log('❓ FAQ 목록 조회 요청');
    const { category } = req.query;

    let query = `
      SELECT id, category, question, answer, order_index, created_at, updated_at
      FROM faq
      WHERE is_active = true
    `;
    const queryParams = [];

    if (category) {
      query += ' AND category = $1';
      queryParams.push(category);
    }

    query += ' ORDER BY category, order_index, created_at';

    const result = await pool.query(query, queryParams);

    console.log('✅ FAQ 목록 조회 성공');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ FAQ 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'FAQ 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

// 문의하기
exports.createInquiry = async (req, res) => {
  try {
    console.log('💬 문의 접수 요청:', req.body);
    const userId = req.user.userId;
    const { subject, content, category } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        error: '제목과 내용을 입력해주세요.'
      });
    }

    const result = await pool.query(`
      INSERT INTO support_inquiries (user_id, subject, content, category, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, subject, category, status, created_at
    `, [userId, subject, content, category || '일반', '접수']);

    console.log('✅ 문의 접수 성공');
    res.json({
      success: true,
      message: '문의가 성공적으로 접수되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 문의 접수 실패:', error);
    res.status(500).json({
      success: false,
      error: '문의 접수 중 오류가 발생했습니다.'
    });
  }
};

// 내 문의 내역 조회
exports.getMyInquiries = async (req, res) => {
  try {
    console.log('📋 내 문의 내역 조회 요청');
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM support_inquiries WHERE user_id = $1',
      [userId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    const result = await pool.query(`
      SELECT id, subject, content, category, status, created_at, updated_at
      FROM support_inquiries
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    console.log('✅ 내 문의 내역 조회 성공');
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('❌ 내 문의 내역 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '문의 내역 조회 중 오류가 발생했습니다.'
    });
  }
};

// 이용약관 조회
exports.getTerms = async (req, res) => {
  try {
    console.log('📄 이용약관 조회 요청');

    const result = await pool.query(`
      SELECT version, content, effective_date, created_at
      FROM terms_of_service
      WHERE is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '이용약관을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 이용약관 조회 성공');
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 이용약관 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '이용약관 조회 중 오류가 발생했습니다.'
    });
  }
};

// 개인정보처리방침 조회
exports.getPrivacyPolicy = async (req, res) => {
  try {
    console.log('🔒 개인정보처리방침 조회 요청');

    const result = await pool.query(`
      SELECT version, content, effective_date, created_at
      FROM privacy_policy
      WHERE is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '개인정보처리방침을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 개인정보처리방침 조회 성공');
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 개인정보처리방침 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '개인정보처리방침 조회 중 오류가 발생했습니다.'
    });
  }
};

// 앱 정보 조회
exports.getAppInfo = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        version: '1.0.0',
        buildNumber: '2024.11.28.001',
        lastUpdated: '2024-11-28',
        features: [
          '모임 생성 및 참가',
          '실시간 채팅',
          '리뷰 시스템',
          '포인트 시스템',
          '위치 기반 체크인'
        ]
      }
    });
  } catch (error) {
    console.error('앱 정보 조회 오류:', error);
    res.status(500).json({ success: false, message: '앱 정보를 불러올 수 없습니다.' });
  }
};

// 공지사항 목록 조회
exports.getNotices = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        content,
        COALESCE(type, 'general') as type,
        created_at,
        updated_at,
        COALESCE(is_pinned, false) as is_pinned,
        COALESCE(views, 0) as views
      FROM notices
      WHERE is_active = true
      ORDER BY is_pinned DESC, created_at DESC
    `);

    res.json({
      success: true,
      notices: result.rows
    });
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    res.status(500).json({ success: false, message: '공지사항을 불러올 수 없습니다.' });
  }
};

// 공지사항 상세 조회
exports.getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;

    // 조회수 증가
    await pool.query(`
      UPDATE notices
      SET views = COALESCE(views, 0) + 1
      WHERE id = $1 AND is_active = true
    `, [id]);

    const result = await pool.query(`
      SELECT
        id,
        title,
        content,
        COALESCE(type, 'general') as type,
        created_at,
        updated_at,
        COALESCE(is_pinned, false) as is_pinned,
        COALESCE(views, 0) as views
      FROM notices
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '공지사항을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      notice: result.rows[0]
    });
  } catch (error) {
    console.error('공지사항 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '공지사항을 불러올 수 없습니다.' });
  }
};
