const pool = require('../../config/database');
const { processImageUrl } = require('../../utils/helpers');

// 현재 사용자 정보 조회
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const userResult = await pool.query(`
      SELECT id, email, name, profile_image, provider, is_verified, created_at, rating
      FROM users
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profile_image,
        provider: user.provider,
        isVerified: user.is_verified,
        rating: user.rating,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '사용자 정보를 불러올 수 없습니다.'
    });
  }
};

// 사용자 통계 조회
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 포인트 조회
    const pointsResult = await pool.query(`
      SELECT COALESCE(available_points, 0) as available_points
      FROM user_points
      WHERE user_id = $1
    `, [userId]);

    // 참여한 모임 수 조회
    const meetupsResult = await pool.query(`
      SELECT COUNT(*) as total_meetups
      FROM meetup_participants
      WHERE user_id = $1 AND status = '참가승인'
    `, [userId]);

    // 호스트한 모임 수 조회
    const hostedMeetupsResult = await pool.query(`
      SELECT COUNT(*) as hosted_meetups
      FROM meetups
      WHERE host_id = $1
    `, [userId]);

    // 리뷰 수 조회
    const reviewsResult = await pool.query(`
      SELECT COUNT(*) as review_count
      FROM reviews
      WHERE reviewer_id = $1
    `, [userId]);

    const stats = {
      availablePoints: pointsResult.rows[0]?.available_points || 0,
      totalMeetups: parseInt(meetupsResult.rows[0]?.total_meetups || 0),
      hostedMeetups: parseInt(hostedMeetupsResult.rows[0]?.hosted_meetups || 0),
      reviewCount: parseInt(reviewsResult.rows[0]?.review_count || 0),
      riceIndex: Math.min(70 + parseInt(meetupsResult.rows[0]?.total_meetups || 0) * 2, 100)
    };

    res.json({ stats });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 내 리뷰 조회
exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        r.id,
        r.rating,
        r.content,
        r.created_at,
        m.title as meetup_title,
        m.date as meetup_date,
        m.location as meetup_location
      FROM reviews r
      JOIN meetups m ON r.meetup_id = m.id
      WHERE r.reviewer_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('내 리뷰 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 내 활동 내역
exports.getActivities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status = 'all' } = req.query;

    const offset = (page - 1) * limit;
    let statusFilter = '';
    let params = [userId, limit, offset];

    if (status !== 'all') {
      statusFilter = 'AND mp.status = $4';
      params.push(status);
    }

    const result = await pool.query(`
      SELECT
        m.id,
        m.title,
        m.description,
        m.date,
        m.time,
        m.location,
        m.category,
        m.max_participants,
        m.current_participants,
        m.image,
        mp.status as participation_status,
        mp.joined_at,
        u.name as host_name
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE mp.user_id = $1 ${statusFilter}
      ORDER BY mp.joined_at DESC
      LIMIT $2 OFFSET $3
    `, params);

    res.json({
      activities: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('내 활동 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 내가 호스트한 모임 조회
exports.getHostedMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        m.id,
        m.title,
        m.description,
        m.date,
        m.time,
        m.location,
        m.category,
        m.max_participants,
        m.current_participants,
        m.image,
        m.status,
        m.created_at
      FROM meetups m
      WHERE m.host_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      meetups: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });
  } catch (error) {
    console.error('호스트 모임 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 위시리스트 조회
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT m.*, u.name as host_name, u.profile_image as host_profile_image
      FROM user_favorites uf
      JOIN meetups m ON uf.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE uf.user_id = $1
      ORDER BY uf.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      wishlist: result.rows
    });
  } catch (error) {
    console.error('위시리스트 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 위시리스트 추가/제거
exports.toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId } = req.params;

    // 기존 찜 확인
    const existingResult = await pool.query(`
      SELECT * FROM user_favorites WHERE user_id = $1 AND meetup_id = $2
    `, [userId, meetupId]);

    let isWishlisted;

    if (existingResult.rows.length > 0) {
      // 찜 제거
      await pool.query(`
        DELETE FROM user_favorites WHERE user_id = $1 AND meetup_id = $2
      `, [userId, meetupId]);
      isWishlisted = false;
    } else {
      // 찜 추가
      await pool.query(`
        INSERT INTO user_favorites (user_id, meetup_id, created_at)
        VALUES ($1, $2, NOW())
      `, [userId, meetupId]);
      isWishlisted = true;
    }

    res.json({
      success: true,
      isWishlisted,
      message: isWishlisted ? '위시리스트에 추가되었습니다' : '위시리스트에서 제거되었습니다'
    });
  } catch (error) {
    console.error('위시리스트 토글 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 밥알지수 조회
exports.getRiceIndex = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🍚 밥알지수 계산 요청:', { userId });

    // 사용자 활동 데이터 조회
    const [
      hostedResult,
      joinedResult,
      completedResult,
      reviews,
      averageRating
    ] = await Promise.all([
      // 호스팅한 모임 수
      pool.query(`
        SELECT COUNT(*) as count
        FROM meetups
        WHERE host_id = $1
      `, [userId]),

      // 참가한 모임 수 (호스트로 참여한 것 제외)
      pool.query(`
        SELECT COUNT(*) as count
        FROM meetup_participants mp
        JOIN meetups m ON mp.meetup_id = m.id
        WHERE mp.user_id = $1 AND m.host_id != $2
      `, [userId, userId]),

      // 과거 모임 참가 수 (완료된 모임)
      pool.query(`
        SELECT COUNT(*) as count
        FROM meetup_participants mp
        JOIN meetups m ON mp.meetup_id = m.id
        WHERE mp.user_id = $1 AND m.date < CURRENT_DATE
      `, [userId]),

      // 작성한 리뷰 수
      pool.query(`
        SELECT COUNT(*) as count
        FROM reviews
        WHERE reviewer_id = $1
      `, [userId]),

      // 받은 평균 평점 (호스트로서)
      pool.query(`
        SELECT AVG(r.rating) as avg_rating
        FROM reviews r
        JOIN meetups m ON r.meetup_id = m.id
        WHERE m.host_id = $1
      `, [userId])
    ]);

    const stats = {
      joinedMeetups: parseInt(joinedResult.rows[0].count),
      hostedMeetups: parseInt(hostedResult.rows[0].count),
      completedMeetups: parseInt(completedResult.rows[0].count),
      reviewsWritten: parseInt(reviews.rows[0].count),
      averageRating: parseFloat(averageRating.rows[0].avg_rating || 0)
    };

    // 사용자의 저장된 밥알지수 조회
    const userResult = await pool.query(`
      SELECT babal_score FROM users WHERE id = $1
    `, [userId]);

    let riceIndex = userResult.rows[0]?.babal_score || 40.0;

    // 밥알지수 레벨 계산
    const getRiceLevel = (score) => {
      if (score >= 98.1) {
        return { level: "밥神 (밥신)", emoji: "🍚🍚🍚🍚🍚🍚🍚", description: "전설적인 유저", color: "#FFD700" };
      } else if (score >= 90.0) {
        return { level: "찰밥대장", emoji: "🍚🍚🍚🍚🍚🍚", description: "거의 완벽한 활동 이력", color: "#FF6B35" };
      } else if (score >= 80.0) {
        return { level: "밥도둑 밥상", emoji: "🍚🍚🍚🍚🍚", description: "상위권, 최고의 매너 보유", color: "#F7931E" };
      } else if (score >= 70.0) {
        return { level: "고봉밥", emoji: "🍚🍚🍚🍚", description: "후기 품질도 높고 꾸준한 출석", color: "#4CAF50" };
      } else if (score >= 60.0) {
        return { level: "따끈한 밥그릇", emoji: "🍚🍚🍚", description: "후기와 출석률 모두 양호", color: "#2196F3" };
      } else if (score >= 40.0) {
        return { level: "밥 한 숟갈", emoji: "🍚", description: "일반 유저, 평균적인 활동", color: "#9E9E9E" };
      } else {
        return { level: "티스푼", emoji: "🍚🍚", description: "반복된 신고/노쇼, 신뢰 낮음", color: "#F44336" };
      }
    };

    const levelInfo = getRiceLevel(riceIndex);

    console.log('✅ 밥알지수 계산 완료:', { userId, riceIndex, level: levelInfo.level });

    res.json({
      success: true,
      riceIndex,
      calculatedIndex: riceIndex,
      level: levelInfo,
      stats
    });

  } catch (error) {
    console.error('❌ 밥알지수 계산 실패:', error);
    res.status(500).json({
      success: false,
      error: '밥알지수를 계산할 수 없습니다.'
    });
  }
};

// 프로필 업데이트
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone, gender, profileImage } = req.body;

    const result = await pool.query(`
      UPDATE users
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          gender = COALESCE($3, gender),
          profile_image = COALESCE($4, profile_image),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, phone, gender, profileImage, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        profileImage: user.profile_image
      }
    });
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 찜 목록 조회 (wishlists)
exports.getWishlists = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    console.log('🤍 찜 목록 조회:', { userId, page, limit });

    const result = await pool.query(`
      SELECT
        mw.id as wishlist_id,
        mw.created_at as wishlisted_at,
        m.id,
        m.title,
        m.description,
        m.location,
        m.address,
        m.date,
        m.time,
        m.current_participants,
        m.max_participants,
        CASE WHEN m.promise_deposit_required = true THEN 3000 ELSE 0 END as deposit_amount,
        m.category,
        m.status,
        m.image,
        m.created_at,
        u.name as host_name,
        u.profile_image as host_profile_image,
        CASE
          WHEN m.status IN ('모집완료', '진행중', '종료', '취소')
            OR (m.date::date + m.time::time) < NOW()
          THEN true
          ELSE false
        END as is_ended
      FROM meetup_wishlists mw
      JOIN meetups m ON mw.meetup_id = m.id
      LEFT JOIN users u ON m.host_id = u.id
      WHERE mw.user_id = $1
      ORDER BY mw.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM meetup_wishlists WHERE user_id = $1',
      [userId]
    );

    const totalCount = parseInt(countResult.rows[0].count);

    console.log('✅ 찜 목록 조회 성공:', result.rows.length, '건');

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('찜 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

// 최근 본 글 목록 조회
exports.getRecentViews = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('👀 최근 본 글 목록 조회:', { userId, page, limit });

    const result = await pool.query(`
      SELECT
        urv.id as view_id,
        urv.viewed_at,
        m.id,
        m.title,
        m.description,
        m.location,
        m.address,
        m.date,
        m.time,
        m.current_participants,
        m.max_participants,
        CASE WHEN m.promise_deposit_required = true THEN 3000 ELSE 0 END as deposit_amount,
        m.category,
        m.status,
        m.image,
        m.created_at,
        u.name as host_name,
        u.profile_image as host_profile_image,
        CASE
          WHEN m.status IN ('모집완료', '진행중', '종료', '취소')
            OR (m.date::date + m.time::time) < NOW()
          THEN true
          ELSE false
        END as is_ended
      FROM user_recent_views urv
      JOIN meetups m ON urv.meetup_id = m.id
      LEFT JOIN users u ON m.host_id = u.id
      WHERE urv.user_id = $1
      ORDER BY urv.viewed_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM user_recent_views WHERE user_id = $1',
      [userId]
    );

    const totalCount = parseInt(countResult.rows[0].count);

    console.log('✅ 최근 본 글 목록 조회 성공:', result.rows.length, '건');

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('최근 본 글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '최근 본 글 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

// 최근 본 글 특정 항목 제거
exports.deleteRecentView = async (req, res) => {
  try {
    const { viewId } = req.params;
    const userId = req.user.userId;

    console.log('👀 최근 본 글 제거 요청:', { viewId, userId });

    const result = await pool.query(
      'DELETE FROM user_recent_views WHERE id = $1 AND user_id = $2 RETURNING id',
      [viewId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '최근 본 글을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 최근 본 글 제거 성공');

    res.json({
      success: true,
      message: '최근 본 글에서 제거되었습니다.'
    });

  } catch (error) {
    console.error('최근 본 글 제거 오류:', error);
    res.status(500).json({
      success: false,
      message: '최근 본 글 제거 중 오류가 발생했습니다.'
    });
  }
};

// 최근 본 글 전체 삭제
exports.deleteAllRecentViews = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('👀 최근 본 글 전체 삭제 요청:', { userId });

    const result = await pool.query(
      'DELETE FROM user_recent_views WHERE user_id = $1',
      [userId]
    );

    console.log('✅ 최근 본 글 전체 삭제 성공:', result.rowCount, '건');

    res.json({
      success: true,
      message: `최근 본 글 ${result.rowCount}건이 모두 삭제되었습니다.`
    });

  } catch (error) {
    console.error('최근 본 글 전체 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '최근 본 글 전체 삭제 중 오류가 발생했습니다.'
    });
  }
};

