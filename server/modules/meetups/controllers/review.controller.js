/**
 * 모임 리뷰 컨트롤러
 */
const pool = require('../../../config/database');
const { validateMeetupExists, validateParticipant, validateRating } = require('../helpers/validation.helper');
const { buildPagination } = require('../helpers/query.helper');

/**
 * 모임 리뷰 작성
 */
exports.createReview = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { rating, comment, tags } = req.body;
    const userId = req.user.userId;

    // 평점 검증
    const { valid, error: ratingError } = validateRating(rating);
    if (!valid) {
      return res.status(400).json({ error: ratingError });
    }

    // 모임 존재 확인
    const meetupResult = await pool.query(
      'SELECT id, title, host_id, date FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '약속을 찾을 수 없습니다' });
    }

    const meetup = meetupResult.rows[0];

    // 모임이 완료되었는지 확인
    if (new Date(meetup.date) > new Date()) {
      return res.status(400).json({ error: '완료된 약속에만 리뷰를 작성할 수 있습니다' });
    }

    // 참가자 확인
    const { isParticipant, error: participantError } = await validateParticipant(meetupId, userId, '참가승인');
    if (!isParticipant) {
      return res.status(403).json({ error: '참가한 약속에만 리뷰를 작성할 수 있습니다' });
    }

    // 이미 리뷰를 작성했는지 확인
    const existingReviewResult = await pool.query(
      'SELECT id FROM reviews WHERE meetup_id = $1 AND reviewer_id = $2',
      [meetupId, userId]
    );

    if (existingReviewResult.rows.length > 0) {
      return res.status(400).json({ error: '이미 리뷰를 작성하셨습니다' });
    }

    // 리뷰 저장 (reviewee_id는 호스트로 설정)
    const reviewResult = await pool.query(
      `
      INSERT INTO reviews (
        meetup_id, reviewer_id, reviewee_id, rating, content, tags, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
      RETURNING id, meetup_id, reviewer_id, reviewee_id, rating, content, tags, created_at
    `,
      [meetupId, userId, meetup.host_id, rating, comment || '', JSON.stringify(tags || [])]
    );

    const review = reviewResult.rows[0];

    // 호스트의 평균 평점 업데이트
    const avgRatingResult = await pool.query(
      `
      SELECT AVG(r.rating) as avg_rating
      FROM reviews r
      JOIN meetups m ON r.meetup_id = m.id
      WHERE m.host_id = $1
    `,
      [meetup.host_id]
    );

    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;

    await pool.query('UPDATE users SET rating = $1, updated_at = NOW() WHERE id = $2', [
      avgRating,
      meetup.host_id,
    ]);

    res.status(201).json({
      success: true,
      data: {
        ...review,
        tags: typeof review.tags === 'string' ? JSON.parse(review.tags) : (review.tags || []),
      },
    });
  } catch (error) {
    console.error('리뷰 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * 모임 리뷰 목록 조회
 */
exports.getReviews = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { offset, limit: parsedLimit } = buildPagination(page, limit);

    const [reviewsResult, countResult, avgRatingResult] = await Promise.all([
      pool.query(
        `
        SELECT
          r.id, r.meetup_id, r.reviewer_id,
          u.name as reviewer_name,
          r.rating, r.content, r.tags, r.created_at,
          u.profile_image as reviewer_profile_image
        FROM reviews r
        LEFT JOIN users u ON r.reviewer_id = u.id
        WHERE r.meetup_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `,
        [meetupId, parsedLimit, offset]
      ),
      pool.query('SELECT COUNT(*) as total FROM reviews WHERE meetup_id = $1', [meetupId]),
      pool.query(
        `
        SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
        FROM reviews WHERE meetup_id = $1
      `,
        [meetupId]
      ),
    ]);

    const reviews = reviewsResult.rows.map((review) => ({
      ...review,
      tags: typeof review.tags === 'string' ? JSON.parse(review.tags) : (review.tags || []),
    }));

    const total = parseInt(countResult.rows[0].total);
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;
    const reviewCount = parseInt(avgRatingResult.rows[0].review_count);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
        summary: {
          avgRating: Math.round(avgRating * 10) / 10,
          reviewCount,
        },
      },
    });
  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

/**
 * 리뷰 가능한 참가자 목록 조회
 */
