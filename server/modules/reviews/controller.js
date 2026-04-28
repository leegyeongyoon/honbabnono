const pool = require('../../config/database');
const logger = require('../../config/logger');
const { updateBabalScore, getReviewScoreEvent } = require('../../utils/babalScore');
const { checkBadgeEligibility } = require('../badges/controller');

// 모임 리뷰 목록 조회
exports.getMeetupReviews = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        r.*,
        u.name as reviewer_name,
        u.profile_image as reviewer_profile_image
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.meetup_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [meetupId, parseInt(limit), offset]);

    // images 파싱
    const reviews = result.rows.map(review => ({
      ...review,
      images: typeof review.images === 'string' ? JSON.parse(review.images) : (review.images || []),
    }));

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE meetup_id = $1',
      [meetupId]
    );

    res.json({
      success: true,
      reviews: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });

  } catch (error) {
    logger.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 작성
exports.createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId, rating, content, revieweeId, images } = req.body;

    // 평점 범위 검증
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: '평점은 1~5 사이의 값이어야 합니다.'
      });
    }

    // 모임 상태 검증 (종료된 모임만 리뷰 가능)
    const meetupCheck = await pool.query(
      'SELECT status, host_id FROM meetups WHERE id = $1',
      [meetupId]
    );
    if (meetupCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: '모임을 찾을 수 없습니다.' });
    }
    if (meetupCheck.rows[0].status !== '종료') {
      return res.status(400).json({ success: false, error: '종료된 모임에만 리뷰를 작성할 수 있습니다.' });
    }

    // revieweeId가 없으면 모임 호스트를 대상으로 설정
    let targetRevieweeId = revieweeId || meetupCheck.rows[0].host_id;

    // 이미 리뷰 작성 여부 확인
    const existingResult = await pool.query(
      'SELECT * FROM reviews WHERE meetup_id = $1 AND reviewer_id = $2 AND reviewee_id = $3',
      [meetupId, userId, targetRevieweeId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 이 약속에 대한 리뷰를 작성했습니다.'
      });
    }

    // 참가 + 출석 확인 (출석 완료한 사람만 리뷰 가능)
    const participantResult = await pool.query(
      'SELECT * FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '참가한 약속에만 리뷰를 작성할 수 있습니다.'
      });
    }

    if (!participantResult.rows[0].attended) {
      return res.status(400).json({
        success: false,
        error: '출석 확인이 완료된 약속에만 리뷰를 작성할 수 있습니다.'
      });
    }

    // images 검증 (최대 3장)
    const reviewImages = Array.isArray(images) ? images.slice(0, 3) : [];

    const result = await pool.query(`
      INSERT INTO reviews (meetup_id, reviewer_id, reviewee_id, rating, content, images)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      RETURNING *
    `, [meetupId, userId, targetRevieweeId, rating, content, JSON.stringify(reviewImages)]);

    // 리뷰 대상의 밥알지수 변동 (통합 알고리즘)
    const scoreEvent = getReviewScoreEvent(rating);
    await updateBabalScore(targetRevieweeId, scoreEvent, {
      meetupId,
      reviewId: result.rows[0].id,
    });

    // 양질의 리뷰 작성자 보너스 (30자 이상)
    if (content && content.length >= 30) {
      await updateBabalScore(userId, 'REVIEW_WRITTEN_QUALITY', {
        meetupId,
        reviewId: result.rows[0].id,
      });
    }

    // 뱃지 획득 조건 체크 (비동기, 실패해도 리뷰 작성에 영향 없음)
    checkBadgeEligibility(userId).catch(
      (err) => logger.error('리뷰 작성 뱃지 체크 오류:', err)
    );

    res.status(201).json({
      success: true,
      message: '리뷰가 작성되었습니다.',
      review: result.rows[0]
    });

  } catch (error) {
    logger.error('리뷰 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 수정
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { rating, content, images } = req.body;

    // images가 제공되면 업데이트, 아니면 기존 유지
    const reviewImages = Array.isArray(images) ? images.slice(0, 3) : undefined;

    const result = reviewImages !== undefined
      ? await pool.query(`
          UPDATE reviews
          SET rating = $1, content = $2, images = $5::jsonb, updated_at = NOW()
          WHERE id = $3 AND reviewer_id = $4
          RETURNING *
        `, [rating, content, id, userId, JSON.stringify(reviewImages)])
      : await pool.query(`
          UPDATE reviews
          SET rating = $1, content = $2, updated_at = NOW()
          WHERE id = $3 AND reviewer_id = $4
          RETURNING *
        `, [rating, content, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없거나 수정 권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '리뷰가 수정되었습니다.',
      review: result.rows[0]
    });

  } catch (error) {
    logger.error('리뷰 수정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 삭제
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND reviewer_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없거나 삭제 권한이 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '리뷰가 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('리뷰 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 참가자 개별 평가
exports.rateParticipant = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId, targetUserId, rating, comment } = req.body;

    const result = await pool.query(`
      INSERT INTO user_reviews (meetup_id, reviewer_id, reviewed_user_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (meetup_id, reviewer_id, reviewed_user_id)
      DO UPDATE SET rating = $4, comment = $5, updated_at = NOW()
      RETURNING *
    `, [meetupId, userId, targetUserId, rating, comment]);

    // 평균 평점 업데이트
    await pool.query(`
      UPDATE users
      SET rating = (
        SELECT AVG(rating) FROM user_reviews WHERE reviewed_user_id = $1
      )
      WHERE id = $1
    `, [targetUserId]);

    // 밥알지수 변동 (참가자 평가도 반영)
    const scoreEvent = getReviewScoreEvent(rating);
    await updateBabalScore(targetUserId, scoreEvent, { meetupId }).catch(
      (err) => logger.error('참가자 평가 밥알지수 오류:', err)
    );

    // 뱃지 획득 조건 체크 (비동기, 실패해도 평가 완료에 영향 없음)
    checkBadgeEligibility(userId).catch(
      (err) => logger.error('참가자 평가 뱃지 체크 오류:', err)
    );

    res.json({
      success: true,
      message: '평가가 완료되었습니다.',
      rating: result.rows[0]
    });

  } catch (error) {
    logger.error('참가자 평가 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 리뷰 통계 조회
exports.getUserReviewStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // 해당 사용자가 받은 리뷰 통계
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating
      FROM reviews
      WHERE reviewee_id = $1
    `, [userId]);

    // 태그 분석 (리뷰에서 자주 사용된 태그)
    const tagsResult = await pool.query(`
      SELECT
        UNNEST(tags) as tag,
        COUNT(*) as count
      FROM reviews
      WHERE reviewee_id = $1 AND tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `, [userId]);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      totalReviews: parseInt(stats.total_reviews),
      averageRating: parseFloat(stats.average_rating).toFixed(1),
      tagAnalysis: tagsResult.rows.map(row => ({
        tag: row.tag.replace(/[\[\]"]/g, '').trim(),
        count: parseInt(row.count)
      })).filter(t => t.tag)
    });
  } catch (error) {
    logger.error('리뷰 통계 조회 오류:', error);
    res.status(500).json({ error: '리뷰 통계 조회에 실패했습니다' });
  }
};

// 리뷰 답변 (호스트만 가능)
exports.replyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        error: '답변 내용을 입력해주세요.',
      });
    }

    // 리뷰 조회 + 모임 호스트 확인
    const reviewResult = await pool.query(`
      SELECT r.id, r.reviewee_id, r.reply, m.host_id
      FROM reviews r
      INNER JOIN meetups m ON r.meetup_id = m.id
      WHERE r.id = $1
    `, [id]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없습니다.',
      });
    }

    const review = reviewResult.rows[0];

    // 리뷰 대상자(호스트)만 답변 가능
    if (review.host_id !== userId && review.reviewee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '답변 권한이 없습니다.',
      });
    }

    if (review.reply) {
      return res.status(400).json({
        success: false,
        error: '이미 답변이 작성되어 있습니다.',
      });
    }

    const updateResult = await pool.query(`
      UPDATE reviews
      SET reply = $1, reply_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reply.trim(), id]);

    res.json({
      success: true,
      message: '답변이 등록되었습니다.',
      review: updateResult.rows[0],
    });

  } catch (error) {
    logger.error('리뷰 답변 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 피처링 (관리자 기능 - 추천 리뷰로 표시)
exports.featureReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { featured } = req.body;

    const result = await pool.query(`
      UPDATE reviews
      SET is_featured = $1
      WHERE id = $2
      RETURNING *
    `, [featured !== false, reviewId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: featured !== false ? '리뷰가 추천되었습니다.' : '리뷰 추천이 해제되었습니다.',
      review: result.rows[0]
    });

  } catch (error) {
    logger.error('리뷰 피처링 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};


// ============================================================
// v2 — 매장 리뷰 (restaurant_reviews 테이블, 3축 평점)
// ============================================================

exports.createRestaurantReview = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      reservation_id,
      restaurant_id,
      taste_rating,
      service_rating,
      ambiance_rating,
      content,
      images,
    } = req.body;

    if (!reservation_id || !restaurant_id) {
      return res.status(400).json({ success: false, error: "reservation_id, restaurant_id가 필요합니다." });
    }

    for (const v of [taste_rating, service_rating, ambiance_rating]) {
      if (typeof v !== "number" || v < 1 || v > 5) {
        return res.status(400).json({ success: false, error: "각 평점은 1~5 사이여야 합니다." });
      }
    }

    const reservationCheck = await pool.query(
      "SELECT id, user_id, status FROM reservations WHERE id = $1",
      [reservation_id]
    );
    if (reservationCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "예약을 찾을 수 없습니다." });
    }
    if (reservationCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: "본인 예약만 리뷰 작성 가능합니다." });
    }
    if (reservationCheck.rows[0].status !== "completed") {
      return res.status(400).json({ success: false, error: "완료된 예약에만 리뷰를 작성할 수 있습니다." });
    }

    const result = await pool.query(
      `INSERT INTO restaurant_reviews (reservation_id, restaurant_id, user_id, taste_rating, service_rating, ambiance_rating, content, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (reservation_id, user_id) DO UPDATE
         SET taste_rating = EXCLUDED.taste_rating,
             service_rating = EXCLUDED.service_rating,
             ambiance_rating = EXCLUDED.ambiance_rating,
             content = EXCLUDED.content,
             images = EXCLUDED.images,
             updated_at = NOW()
       RETURNING *`,
      [reservation_id, restaurant_id, userId, taste_rating, service_rating, ambiance_rating, content || null, JSON.stringify(images || [])]
    );

    res.status(201).json({ success: true, review: result.rows[0] });
  } catch (error) {
    logger.error("매장 리뷰 작성 오류:", error);
    res.status(500).json({ success: false, error: "리뷰 작성 중 오류가 발생했습니다." });
  }
};

exports.getRestaurantReviews = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT rr.id, rr.taste_rating, rr.service_rating, rr.ambiance_rating, rr.overall_rating,
              rr.content, rr.images, rr.reply, rr.replied_at, rr.created_at,
              u.name AS user_name, u.profile_image,
              COUNT(*) OVER() AS total_count
         FROM restaurant_reviews rr
         JOIN users u ON u.id = rr.user_id
        WHERE rr.restaurant_id = $1
        ORDER BY rr.created_at DESC
        LIMIT $2 OFFSET $3`,
      [restaurantId, limit, offset]
    );

    const total = result.rows.length ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      reviews: result.rows,
      pagination: { page, limit, total },
    });
  } catch (error) {
    logger.error("매장 리뷰 목록 오류:", error);
    res.status(500).json({ success: false, error: "리뷰를 불러오는 중 오류가 발생했습니다." });
  }
};