// 회원 차단
exports.blockUser = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const { userId: blockedUserId } = req.params;
    const { reason } = req.body;

    console.log('🚫 회원 차단 요청:', { blockerId, blockedUserId, reason });

    if (blockerId === blockedUserId) {
      return res.status(400).json({
        success: false,
        message: '자기 자신을 차단할 수 없습니다.'
      });
    }

    const userCheck = await pool.query('SELECT id, name FROM users WHERE id = $1', [blockedUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const existingBlock = await pool.query(
      'SELECT id FROM user_blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
      [blockerId, blockedUserId]
    );

    if (existingBlock.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 차단된 사용자입니다.'
      });
    }

    const result = await pool.query(
      'INSERT INTO user_blocked_users (user_id, blocked_user_id, reason) VALUES ($1, $2, $3) RETURNING id',
      [blockerId, blockedUserId, reason || null]
    );

    console.log('✅ 회원 차단 성공:', { blockId: result.rows[0].id });

    res.json({
      success: true,
      message: `${userCheck.rows[0].name}님을 차단했습니다.`,
      data: {
        blockId: result.rows[0].id,
        blockedUser: userCheck.rows[0]
      }
    });

  } catch (error) {
    console.error('회원 차단 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원 차단 중 오류가 발생했습니다.'
    });
  }
};

