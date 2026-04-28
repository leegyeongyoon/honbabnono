const pool = require('../../config/database');
const logger = require('../../config/logger');

// ============================================
// 점주 등록/관리 API
// ============================================

/**
 * 점주 등록 신청
 * POST /merchants/register
 */
exports.registerMerchant = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 이미 등록된 점주인지 확인
    const existing = await pool.query(
      'SELECT id, verification_status FROM merchants WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      const merchant = existing.rows[0];
      return res.status(400).json({
        success: false,
        error: '이미 점주 등록이 되어 있습니다.',
        verification_status: merchant.verification_status,
      });
    }

    const {
      business_number, business_name, representative_name,
      bank_name, bank_account, bank_holder, verification_doc_url,
    } = req.body;

    const result = await pool.query(`
      INSERT INTO merchants (
        user_id, business_number, business_name, representative_name,
        bank_name, bank_account, bank_holder, verification_doc_url,
        verification_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `, [
      userId, business_number, business_name || null, representative_name || null,
      bank_name || null, bank_account || null, bank_holder || null,
      verification_doc_url || null,
    ]);

    logger.info('점주 등록 신청:', { userId, merchantId: result.rows[0].id });

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('점주 등록 오류:', error);
    res.status(500).json({ success: false, error: '점주 등록 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 점주 정보 조회 (식당 정보 포함)
 * GET /merchants/me
 */
exports.getMyMerchant = async (req, res) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT m.*,
             row_to_json(r.*) AS restaurant
      FROM merchants m
      LEFT JOIN restaurants r ON r.id = m.restaurant_id AND r.is_active = true
      WHERE m.user_id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '점주 정보를 찾을 수 없습니다. 점주 등록을 먼저 진행해주세요.',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('점주 정보 조회 오류:', error);
    res.status(500).json({ success: false, error: '점주 정보를 불러오는 중 오류가 발생했습니다.' });
  }
};

/**
 * 내 점주 정보 수정 (계좌 정보)
 * PUT /merchants/me
 */
exports.updateMerchant = async (req, res) => {
  try {
    const merchantId = req.merchant.id;
    const { bank_name, bank_account, bank_holder } = req.body;

    const fields = [];
    const params = [];

    if (bank_name !== undefined) {
      params.push(bank_name);
      fields.push(`bank_name = $${params.length}`);
    }
    if (bank_account !== undefined) {
      params.push(bank_account);
      fields.push(`bank_account = $${params.length}`);
    }
    if (bank_holder !== undefined) {
      params.push(bank_holder);
      fields.push(`bank_holder = $${params.length}`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '수정할 항목이 없습니다.' });
    }

    params.push(merchantId);
    const query = `
      UPDATE merchants
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '점주 정보를 찾을 수 없습니다.' });
    }

    logger.info('점주 정보 수정 완료:', { merchantId });

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('점주 정보 수정 오류:', error);
    res.status(500).json({ success: false, error: '점주 정보 수정 중 오류가 발생했습니다.' });
  }
};

/**
 * 인증 상태 확인
 * GET /merchants/verification-status
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT id, verification_status, created_at, updated_at FROM merchants WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '점주 등록 정보가 없습니다.',
      });
    }

    res.json({
      success: true,
      data: {
        verification_status: result.rows[0].verification_status,
        registered_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    logger.error('인증 상태 조회 오류:', error);
    res.status(500).json({ success: false, error: '인증 상태를 확인하는 중 오류가 발생했습니다.' });
  }
};
