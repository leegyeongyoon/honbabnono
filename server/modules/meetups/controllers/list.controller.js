/**
 * 모임 목록 조회 컨트롤러
 */
const pool = require('../../../config/database');
const { processImageUrl, calculateDistance } = require('../../../utils/helpers');
const { extractUserId } = require('../helpers/auth.helper');
const {
  buildPagination,
  transformMeetupData,
  buildBlockedUserFilter,
  applyLocationFilter,
  MEETUP_WITH_TIME_SELECT,
} = require('../helpers/query.helper');

/**
 * 홈화면용 활성 모임 목록 (위치 기반 필터링 지원)
 */
exports.getHomeMeetups = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    const hasLocationFilter = latitude && longitude;
    const userLat = hasLocationFilter ? parseFloat(latitude) : null;
    const userLng = hasLocationFilter ? parseFloat(longitude) : null;
    const searchRadius = radius ? parseInt(radius) : 3000;

    const currentUserId = extractUserId(req);

    let homeQuery = `
      SELECT
        m.id, m.title, m.description, m.location, m.address,
        m.latitude, m.longitude,
        m.date, m.time, m.max_participants, m.current_participants,
        m.category, m.price_range, m.image, m.status,
        m.age_range, m.gender_preference, m.created_at,
        h.name as "host.name",
        h.profile_image as "host.profileImage",
        h.rating as "host.rating",
        EXTRACT(EPOCH FROM (m.date::date + m.time::time - NOW())) / 3600 as hours_until_start
      FROM meetups m
      LEFT JOIN users h ON m.host_id = h.id
      WHERE m.status IN ('모집중', '모집완료')
        AND (m.date::date + m.time::time) > NOW()
    `;

    const homeParams = [];

    if (currentUserId) {
      homeQuery += `
        AND m.host_id NOT IN (
          SELECT blocked_user_id
          FROM user_blocked_users
          WHERE user_id = $1
        )
      `;
      homeParams.push(currentUserId);
    }

    homeQuery += `
      ORDER BY
        CASE WHEN m.status = '모집중' THEN 1 ELSE 2 END,
        m.date ASC, m.time ASC
      LIMIT 50
    `;

    const activeMeetupsResult = await pool.query(homeQuery, homeParams);

    const userLocation = hasLocationFilter ? { lat: userLat, lng: userLng } : null;

    let meetups = activeMeetupsResult.rows.map((row) =>
      transformMeetupData(row, { userLocation, includeDistance: hasLocationFilter })
    );

    meetups = applyLocationFilter(meetups, {
      enabled: hasLocationFilter,
      radius: searchRadius,
      maxResults: 20,
    });

    res.json({
      success: true,
      meetups,
      meta: {
        totalActive: meetups.length,
        recruiting: meetups.filter((m) => m.isRecruiting).length,
        confirmed: meetups.filter((m) => m.status === '모집완료').length,
        hasLocationFilter,
        searchRadius: hasLocationFilter ? searchRadius : null,
      },
    });
  } catch (error) {
    console.error('홈화면 모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.',
    });
  }
};

/**
 * 활성 모임 목록 조회 (필터링 지원)
 */
