const pool = require('../../config/database');
const logger = require('../../config/logger');

// 전체 뱃지 목록
exports.getAllBadges = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM badges ORDER BY category, required_count
    `);

    res.json({
      success: true,
      badges: result.rows
    });

  } catch (error) {
    logger.error('뱃지 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 획득 가능한 뱃지 목록
exports.getAvailableBadges = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, category, required_count, icon
      FROM badges
      WHERE is_active = true
      ORDER BY category, required_count
    `);

    res.json({
      success: true,
      badges: result.rows
    });
  } catch (error) {
    logger.error('획득 가능한 뱃지 조회 오류:', error);
    res.status(500).json({ error: '뱃지 목록 조회에 실패했습니다' });
  }
};

// 뱃지 진행률 조회
exports.getBadgeProgress = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 사용자의 모임 참가 수
    const meetupCountResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM meetup_participants
      WHERE user_id = $1 AND status = '참가승인'
    `, [userId]);

    const meetupCount = parseInt(meetupCountResult.rows[0].count);

    // 리뷰 작성 수
    const reviewCountResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM reviews
      WHERE reviewer_id = $1
    `, [userId]);

    const reviewCount = parseInt(reviewCountResult.rows[0].count);

    // 호스팅 모임 수
    const hostingCountResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM meetups
      WHERE host_id = $1 AND status = '종료'
    `, [userId]);

    const hostingCount = parseInt(hostingCountResult.rows[0].count);

    // 출석 완료 수
    const attendanceCountResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM meetup_participants
      WHERE user_id = $1 AND attended = true
    `, [userId]);

    const attendanceCount = parseInt(attendanceCountResult.rows[0].count);

    // 모든 뱃지와 진행률 조회
    const badgesResult = await pool.query(`
      SELECT
        b.*,
        CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as earned,
        ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
      WHERE b.is_active = true
      ORDER BY b.category, b.required_count
    `, [userId]);

    const progress = badgesResult.rows.map(badge => {
      let currentProgress = 0;
      if (badge.category === 'meetup_count') {
        currentProgress = meetupCount;
      } else if (badge.category === 'review_count' || badge.category === 'review') {
        currentProgress = reviewCount;
      } else if (badge.category === 'hosting') {
        currentProgress = hostingCount;
      } else if (badge.category === 'attendance') {
        currentProgress = attendanceCount;
      }

      return {
        ...badge,
        currentProgress,
        progressPercent: badge.required_count > 0
          ? Math.min(100, Math.round((currentProgress / badge.required_count) * 100))
          : 0
      };
    });

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    logger.error('뱃지 진행률 조회 오류:', error);
    res.status(500).json({ error: '뱃지 진행률 조회에 실패했습니다' });
  }
};

// 내 뱃지 목록
exports.getMyBadges = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        b.*,
        ub.earned_at,
        ub.is_featured
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `, [userId]);

    res.json({
      success: true,
      badges: result.rows
    });

  } catch (error) {
    logger.error('내 뱃지 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 뱃지 획득
exports.earnBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const userId = req.user.userId;

    // 이미 획득 여부 확인
    const existingResult = await pool.query(
      'SELECT * FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [userId, badgeId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 획득한 뱃지입니다.'
      });
    }

    // 뱃지 획득
    await pool.query(`
      INSERT INTO user_badges (user_id, badge_id, earned_at)
      VALUES ($1, $2, NOW())
    `, [userId, badgeId]);

    // 뱃지 정보 조회
    const badgeResult = await pool.query(
      'SELECT * FROM badges WHERE id = $1',
      [badgeId]
    );

    res.json({
      success: true,
      message: '뱃지를 획득했습니다!',
      badge: badgeResult.rows[0]
    });

  } catch (error) {
    logger.error('뱃지 획득 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 대표 뱃지 설정
exports.setFeaturedBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const userId = req.user.userId;

    // 기존 대표 뱃지 해제
    await pool.query(
      'UPDATE user_badges SET is_featured = false WHERE user_id = $1',
      [userId]
    );

    // 새 대표 뱃지 설정
    const result = await pool.query(`
      UPDATE user_badges
      SET is_featured = true
      WHERE user_id = $1 AND badge_id = $2
      RETURNING *
    `, [userId, badgeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '뱃지를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '대표 뱃지가 설정되었습니다.'
    });

  } catch (error) {
    logger.error('대표 뱃지 설정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 뱃지 획득 조건 체크 함수 (내부용)
exports.checkBadgeEligibility = async (userId) => {
  try {
    // 각 카테고리별 현재 수치를 병렬로 조회
    const [meetupCountResult, hostingCountResult, reviewCountResult, attendanceCountResult] = await Promise.all([
      // 참여 모임 수
      pool.query(`
        SELECT COUNT(*) as count
        FROM meetup_participants
        WHERE user_id = $1 AND status = '참가승인'
      `, [userId]),
      // 호스팅 모임 수
      pool.query(`
        SELECT COUNT(*) as count
        FROM meetups
        WHERE host_id = $1 AND status = '종료'
      `, [userId]),
      // 리뷰 작성 수
      pool.query(`
        SELECT COUNT(*) as count
        FROM reviews
        WHERE reviewer_id = $1
      `, [userId]),
      // 출석 완료 수
      pool.query(`
        SELECT COUNT(*) as count
        FROM meetup_participants
        WHERE user_id = $1 AND attended = true
      `, [userId]),
    ]);

    const counts = {
      meetup_count: parseInt(meetupCountResult.rows[0].count),
      hosting: parseInt(hostingCountResult.rows[0].count),
      review: parseInt(reviewCountResult.rows[0].count),
      attendance: parseInt(attendanceCountResult.rows[0].count),
    };

    // 모든 카테고리에 대해 획득 가능한 뱃지 조회
    const eligibleBadgesResult = await pool.query(`
      SELECT b.*
      FROM badges b
      WHERE b.is_active = true
        AND b.id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = $1)
        AND (
          (b.category = 'meetup_count' AND b.required_count <= $2)
          OR (b.category = 'hosting' AND b.required_count <= $3)
          OR (b.category = 'review' AND b.required_count <= $4)
          OR (b.category = 'attendance' AND b.required_count <= $5)
        )
    `, [userId, counts.meetup_count, counts.hosting, counts.review, counts.attendance]);

    // 자동 획득
    const earnedBadges = [];
    for (const badge of eligibleBadgesResult.rows) {
      await pool.query(`
        INSERT INTO user_badges (user_id, badge_id, earned_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT DO NOTHING
      `, [userId, badge.id]);
      earnedBadges.push(badge);
    }

    if (earnedBadges.length > 0) {
      logger.info(`사용자 ${userId}가 뱃지 ${earnedBadges.length}개 획득: ${earnedBadges.map(b => b.name).join(', ')}`);
    }

    return earnedBadges;
  } catch (error) {
    logger.error('뱃지 획득 조건 체크 오류:', error);
    return [];
  }
};
