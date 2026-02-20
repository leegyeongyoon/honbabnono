const pool = require('../../config/database');

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
      FROM meetup_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.meetup_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [meetupId, parseInt(limit), offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM meetup_reviews WHERE meetup_id = $1',
      [meetupId]
    );

    res.json({
      success: true,
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 작성
exports.createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId, rating, content, images } = req.body;

    // 이미 리뷰 작성 여부 확인
    const existingResult = await pool.query(
      'SELECT * FROM meetup_reviews WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 이 약속에 대한 리뷰를 작성했습니다.'
      });
    }

    // 참가 확인
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

    const result = await pool.query(`
      INSERT INTO meetup_reviews (meetup_id, user_id, rating, content, images, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [meetupId, userId, rating, content, images]);

    res.status(201).json({
      success: true,
      message: '리뷰가 작성되었습니다.',
      review: result.rows[0]
    });

  } catch (error) {
    console.error('리뷰 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 수정
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { rating, content, images } = req.body;

    const result = await pool.query(`
      UPDATE meetup_reviews
      SET rating = $1, content = $2, images = $3, updated_at = NOW()
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [rating, content, images, id, userId]);

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
    console.error('리뷰 수정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 삭제
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM meetup_reviews WHERE id = $1 AND user_id = $2 RETURNING *',
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
    console.error('리뷰 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 참가자 개별 평가
exports.rateParticipant = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId, targetUserId, rating, comment } = req.body;

    const result = await pool.query(`
      INSERT INTO participant_ratings (meetup_id, reviewer_id, target_user_id, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (meetup_id, reviewer_id, target_user_id)
      DO UPDATE SET rating = $4, comment = $5, updated_at = NOW()
      RETURNING *
    `, [meetupId, userId, targetUserId, rating, comment]);

    // 평균 평점 업데이트
    await pool.query(`
      UPDATE users
      SET rating = (
        SELECT AVG(rating) FROM participant_ratings WHERE target_user_id = $1
      )
      WHERE id = $1
    `, [targetUserId]);

    res.json({
      success: true,
      message: '평가가 완료되었습니다.',
      rating: result.rows[0]
    });

  } catch (error) {
    console.error('참가자 평가 오류:', error);
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
        UNNEST(string_to_array(tags::text, ',')) as tag,
        COUNT(*) as count
      FROM reviews
      WHERE reviewee_id = $1 AND tags IS NOT NULL
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
    console.error('리뷰 통계 조회 오류:', error);
    res.status(500).json({ error: '리뷰 통계 조회에 실패했습니다' });
  }
};

// 리뷰 피처링 (관리자 기능 - 추천 리뷰로 표시)
exports.featureReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { featured } = req.body;

    const result = await pool.query(`
      UPDATE meetup_reviews
      SET is_featured = $1, updated_at = NOW()
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
    console.error('리뷰 피처링 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};