// 회원 차단 해제
exports.unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const { userId: blockedUserId } = req.params;

    console.log('🔓 회원 차단 해제 요청:', { blockerId, blockedUserId });

    const userCheck = await pool.query('SELECT name FROM users WHERE id = $1', [blockedUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const result = await pool.query(
      'DELETE FROM user_blocked_users WHERE user_id = $1 AND blocked_user_id = $2 RETURNING id',
      [blockerId, blockedUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '차단되지 않은 사용자입니다.'
      });
    }

    console.log('✅ 회원 차단 해제 성공');

    res.json({
      success: true,
      message: `${userCheck.rows[0].name}님의 차단을 해제했습니다.`
    });

  } catch (error) {
    console.error('회원 차단 해제 오류:', error);
    res.status(500).json({
      success: false,
      message: '회원 차단 해제 중 오류가 발생했습니다.'
    });
  }
};

// 차단한 회원 목록 조회
exports.getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('🚫 차단 회원 목록 조회:', { userId, page, limit });

    const result = await pool.query(`
      SELECT
        ub.id as block_id,
        ub.reason,
        ub.blocked_at,
        u.id,
        u.name,
        u.email,
        u.profile_image
      FROM user_blocked_users ub
      LEFT JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.user_id = $1
      ORDER BY ub.blocked_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM user_blocked_users WHERE user_id = $1',
      [userId]
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    console.log('✅ 차단 회원 목록 조회 성공:', result.rows.length, '건');

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages
      }
    });

  } catch (error) {
    console.error('차단 회원 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '차단 회원 목록을 불러올 수 없습니다.'
    });
  }
};

// 특정 사용자 차단 상태 확인
exports.checkBlockedStatus = async (req, res) => {
  try {
    const checkerId = req.user.userId;
    const { userId: targetUserId } = req.params;

    const result = await pool.query(
      'SELECT id FROM user_blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
      [checkerId, targetUserId]
    );

    res.json({
      success: true,
      data: {
        isBlocked: result.rows.length > 0,
        blockId: result.rows.length > 0 ? result.rows[0].id : null
      }
    });

  } catch (error) {
    console.error('차단 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '차단 상태를 확인할 수 없습니다.'
    });
  }
};

// 내 리뷰 목록 (legacy /users/my-reviews)
exports.getLegacyMyReviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        r.id,
        r.content,
        r.rating,
        r.created_at,
        m.id as meetup_id,
        m.title as meetup_title,
        m.date as meetup_date,
        u.name as host_name
      FROM reviews r
      JOIN meetups m ON r.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE r.reviewer_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('내 리뷰 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '리뷰 목록을 불러올 수 없습니다.' });
  }
};

// 리뷰 수정 (legacy)
exports.updateLegacyReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reviewId } = req.params;
    const { content, rating } = req.body;

    await pool.query(`
      UPDATE reviews
      SET content = $1, rating = $2, updated_at = NOW()
      WHERE id = $3 AND reviewer_id = $4
    `, [content, rating, reviewId, userId]);

    res.json({ success: true, message: '리뷰가 수정되었습니다.' });
  } catch (error) {
    console.error('리뷰 수정 오류:', error);
    res.status(500).json({ success: false, message: '리뷰 수정에 실패했습니다.' });
  }
};

// 리뷰 삭제 (legacy)
exports.deleteLegacyReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { reviewId } = req.params;

    await pool.query(`
      DELETE FROM reviews
      WHERE id = $1 AND reviewer_id = $2
    `, [reviewId, userId]);

    res.json({ success: true, message: '리뷰가 삭제되었습니다.' });
  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    res.status(500).json({ success: false, message: '리뷰 삭제에 실패했습니다.' });
  }
};

// 포인트 잔액 조회
exports.getPoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('💰 포인트 잔액 조회 요청:', { userId });

    const userResult = await pool.query(`
      SELECT u.id, u.name, COALESCE(up.available_points, 0) as points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];
    console.log('✅ 포인트 조회 성공:', { userId: user.id, name: user.name, points: user.points });

    res.json({
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        points: user.points || 0
      }
    });
  } catch (error) {
    console.error('포인트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '포인트 조회 중 오류가 발생했습니다.'
    });
  }
};