exports.getReviewableParticipants = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    // 모임 정보 조회
    const meetupResult = await pool.query(
      'SELECT id, host_id, date, status FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.',
      });
    }

    const meetup = meetupResult.rows[0];

    // 모임이 완료되었는지 확인
    if (meetup.status !== '종료' && new Date(meetup.date) > new Date()) {
      return res.status(400).json({
        success: false,
        error: '완료된 약속에만 리뷰를 작성할 수 있습니다.',
      });
    }

    // 참가자 목록 조회 (자신 제외, 이미 리뷰한 사람 제외)
    // user_reviews 테이블이 없으면 reviews 테이블의 reviewee_id를 체크
    const participantsResult = await pool.query(
      `
      SELECT
        mp.user_id as id,
        u.name,
        u.profile_image,
        u.babal_score,
        CASE WHEN m.host_id = mp.user_id THEN true ELSE false END as is_host,
        EXISTS(
          SELECT 1 FROM user_reviews ur
          WHERE ur.meetup_id = $1 AND ur.reviewer_id = $2 AND ur.reviewed_user_id = mp.user_id
        ) as already_reviewed
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.meetup_id = $1
        AND mp.status = '참가승인'
        AND mp.user_id != $2
      ORDER BY mp.joined_at
    `,
      [meetupId, userId]
    );

    // 아직 리뷰하지 않은 참가자만 필터링
    const reviewableParticipants = participantsResult.rows.filter(p => !p.already_reviewed);

    res.json({
      success: true,
      participants: reviewableParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        profileImage: p.profile_image,
        babalScore: p.babal_score,
        isHost: p.is_host,
      })),
    });
  } catch (error) {
    console.error('리뷰 가능 참가자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 목록 조회에 실패했습니다.',
    });
  }
};

/**
 * 참가자 리뷰 작성 (개별 사용자 평가)
 */
exports.createUserReview = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { reviewedUserId, rating, comment, tags, isAnonymous } = req.body;
    const reviewerId = req.user.userId;

    // 평점 검증
    const { valid, error: ratingError } = validateRating(rating);
    if (!valid) {
      return res.status(400).json({ error: ratingError });
    }

    // 리뷰 대상자 ID 필수
    if (!reviewedUserId) {
      return res.status(400).json({ error: '리뷰 대상자를 선택해주세요' });
    }

    // 자기 자신에게 리뷰 불가
    if (reviewerId === reviewedUserId) {
      return res.status(400).json({ error: '자기 자신에게는 리뷰를 작성할 수 없습니다' });
    }

    // 모임 존재 및 완료 확인
    const meetupResult = await pool.query(
      'SELECT id, title, host_id, date, status FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '약속을 찾을 수 없습니다' });
    }

    const meetup = meetupResult.rows[0];

    if (meetup.status !== '종료' && new Date(meetup.date) > new Date()) {
      return res.status(400).json({ error: '완료된 약속에만 리뷰를 작성할 수 있습니다' });
    }

    // 리뷰어가 참가자인지 확인
    const { isParticipant: reviewerIsParticipant } = await validateParticipant(meetupId, reviewerId, '참가승인');
    if (!reviewerIsParticipant) {
      return res.status(403).json({ error: '참가한 약속에만 리뷰를 작성할 수 있습니다' });
    }

    // 리뷰 대상자가 참가자인지 확인
    const { isParticipant: reviewedIsParticipant } = await validateParticipant(meetupId, reviewedUserId, '참가승인');
    if (!reviewedIsParticipant) {
      return res.status(400).json({ error: '리뷰 대상자가 약속 참가자가 아닙니다' });
    }

    // 중복 리뷰 확인
    const existingReview = await pool.query(
      'SELECT id FROM user_reviews WHERE meetup_id = $1 AND reviewer_id = $2 AND reviewed_user_id = $3',
      [meetupId, reviewerId, reviewedUserId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: '이미 해당 참가자에 대한 리뷰를 작성하셨습니다' });
    }

    // 리뷰 저장
    const reviewResult = await pool.query(
      `
      INSERT INTO user_reviews (
        meetup_id, reviewer_id, reviewed_user_id, rating, comment, tags, is_anonymous, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, meetup_id, reviewer_id, reviewed_user_id, rating, comment, tags, is_anonymous, created_at
    `,
      [meetupId, reviewerId, reviewedUserId, rating, comment || '', tags || [], isAnonymous || false]
    );

    const review = reviewResult.rows[0];

    // 리뷰 대상자의 평균 평점 업데이트
    const avgRatingResult = await pool.query(
      'SELECT AVG(rating) as avg_rating FROM user_reviews WHERE reviewed_user_id = $1',
      [reviewedUserId]
    );

    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 5.0;

    await pool.query(
      'UPDATE users SET rating = $1, updated_at = NOW() WHERE id = $2',
      [Math.round(avgRating * 10) / 10, reviewedUserId]
    );

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('참가자 리뷰 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};
