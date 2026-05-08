const pool = require('../../config/database');
const logger = require('../../config/logger');

// ============================================================
// 매장 리뷰 CRUD — 잇테이블 v2 3축 평가 (맛/서비스/분위기)
// ============================================================

/**
 * 매장 리뷰 작성
 * POST /api/reviews/restaurant
 */
exports.createRestaurantReview = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { reservation_id, restaurant_id, taste_rating, service_rating, ambiance_rating, content } = req.body;

    // 입력 검증
    if (!reservation_id || !restaurant_id) {
      return res.status(400).json({ success: false, error: '예약 정보와 매장 정보가 필요합니다.' });
    }

    const ratings = [taste_rating, service_rating, ambiance_rating];
    for (const r of ratings) {
      if (!r || r < 1 || r > 5) {
        return res.status(400).json({ success: false, error: '별점은 1~5 사이의 값이어야 합니다.' });
      }
    }

    if (!content || content.trim().length < 10) {
      return res.status(400).json({ success: false, error: '리뷰 내용은 최소 10자 이상이어야 합니다.' });
    }

    // 예약 검증: 해당 사용자의 completed 예약인지 확인
    const reservationCheck = await pool.query(
      `SELECT id, user_id, restaurant_id, status
       FROM reservations
       WHERE id = $1`,
      [reservation_id]
    );

    if (reservationCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: '예약을 찾을 수 없습니다.' });
    }

    const reservation = reservationCheck.rows[0];

    if (reservation.user_id !== userId) {
      return res.status(403).json({ success: false, error: '본인의 예약에만 리뷰를 작성할 수 있습니다.' });
    }

    if (reservation.status !== 'completed') {
      return res.status(400).json({ success: false, error: '완료된 예약에만 리뷰를 작성할 수 있습니다.' });
    }

    // 중복 리뷰 방지
    const dupCheck = await pool.query(
      'SELECT id FROM restaurant_reviews WHERE reservation_id = $1 AND user_id = $2',
      [reservation_id, userId]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: '이미 리뷰를 작성한 예약입니다.' });
    }

    await client.query('BEGIN');

    // INSERT 리뷰 (overall_rating은 GENERATED ALWAYS AS 컬럼 — DB가 자동 계산)
    const insertResult = await client.query(
      `INSERT INTO restaurant_reviews
        (reservation_id, restaurant_id, user_id, taste_rating, service_rating, ambiance_rating, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [reservation_id, restaurant_id, userId, taste_rating, service_rating, ambiance_rating, content.trim()]
    );

    // UPDATE 매장 평점 집계
    await client.query(
      `UPDATE restaurants
       SET review_count = review_count + 1,
           avg_rating = (
             SELECT COALESCE(AVG(overall_rating), 0)
             FROM restaurant_reviews
             WHERE restaurant_id = $1
           )
       WHERE id = $1`,
      [restaurant_id]
    );

    await client.query('COMMIT');

    const review = insertResult.rows[0];
    logger.info(`매장 리뷰 작성: user=${userId}, restaurant=${restaurant_id}, overall=${review.overall_rating}`);

    res.status(201).json({
      success: true,
      review: insertResult.rows[0],
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('매장 리뷰 작성 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

/**
 * 특정 매장의 리뷰 목록 조회
 * GET /api/reviews/restaurant/:restaurantId
 */
exports.getRestaurantReviews = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT
        rr.*,
        u.name AS reviewer_name,
        u.profile_image AS reviewer_profile_image
       FROM restaurant_reviews rr
       JOIN users u ON rr.user_id = u.id
       WHERE rr.restaurant_id = $1
       ORDER BY rr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [restaurantId, parseInt(limit), offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) AS total FROM restaurant_reviews WHERE restaurant_id = $1',
      [restaurantId]
    );

    res.json({
      success: true,
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
      },
    });

  } catch (error) {
    logger.error('매장 리뷰 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
};

/**
 * 내가 작성한 매장 리뷰 목록
 * GET /api/reviews/restaurant/my
 */
exports.getMyRestaurantReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT
        rr.*,
        r.name AS restaurant_name,
        r.image_url AS restaurant_image,
        r.category AS restaurant_category
       FROM restaurant_reviews rr
       JOIN restaurants r ON rr.restaurant_id = r.id
       WHERE rr.user_id = $1
       ORDER BY rr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) AS total FROM restaurant_reviews WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
      },
    });

  } catch (error) {
    logger.error('내 매장 리뷰 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
};

/**
 * 리뷰 답변 (점주)
 * PUT /api/reviews/restaurant/:id/reply
 */
exports.replyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const merchantRestaurantId = req.merchant.restaurantId;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ success: false, error: '답변 내용이 필요합니다.' });
    }

    // 해당 리뷰가 점주의 매장 리뷰인지 확인
    const reviewCheck = await pool.query(
      'SELECT id, restaurant_id FROM restaurant_reviews WHERE id = $1',
      [id]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: '리뷰를 찾을 수 없습니다.' });
    }

    if (reviewCheck.rows[0].restaurant_id !== merchantRestaurantId) {
      return res.status(403).json({ success: false, error: '본인 매장의 리뷰에만 답변할 수 있습니다.' });
    }

    const result = await pool.query(
      `UPDATE restaurant_reviews
       SET reply = $1, replied_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reply.trim(), id]
    );

    logger.info(`매장 리뷰 답변: reviewId=${id}, merchantRestaurant=${merchantRestaurantId}`);

    res.json({
      success: true,
      review: result.rows[0],
    });

  } catch (error) {
    logger.error('매장 리뷰 답변 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
};