// 내가 참가한 모임 목록 조회
exports.getJoinedMeetups = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;

    console.log('👥 참가 모임 조회 요청:', { userId, page, limit });

    const meetupsResult = await pool.query(`
      SELECT
        m.id,
        m.title,
        m.description,
        m.location,
        m.date,
        m.time,
        m.max_participants as "maxParticipants",
        m.current_participants as "currentParticipants",
        m.category,
        m.price_range as "priceRange",
        m.age_range as "ageRange",
        m.gender_preference as "genderPreference",
        m.image,
        m.status,
        m.created_at as "createdAt",
        mp.status as "participationStatus",
        mp.created_at as "joinedAt",
        u.name as "hostName"
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE mp.user_id = $1
      ORDER BY mp.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.user_id = $1
    `, [userId]);

    const total = parseInt(countResult.rows[0].total);

    console.log('✅ 참가 모임 조회 성공:', { count: meetupsResult.rows.length, total });

    const meetupsWithImages = meetupsResult.rows.map(meetup => ({
      ...meetup,
      image: processImageUrl(meetup.image, meetup.category)
    }));

    res.json({
      success: true,
      data: meetupsWithImages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('참가 모임 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 설정 조회
exports.getNotificationSettings = async (req, res) => {
  try {
    console.log('🔔 알림 설정 조회 요청');
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        push_notifications,
        email_notifications,
        meetup_reminders,
        chat_notifications,
        marketing_notifications,
        updated_at
      FROM user_notification_settings
      WHERE user_id = $1
    `, [userId]);

    let settings;
    if (result.rows.length === 0) {
      const defaultSettings = {
        push_notifications: true,
        email_notifications: true,
        meetup_reminders: true,
        chat_notifications: true,
        marketing_notifications: false
      };

      await pool.query(`
        INSERT INTO user_notification_settings
        (user_id, push_notifications, email_notifications, meetup_reminders, chat_notifications, marketing_notifications)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, defaultSettings.push_notifications, defaultSettings.email_notifications,
          defaultSettings.meetup_reminders, defaultSettings.chat_notifications, defaultSettings.marketing_notifications]);

      settings = defaultSettings;
    } else {
      settings = result.rows[0];
    }

    console.log('✅ 알림 설정 조회 성공');
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ 알림 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 설정 조회 중 오류가 발생했습니다.'
    });
  }
};

// 알림 설정 업데이트
exports.updateNotificationSettings = async (req, res) => {
  try {
    console.log('🔔 알림 설정 업데이트 요청:', req.body);
    const userId = req.user.userId;
    const {
      push_notifications,
      email_notifications,
      meetup_reminders,
      chat_notifications,
      marketing_notifications
    } = req.body;

    const existingSettings = await pool.query(
      'SELECT user_id FROM user_notification_settings WHERE user_id = $1',
      [userId]
    );

    if (existingSettings.rows.length === 0) {
      await pool.query(`
        INSERT INTO user_notification_settings
        (user_id, push_notifications, email_notifications, meetup_reminders, chat_notifications, marketing_notifications)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, push_notifications ?? true, email_notifications ?? true,
          meetup_reminders ?? true, chat_notifications ?? true, marketing_notifications ?? false]);
    } else {
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;

      if (push_notifications !== undefined) {
        updateFields.push(`push_notifications = $${valueIndex}`);
        updateValues.push(push_notifications);
        valueIndex++;
      }
      if (email_notifications !== undefined) {
        updateFields.push(`email_notifications = $${valueIndex}`);
        updateValues.push(email_notifications);
        valueIndex++;
      }
      if (meetup_reminders !== undefined) {
        updateFields.push(`meetup_reminders = $${valueIndex}`);
        updateValues.push(meetup_reminders);
        valueIndex++;
      }
      if (chat_notifications !== undefined) {
        updateFields.push(`chat_notifications = $${valueIndex}`);
        updateValues.push(chat_notifications);
        valueIndex++;
      }
      if (marketing_notifications !== undefined) {
        updateFields.push(`marketing_notifications = $${valueIndex}`);
        updateValues.push(marketing_notifications);
        valueIndex++;
      }

      updateFields.push(`updated_at = $${valueIndex}`);
      updateValues.push(new Date());
      valueIndex++;

      updateValues.push(userId);

      if (updateFields.length > 1) {
        const updateQuery = `
          UPDATE user_notification_settings
          SET ${updateFields.join(', ')}
          WHERE user_id = $${valueIndex}
        `;
        await pool.query(updateQuery, updateValues);
      }
    }

    console.log('✅ 알림 설정 업데이트 성공');
    res.json({
      success: true,
      message: '알림 설정이 성공적으로 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('❌ 알림 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 설정 업데이트 중 오류가 발생했습니다.'
    });
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
exports.getNoticeDetail = async (req, res) => {
  try {
    const { id } = req.params;

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

// FAQ 목록 조회
exports.getFaq = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, question, answer, category, created_at
      FROM faq
      WHERE is_active = true
      ORDER BY order_index ASC, created_at DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('FAQ 조회 오류:', error);
    res.status(500).json({ success: false, message: 'FAQ를 불러올 수 없습니다.' });
  }
};

// 계정 탈퇴
exports.deleteAccount = async (req, res) => {
  try {
    console.log('🗑️ 계정 탈퇴 요청');
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, name',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없거나 이미 삭제된 계정입니다.'
      });
    }

    console.log('✅ 계정 삭제 완료:', result.rows[0].email);
    res.json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('❌ 계정 탈퇴 실패:', error);
    res.status(500).json({
      success: false,
      error: '계정 탈퇴 중 오류가 발생했습니다.'
    });
  }
};

// 비밀번호 변경
exports.changePassword = async (req, res) => {
  try {
    console.log('🔐 비밀번호 변경 요청');
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    const bcrypt = require('bcryptjs');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '새 비밀번호는 6자 이상이어야 합니다.'
      });
    }

    const userResult = await pool.query(
      'SELECT password, provider FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    if (user.provider !== 'email') {
      return res.status(400).json({
        success: false,
        error: '소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.'
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3',
      [hashedNewPassword, new Date(), userId]
    );

    console.log('✅ 비밀번호 변경 성공');
    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
  } catch (error) {
    console.error('❌ 비밀번호 변경 실패:', error);
    res.status(500).json({
      success: false,
      error: '비밀번호 변경 중 오류가 발생했습니다.'
    });
  }
};

// 사용자 프로필 조회 (GET /user/profile)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(`
      SELECT id, email, name, profile_image, provider, is_verified, created_at, rating,
             phone, gender, babal_score, meetups_joined, meetups_hosted
      FROM users WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profile_image,
        provider: user.provider,
        isVerified: user.is_verified,
        rating: user.rating,
        phone: user.phone,
        gender: user.gender,
        babalScore: user.babal_score,
        meetupsJoined: user.meetups_joined,
        meetupsHosted: user.meetups_hosted,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ success: false, error: '프로필 조회 실패' });
  }
};