exports.getActiveMeetups = async (req, res) => {
  try {
    const { category, location, priceRange, page = 1, limit = 10 } = req.query;
    const currentUserId = extractUserId(req);

    const whereConditions = [
      "m.status IN ('모집중', '모집완료')",
      "(m.date::date + m.time::time) > NOW()",
    ];
    const queryParams = [];
    let paramIndex = 1;

    if (currentUserId) {
      whereConditions.push(`m.host_id NOT IN (
        SELECT blocked_user_id
        FROM user_blocked_users
        WHERE user_id = $${paramIndex}
      )`);
      queryParams.push(currentUserId);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`m.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (location) {
      whereConditions.push(`m.location ILIKE $${paramIndex}`);
      queryParams.push(`%${location}%`);
      paramIndex++;
    }

    if (priceRange) {
      whereConditions.push(`m.price_range = $${paramIndex}`);
      queryParams.push(priceRange);
      paramIndex++;
    }

    const { offset, limit: parsedLimit } = buildPagination(page, limit);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM meetups m
      WHERE ${whereConditions.join(' AND ')}
    `;

    const dataQuery = `
      SELECT
        m.id, m.title, m.description, m.location, m.address,
        m.latitude, m.longitude,
        m.date, m.time, m.max_participants, m.current_participants,
        m.category, m.price_range, m.image, m.status,
        m.age_range, m.gender_preference, m.created_at,
        h.name as "host.name",
        h.profile_image as "host.profileImage",
        h.rating as "host.rating",
        EXTRACT(EPOCH FROM (m.date::date + m.time::time - NOW())) / 3600 as hours_until_start
      FROM meetups m
      LEFT JOIN users h ON m.host_id = h.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.date ASC, m.time ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, queryParams),
      pool.query(dataQuery, [...queryParams, parsedLimit, offset]),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const meetups = dataResult.rows.map((row) => transformMeetupData(row));

    res.json({
      success: true,
      meetups,
      pagination: {
        page: parseInt(page),
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('활성 모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.',
    });
  }
};

/**
 * 완료된 모임 목록 조회
 */
exports.getCompletedMeetups = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const currentUserId = extractUserId(req);

    const whereConditions = ["m.status = '종료'"];
    const queryParams = [];
    let paramIndex = 1;

    if (currentUserId) {
      whereConditions.push(`m.host_id NOT IN (
        SELECT blocked_user_id
        FROM user_blocked_users
        WHERE user_id = $${paramIndex}
      )`);
      queryParams.push(currentUserId);
      paramIndex++;
    }

    const { offset, limit: parsedLimit } = buildPagination(page, limit);

    const query = `
      SELECT
        m.id, m.title, m.description, m.location, m.address,
        m.date, m.time, m.max_participants, m.current_participants,
        m.category, m.price_range, m.image, m.status, m.created_at,
        h.name as "host.name",
        h.profile_image as "host.profileImage",
        h.rating as "host.rating"
      FROM meetups m
      LEFT JOIN users h ON m.host_id = h.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.date DESC, m.time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await pool.query(query, [...queryParams, parsedLimit, offset]);
    const meetups = result.rows.map((row) => transformMeetupData(row));

    res.json({
      success: true,
      meetups,
    });
  } catch (error) {
    console.error('완료된 모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.',
    });
  }
};

/**
 * 주변 모임 목록 조회 (GPS 기반)
 */
exports.getNearbyMeetups = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, page = 1, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: '위치 정보가 필요합니다.',
      });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const searchRadius = parseInt(radius);
    const currentUserId = extractUserId(req);

    const whereConditions = [
      "m.status IN ('모집중', '모집완료')",
      "(m.date::date + m.time::time) > NOW()",
      'm.latitude IS NOT NULL',
      'm.longitude IS NOT NULL',
    ];
    const queryParams = [];
    let paramIndex = 1;

    if (currentUserId) {
      whereConditions.push(`m.host_id NOT IN (
        SELECT blocked_user_id
        FROM user_blocked_users
        WHERE user_id = $${paramIndex}
      )`);
      queryParams.push(currentUserId);
      paramIndex++;
    }

    const query = `
      SELECT
        m.id, m.title, m.description, m.location, m.address,
        m.latitude, m.longitude,
        m.date, m.time, m.max_participants, m.current_participants,
        m.category, m.price_range, m.image, m.status, m.created_at,
        h.name as "host.name",
        h.profile_image as "host.profileImage",
        h.rating as "host.rating"
      FROM meetups m
      LEFT JOIN users h ON m.host_id = h.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.date ASC, m.time ASC
      LIMIT 100
    `;

    const result = await pool.query(query, queryParams);

    const userLocation = { lat: userLat, lng: userLng };
    let meetups = result.rows.map((row) =>
      transformMeetupData(row, { userLocation, includeDistance: true })
    );

    const { offset, limit: parsedLimit } = buildPagination(page, limit);

    meetups = meetups
      .filter((m) => m.distance !== null && m.distance <= searchRadius)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(offset, offset + parsedLimit);

    res.json({
      success: true,
      meetups,
      meta: {
        searchRadius,
        total: meetups.length,
      },
    });
  } catch (error) {
    console.error('주변 모임 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '주변 약속 조회에 실패했습니다.',
    });
  }
};

