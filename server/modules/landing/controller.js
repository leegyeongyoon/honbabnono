const pool = require('../../config/database');
const logger = require('../../config/logger');

// ============================================
// 가짜문(Fake Door) 검증 — 공개 API (인증 없음)
// ============================================

/**
 * 퍼널 이벤트 기록
 * POST /api/landing/event
 * body: { session_id, step, restaurant_ref?, variant?, metadata? }
 * 분석용이라 실패해도 사용자 경험에 영향 없도록 항상 200 가깝게.
 */
exports.trackEvent = async (req, res) => {
  try {
    const { session_id, step, restaurant_ref, variant, metadata } = req.body;
    await pool.query(
      `INSERT INTO funnel_events (session_id, step, restaurant_ref, variant, metadata, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session_id,
        step,
        restaurant_ref || null,
        variant || null,
        metadata ? JSON.stringify(metadata) : '{}',
        (req.headers['user-agent'] || '').slice(0, 500),
      ]
    );
    res.json({ success: true });
  } catch (error) {
    logger.error('퍼널 이벤트 기록 실패:', error);
    // 분석 실패는 사용자에게 노출하지 않음
    res.json({ success: false });
  }
};

/**
 * 베타 신청 리드 저장
 * POST /api/landing/lead
 * body: { session_id?, contact, contact_type?, restaurant_ref?, variant?, note? }
 */
exports.submitLead = async (req, res) => {
  try {
    const { session_id, contact, contact_type, restaurant_ref, variant, note } = req.body;
    await pool.query(
      `INSERT INTO waitlist_leads (session_id, contact, contact_type, restaurant_ref, variant, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_id, contact) WHERE session_id IS NOT NULL DO NOTHING`,
      [
        session_id || null,
        contact.trim(),
        contact_type || 'email',
        restaurant_ref || null,
        variant || null,
        note || null,
      ]
    );
    // lead_submit 이벤트도 함께 기록(퍼널 최종 단계)
    if (session_id) {
      pool.query(
        `INSERT INTO funnel_events (session_id, step, restaurant_ref, variant)
         VALUES ($1, 'lead_submit', $2, $3)`,
        [session_id, restaurant_ref || null, variant || null]
      ).catch(() => {});
    }
    res.json({ success: true, message: '신청이 완료되었습니다. 출시되면 알려드릴게요!' });
  } catch (error) {
    logger.error('베타 신청 저장 실패:', error);
    res.status(500).json({ success: false, error: '신청 처리 중 오류가 발생했습니다.' });
  }
};