// 사용자 포인트 조회 (GET /user/points)
exports.getUserPoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🎁 포인트 조회 요청:', { userId });

    const userResult = await pool.query(`
      SELECT u.id, u.name, u.email,
             COALESCE(up.total_earned, 0) as total_earned,
             COALESCE(up.available_points, 0) as available_points,
             COALESCE(up.total_used, 0) as total_used
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    const user = userResult.rows[0];
    console.log('✅ 포인트 조회 성공:', { userId, points: user.available_points });

    res.json({
      success: true,
      data: {
        id: user.id,
        userId: user.id,
        totalPoints: user.total_earned,
        availablePoints: user.available_points,
        usedPoints: user.total_used,
        expiredPoints: 0,
        lastUpdatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 포인트 조회 실패:', error);
    res.status(500).json({ success: false, error: '포인트 정보를 조회할 수 없습니다.' });
  }
};

// 포인트 내역 조회
exports.getPointTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('📋 포인트 내역 조회 요청:', { userId, page, limit });

    const transactionsResult = await pool.query(`
      SELECT * FROM point_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM point_transactions WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: transactionsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('포인트 내역 조회 오류:', error);
    res.status(500).json({ success: false, error: '포인트 내역 조회 실패' });
  }
};

// 사용자 뱃지 조회
exports.getUserBadges = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT b.*, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('뱃지 조회 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 조회 실패' });
  }
};

// 활동 통계 조회
exports.getActivityStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📊 활동 통계 조회 요청:', { userId });

    const hostedResult = await pool.query(
      'SELECT COUNT(*) as count FROM meetups WHERE host_id = $1',
      [userId]
    );

    const joinedResult = await pool.query(
      'SELECT COUNT(*) as count FROM meetup_participants WHERE user_id = $1',
      [userId]
    );

    const reviewsResult = await pool.query(
      'SELECT COUNT(*) as count FROM reviews WHERE reviewer_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        meetupsHosted: parseInt(hostedResult.rows[0].count),
        meetupsJoined: parseInt(joinedResult.rows[0].count),
        reviewsWritten: parseInt(reviewsResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('활동 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '활동 통계 조회 실패' });
  }
};

// 리뷰 가능한 모임 조회
exports.getReviewableMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT m.*, u.name as host_name
      FROM meetups m
      JOIN meetup_participants mp ON m.id = mp.meetup_id
      JOIN users u ON m.host_id = u.id
      WHERE mp.user_id = $1
        AND m.status = '종료'
        AND NOT EXISTS (
          SELECT 1 FROM reviews r
          WHERE r.meetup_id = m.id AND r.reviewer_id = $1
        )
      ORDER BY m.date DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('리뷰 가능 모임 조회 오류:', error);
    res.status(500).json({ success: false, error: '리뷰 가능 약속 조회 실패' });
  }
};

// 개인정보 설정 조회
exports.getPrivacySettings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT show_profile, show_activities, allow_messages
      FROM user_privacy_settings
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          showProfile: true,
          showActivities: true,
          allowMessages: true
        }
      });
    }

    const settings = result.rows[0];
    res.json({
      success: true,
      data: {
        showProfile: settings.show_profile,
        showActivities: settings.show_activities,
        allowMessages: settings.allow_messages
      }
    });
  } catch (error) {
    console.error('개인정보 설정 조회 오류:', error);
    res.status(500).json({ success: false, error: '개인정보 설정 조회 실패' });
  }
};

// 개인정보 설정 업데이트
exports.updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { showProfile, showActivities, allowMessages } = req.body;

    await pool.query(`
      INSERT INTO user_privacy_settings (user_id, show_profile, show_activities, allow_messages)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        show_profile = $2,
        show_activities = $3,
        allow_messages = $4,
        updated_at = NOW()
    `, [userId, showProfile, showActivities, allowMessages]);

    res.json({
      success: true,
      message: '개인정보 설정이 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('개인정보 설정 업데이트 오류:', error);
    res.status(500).json({ success: false, error: '개인정보 설정 업데이트 실패' });
  }
};

// 데이터 내보내기
exports.exportData = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const meetupsResult = await pool.query('SELECT * FROM meetups WHERE host_id = $1', [userId]);
    const participationsResult = await pool.query(
      'SELECT * FROM meetup_participants WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        hostedMeetups: meetupsResult.rows,
        participations: participationsResult.rows,
        exportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('데이터 내보내기 오류:', error);
    res.status(500).json({ success: false, error: '데이터 내보내기 실패' });
  }
};

// 보증금 조회
exports.getDeposits = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT d.*, m.title as meetup_title
      FROM deposits d
      LEFT JOIN meetups m ON d.meetup_id = m.id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('보증금 조회 오류:', error);
    res.status(500).json({ success: false, error: '보증금 조회 실패' });
  }
};

// ===== Users-legacy 엔드포인트용 함수들 =====