/**
 * 내 모임 목록 조회 (호스팅/참가)
 */
exports.getMyMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'all', page = 1, limit = 10 } = req.query;
    const { offset, limit: parsedLimit } = buildPagination(page, limit);

    let query;
    const params = [userId, parsedLimit, offset];

    if (type === 'hosting') {
      query = `
        SELECT
          m.id, m.title, m.description, m.location, m.address,
          m.date, m.time, m.max_participants, m.current_participants,
          m.category, m.price_range, m.image, m.status, m.created_at
        FROM meetups m
        WHERE m.host_id = $1
        ORDER BY m.date DESC, m.time DESC
        LIMIT $2 OFFSET $3
      `;
    } else if (type === 'participating') {
      query = `
        SELECT
          m.id, m.title, m.description, m.location, m.address,
          m.date, m.time, m.max_participants, m.current_participants,
          m.category, m.price_range, m.image, m.status, m.created_at
        FROM meetups m
        INNER JOIN meetup_participants mp ON m.id = mp.meetup_id
        WHERE mp.user_id = $1 AND mp.status = '참가승인' AND m.host_id != $1
        ORDER BY m.date DESC, m.time DESC
        LIMIT $2 OFFSET $3
      `;
    } else {
      query = `
        SELECT DISTINCT
          m.id, m.title, m.description, m.location, m.address,
          m.date, m.time, m.max_participants, m.current_participants,
          m.category, m.price_range, m.image, m.status, m.created_at
        FROM meetups m
        LEFT JOIN meetup_participants mp ON m.id = mp.meetup_id AND mp.user_id = $1
        WHERE m.host_id = $1 OR (mp.user_id = $1 AND mp.status = '참가승인')
        ORDER BY m.date DESC, m.time DESC
        LIMIT $2 OFFSET $3
      `;
    }

    const result = await pool.query(query, params);
    const meetups = result.rows.map((row) => transformMeetupData(row));

    res.json({
      success: true,
      meetups,
    });
  } catch (error) {
    console.error('내 모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.',
    });
  }
};

/**
 * 모임 목록 조회 (일반)
 */
exports.getMeetups = async (req, res) => {
  try {
    const { category, status, latitude, longitude, radius, page = 1, limit = 10 } = req.query;
    const hasLocationFilter = latitude && longitude;
    const userLat = hasLocationFilter ? parseFloat(latitude) : null;
    const userLng = hasLocationFilter ? parseFloat(longitude) : null;
    const searchRadius = radius ? parseInt(radius) : null;
    const { offset, limit: parsedLimit } = buildPagination(page, limit);

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`m.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`m.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    } else {
      // status 파라미터 없으면 지난/취소 모임 제외
      whereConditions.push("m.status NOT IN ('종료', '취소')");
      whereConditions.push("(m.date::date + m.time::time) > NOW()");
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    params.push(parsedLimit, offset);

    const result = await pool.query(
      `
      SELECT
        m.id, m.title, m.description, m.location, m.address,
        m.latitude, m.longitude,
        m.date, m.time, m.max_participants, m.current_participants,
        m.category, m.price_range, m.image, m.status,
        m.age_range, m.gender_preference, m.host_id,
        m.created_at, m.updated_at,
        u.name as "host.name",
        u.profile_image as "host.profileImage",
        u.rating as "host.rating"
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      ${whereClause}
      ORDER BY m.date ASC, m.time ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
      params
    );

    const userLocation = hasLocationFilter ? { lat: userLat, lng: userLng } : null;
    let meetups = result.rows.map((row) =>
      transformMeetupData(row, { userLocation, includeDistance: hasLocationFilter })
    );

    // 거리 필터 적용
    if (hasLocationFilter && searchRadius) {
      meetups = meetups
        .filter((m) => m.distance !== null && m.distance <= searchRadius)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    res.json({
      success: true,
      meetups,
      pagination: {
        page: parseInt(page),
        limit: parsedLimit,
        total: meetups.length,
      },
    });
  } catch (error) {
    console.error('모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.',
    });
  }
};