// 찜 목록 조회 (users)
exports.getLegacyWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        m.id, m.title, m.date, m.time, m.location, m.category,
        m.max_participants, m.current_participants, m.status,
        w.created_at as wishlisted_at,
        u.name as host_name
      FROM wishlists w
      JOIN meetups m ON w.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('찜 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '찜 목록을 불러올 수 없습니다.' });
  }
};

// 찜 목록에 추가 (users)
exports.addLegacyWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId } = req.params;

    await pool.query(`
      INSERT INTO wishlists (user_id, meetup_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, meetup_id) DO NOTHING
    `, [userId, meetupId]);

    res.json({ success: true, message: '찜 목록에 추가되었습니다.' });
  } catch (error) {
    console.error('찜 목록 추가 오류:', error);
    res.status(500).json({ success: false, message: '찜 목록 추가에 실패했습니다.' });
  }
};

// 찜 목록에서 제거 (users)
exports.removeLegacyWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId } = req.params;

    await pool.query(`
      DELETE FROM wishlists
      WHERE user_id = $1 AND meetup_id = $2
    `, [userId, meetupId]);

    res.json({ success: true, message: '찜 목록에서 제거되었습니다.' });
  } catch (error) {
    console.error('찜 목록 제거 오류:', error);
    res.status(500).json({ success: false, message: '찜 목록 제거에 실패했습니다.' });
  }
};

// 참가한 모임 목록 조회 (users/my-meetups)
exports.getMyMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        m.id, m.title, m.date, m.time, m.location, m.category,
        m.max_participants, m.current_participants, m.status,
        mp.status as participation_status,
        mp.joined_at,
        u.name as host_name,
        CASE WHEN m.host_id = $1 THEN true ELSE false END as is_host
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE mp.user_id = $1
      ORDER BY m.date DESC, m.time DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('참가한 모임 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '참가한 약속 목록을 불러올 수 없습니다.' });
  }
};

// 결제 내역 조회
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        ph.id, ph.amount, ph.payment_method, ph.status, ph.created_at,
        m.title as meetup_title, m.date as meetup_date
      FROM payment_history ph
      LEFT JOIN meetups m ON ph.meetup_id = m.id
      WHERE ph.user_id = $1
      ORDER BY ph.created_at DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    res.status(500).json({ success: false, message: '결제 내역을 불러올 수 없습니다.' });
  }
};

// 포인트 내역 조회 (users/point-history)
exports.getLegacyPointHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT * FROM point_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('포인트 내역 조회 오류:', error);
    res.status(500).json({ success: false, message: '포인트 내역을 불러올 수 없습니다.' });
  }
};

// 포인트 사용
exports.usePoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, purpose } = req.body;

    if (!amount || !purpose) {
      return res.status(400).json({ success: false, error: '금액과 사용 목적이 필요합니다.' });
    }
    if (amount <= 0) {
      return res.status(400).json({ success: false, error: '유효하지 않은 금액입니다.' });
    }

    // 포인트 차감
    await pool.query(`
      UPDATE user_points
      SET available_points = available_points - $1, total_used = total_used + $1, updated_at = NOW()
      WHERE user_id = $2 AND available_points >= $1
    `, [amount, userId]);

    // 거래 내역 기록
    await pool.query(`
      INSERT INTO point_transactions (user_id, amount, transaction_type, description, created_at)
      VALUES ($1, $2, 'use', $3, NOW())
    `, [userId, -amount, purpose]);

    res.json({ success: true, message: '포인트 사용 완료' });
  } catch (error) {
    console.error('포인트 사용 오류:', error);
    res.status(500).json({ success: false, error: '포인트 사용 실패' });
  }
};

// 포인트 환불
exports.refundPoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ success: false, error: '금액과 환불 사유가 필요합니다.' });
    }

    // 포인트 환불
    await pool.query(`
      INSERT INTO user_points (id, user_id, total_earned, available_points, total_used, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $2, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        total_earned = user_points.total_earned + $2,
        available_points = user_points.available_points + $2,
        updated_at = NOW()
    `, [userId, amount]);

    // 거래 내역 기록
    await pool.query(`
      INSERT INTO point_transactions (user_id, amount, transaction_type, description, created_at)
      VALUES ($1, $2, 'refund', $3, NOW())
    `, [userId, amount, reason]);

    res.json({ success: true, message: '포인트 환불 완료' });
  } catch (error) {
    console.error('포인트 환불 오류:', error);
    res.status(500).json({ success: false, error: '포인트 환불 실패' });
  }
};

// 초대 코드 조회/생성
exports.getInviteCode = async (req, res) => {
  try {
    const userId = req.user.userId;

    let result = await pool.query(`
      SELECT invite_code, created_at
      FROM user_invite_codes
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      await pool.query(`
        INSERT INTO user_invite_codes (user_id, invite_code, created_at)
        VALUES ($1, $2, NOW())
      `, [userId, inviteCode]);

      result = await pool.query(`
        SELECT invite_code, created_at
        FROM user_invite_codes
        WHERE user_id = $1
      `, [userId]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('초대 코드 조회 오류:', error);
    res.status(500).json({ success: false, message: '초대 코드를 불러올 수 없습니다.' });
  }
};

// 초대 코드 사용
exports.useInviteCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ success: false, error: '초대 코드가 필요합니다.' });
    }

    // 초대 코드 확인
    const codeResult = await pool.query(`
      SELECT user_id FROM user_invite_codes WHERE invite_code = $1
    `, [inviteCode]);

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: '유효하지 않은 초대 코드입니다.' });
    }

    const inviterId = codeResult.rows[0].user_id;

    if (inviterId === userId) {
      return res.status(400).json({ success: false, error: '자신의 초대 코드는 사용할 수 없습니다.' });
    }

    // 이미 사용했는지 확인
    const usedResult = await pool.query(`
      SELECT id FROM invite_code_usage WHERE user_id = $1
    `, [userId]);

    if (usedResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: '이미 초대 코드를 사용했습니다.' });
    }

    // 초대 코드 사용 기록
    await pool.query(`
      INSERT INTO invite_code_usage (user_id, inviter_id, invite_code, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [userId, inviterId, inviteCode]);

    res.json({ success: true, message: '초대 코드가 적용되었습니다.' });
  } catch (error) {
    console.error('초대 코드 사용 오류:', error);
    res.status(500).json({ success: false, error: '초대 코드 사용 실패' });
  }
};

// 포인트 충전
exports.chargePoints = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 충전 금액입니다.' });
    }

    await client.query('BEGIN');

    const currentPointsResult = await client.query(
      'SELECT available_points FROM users WHERE id = $1',
      [userId]
    );
    const currentPoints = currentPointsResult.rows[0]?.available_points || 0;
    const newBalance = currentPoints + amount;

    await client.query('UPDATE users SET available_points = $1 WHERE id = $2', [newBalance, userId]);

    const transactionResult = await client.query(`
      INSERT INTO user_points_transactions
      (user_id, transaction_type, amount, description, balance_after, related_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, 'charge', amount, `포인트 충전 (${paymentMethod})`, newBalance, null]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '포인트가 성공적으로 충전되었습니다.',
      data: {
        transactionId: transactionResult.rows[0].id,
        chargedAmount: amount,
        newBalance: newBalance
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('포인트 충전 실패:', error);
    res.status(500).json({ success: false, message: '포인트 충전 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

// 포인트 사용
exports.spendPoints = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const { amount, description, relatedId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 사용 금액입니다.' });
    }

    await client.query('BEGIN');

    const currentPointsResult = await client.query(
      'SELECT available_points FROM users WHERE id = $1',
      [userId]
    );
    const currentPoints = currentPointsResult.rows[0]?.available_points || 0;

    if (currentPoints < amount) {
      return res.status(400).json({ success: false, message: '보유 포인트가 부족합니다.' });
    }

    const newBalance = currentPoints - amount;

    await client.query('UPDATE users SET available_points = $1 WHERE id = $2', [newBalance, userId]);

    const transactionResult = await client.query(`
      INSERT INTO user_points_transactions
      (user_id, transaction_type, amount, description, balance_after, related_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, 'spend', -amount, description, newBalance, relatedId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '포인트가 성공적으로 사용되었습니다.',
      data: {
        transactionId: transactionResult.rows[0].id,
        spentAmount: amount,
        newBalance: newBalance
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('포인트 사용 실패:', error);
    res.status(500).json({ success: false, message: '포인트 사용 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

// 리뷰 관리 목록 조회
exports.getReviewsManage = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reviewsResult = await pool.query(`
      SELECT
        r.id,
        r.rating,
        r.content,
        r.tags,
        r.is_anonymous,
        r.created_at,
        r.updated_at,
        COALESCE(r.is_featured, false) as is_featured,
        m.title as meetup_title,
        m.date as meetup_date,
        m.location as meetup_location
      FROM reviews r
      INNER JOIN meetups m ON r.meetup_id = m.id
      WHERE r.reviewer_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      reviews: reviewsResult.rows
    });

  } catch (error) {
    console.error('리뷰 관리 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '리뷰 목록을 불러올 수 없습니다.' });
  }
};

// 참가자 개별 평가 조회
exports.getParticipantReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const participantReviewsResult = await pool.query(`
      SELECT
        ur.rating, ur.comment, ur.created_at,
        m.title as meetup_title, m.date as meetup_date,
        CASE
          WHEN ur.is_anonymous THEN '익명'
          ELSE u.name
        END as reviewer_name
      FROM user_reviews ur
      JOIN meetups m ON ur.meetup_id = m.id
      JOIN users u ON ur.reviewer_id = u.id
      WHERE ur.reviewed_user_id = $1
      ORDER BY ur.created_at DESC
    `, [userId]);

    const reviews = participantReviewsResult.rows;
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null;

    res.json({
      success: true,
      participantReviews: reviews,
      stats: {
        totalReviews: reviews.length,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null
      }
    });

  } catch (error) {
    console.error('참가자 평가 조회 오류:', error);
    res.status(500).json({ success: false, message: '참가자 평가 조회에 실패했습니다.' });
  }
};

// 포인트 내역 조회
exports.getPointHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query(
      'SELECT points FROM users WHERE id = $1',
      [userId]
    );
    const currentPoints = userResult.rows[0]?.points || 0;

    const transactionsResult = await pool.query(`
      SELECT
        pt.id, pt.transaction_type, pt.amount, pt.description, pt.created_at,
        m.title as meetup_title
      FROM point_transactions pt
      LEFT JOIN meetups m ON pt.related_meetup_id = m.id
      WHERE pt.user_id = $1
      ORDER BY pt.created_at DESC
      LIMIT 50
    `, [userId]);

    res.json({
      success: true,
      currentPoints,
      transactions: transactionsResult.rows
    });

  } catch (error) {
    console.error('포인트 내역 조회 오류:', error);
    res.status(500).json({ success: false, message: '포인트 내역 조회에 실패했습니다.' });
  }
};

// 프로필 이미지 업로드
exports.uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, error: '이미지 파일이 필요합니다.' });
    }

    const imageUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;

    await pool.query(
      'UPDATE users SET profile_image = $1 WHERE id = $2',
      [imageUrl, userId]
    );

    res.json({
      success: true,
      message: '프로필 이미지가 업로드되었습니다.',
      imageUrl
    });

  } catch (error) {
    console.error('프로필 이미지 업로드 오류:', error);
    res.status(500).json({ success: false, error: '프로필 이미지 업로드에 실패했습니다.' });
  }
};

// ===== USERS-LEGACY 경로용 함수들 =====

// 알림 설정 조회 (legacy: /users/notification-settings)
exports.getLegacyNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.userId;

    let result = await pool.query(`
      SELECT *
      FROM user_notification_settings
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // 기본 설정 생성
      await pool.query(`
        INSERT INTO user_notification_settings
        (user_id, meetup_reminders, chat_messages, review_notifications, marketing_notifications)
        VALUES ($1, true, true, true, false)
      `, [userId]);

      result = await pool.query(`
        SELECT *
        FROM user_notification_settings
        WHERE user_id = $1
      `, [userId]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('알림 설정 조회 오류:', error);
    res.status(500).json({ success: false, message: '알림 설정을 불러올 수 없습니다.' });
  }
};

// 알림 설정 업데이트 (legacy: /users/notification-settings)
exports.updateLegacyNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      meetupReminders,
      chatMessages,
      reviewNotifications,
      marketingNotifications
    } = req.body;

    await pool.query(`
      UPDATE user_notification_settings
      SET
        meetup_reminders = $1,
        chat_messages = $2,
        review_notifications = $3,
        marketing_notifications = $4,
        updated_at = NOW()
      WHERE user_id = $5
    `, [meetupReminders, chatMessages, reviewNotifications, marketingNotifications, userId]);

    res.json({ success: true, message: '알림 설정이 업데이트되었습니다.' });
  } catch (error) {
    console.error('알림 설정 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '알림 설정 업데이트에 실패했습니다.' });
  }
};

// 포인트 통계 (legacy: /users/point-stats)
exports.getPointStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // user_points 테이블에서 통계 조회
    const statsResult = await pool.query(`
      SELECT
        COALESCE(total_earned, 0) as total_earned,
        COALESCE(available_points, 0) as current_balance,
        COALESCE(total_used, 0) as total_spent
      FROM user_points
      WHERE user_id = $1
    `, [userId]);

    if (statsResult.rows.length === 0) {
      return res.json({
        currentBalance: 0,
        totalEarned: 0,
        totalSpent: 0
      });
    }

    const stats = statsResult.rows[0];
    res.json({
      currentBalance: parseInt(stats.current_balance) || 0,
      totalEarned: parseInt(stats.total_earned) || 0,
      totalSpent: parseInt(stats.total_spent) || 0
    });
  } catch (error) {
    console.error('포인트 통계 조회 오류:', error);
    res.status(500).json({ error: '포인트 통계 조회 실패' });
  }
};

// 최근 본 글 조회 (legacy: /users/recent-views)
exports.getLegacyRecentViews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        m.id,
        m.title,
        m.date,
        m.time,
        m.location,
        m.category,
        m.max_participants,
        m.current_participants,
        m.status,
        rv.viewed_at,
        u.name as host_name
      FROM recent_views rv
      JOIN meetups m ON rv.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE rv.user_id = $1
      ORDER BY rv.viewed_at DESC
      LIMIT 20
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('최근 본 글 조회 오류:', error);
    res.status(500).json({ success: false, message: '최근 본 글을 불러올 수 없습니다.' });
  }
};

// 최근 본 글 추가 (legacy: /users/recent-views/:meetupId)
exports.addLegacyRecentView = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId } = req.params;

    await pool.query(`
      INSERT INTO recent_views (user_id, meetup_id, viewed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, meetup_id)
      DO UPDATE SET viewed_at = NOW()
    `, [userId, meetupId]);

    res.json({ success: true, message: '최근 본 글에 추가되었습니다.' });
  } catch (error) {
    console.error('최근 본 글 추가 오류:', error);
    res.status(500).json({ success: false, message: '최근 본 글 추가에 실패했습니다.' });
  }
};

// 포인트 충전 (legacy: /users/charge-points)
exports.chargeLegacyPoints = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    // 개발자 계정 확인 함수
    const isDeveloperAccount = (email) => {
      const devEmails = ['dev@honbabnono.com', 'admin@honbabnono.com', 'test@honbabnono.com'];
      return email && devEmails.includes(email.toLowerCase());
    };

    // 사용자 정보 조회
    const userResult = await pool.query(`
      SELECT u.id, u.name, u.email, COALESCE(up.available_points, 0) as points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];
    const isDevAccount = isDeveloperAccount(user.email);

    // 개발자 계정 특별 혜택
    let finalAmount = amount;
    let bonusAmount = 0;
    let maxAmount = 1000000;

    if (isDevAccount) {
      bonusAmount = amount * 9;
      finalAmount = amount + bonusAmount;
      maxAmount = 100000000;
    }

    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        message: '최소 충전 금액은 1,000원입니다.'
      });
    }

    if (amount > maxAmount) {
      return res.status(400).json({
        success: false,
        message: isDevAccount ?
          '개발자 계정 최대 충전 금액은 100,000,000원입니다.' :
          '최대 충전 금액은 1,000,000원입니다.'
      });
    }

    const newPoints = (user.points || 0) + finalAmount;

    // user_points 테이블에 포인트 업데이트 또는 생성
    await pool.query(`
      INSERT INTO user_points (id, user_id, total_earned, available_points, total_used, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $2, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        total_earned = user_points.total_earned + $3,
        available_points = user_points.available_points + $3,
        updated_at = NOW()
    `, [userId, newPoints, finalAmount]);

    // 포인트 충전 기록 저장
    try {
      await pool.query(`
        INSERT INTO point_transactions (user_id, amount, transaction_type, description, created_at)
        VALUES ($1, $2, 'charge', $3, NOW())
      `, [userId, finalAmount, isDevAccount ? '개발자 계정 보너스 충전' : '포인트 충전']);
    } catch (transactionError) {
      console.log('포인트 거래 기록 오류:', transactionError.message);
    }

    let message = `${finalAmount.toLocaleString()}원이 충전되었습니다.`;
    if (isDevAccount && bonusAmount > 0) {
      message = `개발자 혜택! ${amount.toLocaleString()}원 충전 + ${bonusAmount.toLocaleString()}원 보너스 = 총 ${finalAmount.toLocaleString()}원이 충전되었습니다! 🎉`;
    }

    res.json({
      success: true,
      data: {
        userId,
        amount: finalAmount,
        previousPoints: user.points || 0,
        newPoints,
        message,
        isDeveloperAccount: isDevAccount,
        bonusAmount: bonusAmount || 0
      }
    });

  } catch (error) {
    console.error('포인트 충전 오류:', error);
    res.status(500).json({
      success: false,
      message: '포인트 충전 중 오류가 발생했습니다.'
    });
  }
};
