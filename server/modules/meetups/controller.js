const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const logger = require('../../config/logger');
const { processImageUrl, calculateDistance } = require('../../utils/helpers');

// 홈화면용 활성 모임 목록 (위치 기반 필터링 지원)
exports.getHomeMeetups = async (req, res) => {
  try {
    // 위치 기반 필터링 파라미터
    const { latitude, longitude, radius } = req.query;
    const hasLocationFilter = latitude && longitude;
    const userLat = hasLocationFilter ? parseFloat(latitude) : null;
    const userLng = hasLocationFilter ? parseFloat(longitude) : null;
    const searchRadius = radius ? parseInt(radius) : 3000; // 기본 3km

    // 위치 기반 필터링 로그 (프로덕션에서는 logger 사용 권장)

    // 인증된 사용자의 차단 필터링을 위한 사용자 ID 추출
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.userId || decoded.id;
      } catch (error) {
        currentUserId = null;
      }
    }

    let homeQuery = `
      SELECT
        m.id, m.title, m.description, m.location, m.address,
        m.latitude, m.longitude,
        m.date, m.time, m.max_participants, m.current_participants,
        m.category, m.price_range, m.image, m.status,
        m.age_range, m.gender_preference,
        h.name as "host.name",
        h.profile_image as "host.profileImage",
        h.rating as "host.rating",
        EXTRACT(EPOCH FROM (m.date::date + m.time::time - NOW())) / 3600 as hours_until_start
      FROM meetups m
      LEFT JOIN users h ON m.host_id = h.id
      WHERE m.status IN ('모집중', '모집완료')
    `;

    let homeParams = [];

    if (currentUserId) {
      homeQuery += `
        AND m.host_id NOT IN (
          SELECT blocked_user_id
          FROM user_blocked_users
          WHERE user_id = $1
        )
      `;
      homeParams = [currentUserId];
    }

    homeQuery += `
      ORDER BY
        CASE WHEN m.status = '모집중' THEN 1 ELSE 2 END,
        m.date ASC, m.time ASC
      LIMIT 50
    `;

    const activeMeetupsResult = await pool.query(homeQuery, homeParams);

    // 모임 데이터 변환 및 거리 계산
    let meetups = activeMeetupsResult.rows.map(meetup => {
      const meetupData = {
        id: meetup.id,
        title: meetup.title,
        description: meetup.description,
        location: meetup.location,
        address: meetup.address,
        latitude: meetup.latitude,
        longitude: meetup.longitude,
        date: meetup.date,
        time: meetup.time,
        maxParticipants: meetup.max_participants,
        currentParticipants: meetup.current_participants,
        category: meetup.category,
        priceRange: meetup.price_range,
        ageRange: meetup.age_range,
        genderPreference: meetup.gender_preference,
        image: processImageUrl(meetup.image, meetup.category),
        status: meetup.status,
        host: {
          name: meetup['host.name'],
          profileImage: meetup['host.profileImage'],
          rating: meetup['host.rating']
        },
        hoursUntilStart: parseFloat(meetup.hours_until_start),
        isAvailable: meetup.current_participants < meetup.max_participants,
        isRecruiting: meetup.status === '모집중',
        distance: null // 기본값
      };

      // 위치 필터가 있고, 모임에 좌표가 있으면 거리 계산
      if (hasLocationFilter && meetup.latitude && meetup.longitude) {
        const meetupLat = parseFloat(meetup.latitude);
        const meetupLng = parseFloat(meetup.longitude);
        if (!isNaN(meetupLat) && !isNaN(meetupLng)) {
          meetupData.distance = calculateDistance(userLat, userLng, meetupLat, meetupLng);
        }
      }

      return meetupData;
    });

    // 위치 필터가 있으면 반경 내 모임만 필터링하고 거리순 정렬
    if (hasLocationFilter) {
      meetups = meetups
        .filter(m => m.distance !== null && m.distance <= searchRadius)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 20);

      // 위치 기반 필터링 완료
    } else {
      meetups = meetups.slice(0, 20);
    }

    // 홈화면 활성 모임 조회 완료

    res.json({
      success: true,
      meetups,
      meta: {
        totalActive: meetups.length,
        recruiting: meetups.filter(m => m.isRecruiting).length,
        confirmed: meetups.filter(m => m.status === '모집완료').length,
        hasLocationFilter,
        searchRadius: hasLocationFilter ? searchRadius : null
      }
    });

  } catch (error) {
    logger.error('홈화면 모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.'
    });
  }
};

// 활성 모임 목록 조회
exports.getActiveMeetups = async (req, res) => {
  try {
    const { category, location, priceRange, page = 1, limit = 10 } = req.query;

    logger.info('활성 모임 목록 조회:', { category, location, priceRange, page, limit });

    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.userId || decoded.id;
      } catch (error) {
        currentUserId = null;
      }
    }

    let whereConditions = [
      "m.status IN ('모집중', '모집완료')",
      "(m.date::date + m.time::time) > NOW()"
    ];

    let queryParams = [];
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

    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryParams.push(parseInt(limit), offset);

    const meetupsQuery = `
      SELECT
        m.*,
        h.name as host_name,
        h.profile_image as host_profile_image,
        h.rating as host_rating
      FROM meetups m
      LEFT JOIN users h ON m.host_id = h.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.date ASC, m.time ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const meetupsResult = await pool.query(meetupsQuery, queryParams);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM meetups m
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

    const meetups = meetupsResult.rows;
    const total = parseInt(countResult.rows[0].total);

    logger.info(`활성 모임 조회 완료: ${meetups.length}개 (전체 ${total}개)`);

    res.json({
      success: true,
      meetups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('활성 모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.'
    });
  }
};

// 완료된 모임 목록 조회
exports.getCompletedMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const completedMeetupsResult = await pool.query(`
      SELECT DISTINCT
        m.id, m.title, m.date, m.time, m.location, m.category, m.image,
        m.status, m.host_id,
        h.name as host_name,
        mp.status as participation_status,
        mp.joined_at,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as has_reviewed,
        COALESCE(mp.attended, false) as attended
      FROM meetups m
      LEFT JOIN users h ON m.host_id = h.id
      LEFT JOIN meetup_participants mp ON m.id = mp.meetup_id AND mp.user_id = $1
      LEFT JOIN reviews r ON m.id = r.meetup_id AND r.reviewer_id = $1
      WHERE (
        m.status IN ('종료', '취소')
        OR (m.date::date + m.time::time + INTERVAL '3 hours') < NOW()
      )
      AND (mp.user_id = $1 OR m.host_id = $1)
      ORDER BY m.date DESC, m.time DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), offset]);

    const totalResult = await pool.query(`
      SELECT COUNT(DISTINCT m.id) as total
      FROM meetups m
      LEFT JOIN meetup_participants mp ON m.id = mp.meetup_id AND mp.user_id = $1
      WHERE (
        m.status IN ('종료', '취소')
        OR (m.date::date + m.time::time + INTERVAL '3 hours') < NOW()
      )
      AND (mp.user_id = $1 OR m.host_id = $1)
    `, [userId]);

    res.json({
      success: true,
      meetups: completedMeetupsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalResult.rows[0].total),
        totalPages: Math.ceil(parseInt(totalResult.rows[0].total) / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('완료된 모임 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '완료된 약속 조회에 실패했습니다.'
    });
  }
};

// 주변 모임 검색 (GPS 기반)
exports.getNearbyMeetups = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 3000,
      category,
      status = '모집중',
      limit = 50
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: '위도(latitude)와 경도(longitude)가 필요합니다'
      });
    }

    const centerLat = parseFloat(latitude);
    const centerLng = parseFloat(longitude);
    const searchRadius = parseInt(radius);

    logger.info(`주변 모임 검색 요청: 중심(${centerLat}, ${centerLng}), 반경 ${searchRadius}m`);

    let whereClause = `WHERE m.status = $1 AND m.latitude IS NOT NULL AND m.longitude IS NOT NULL`;
    const params = [status];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND m.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    const meetupsResult = await pool.query(`
      SELECT
        m.id, m.title, m.description, m.category,
        m.location, m.address, m.latitude, m.longitude,
        m.date, m.time,
        m.max_participants as "maxParticipants",
        m.current_participants as "currentParticipants",
        m.price_range as "priceRange",
        m.image, m.status, m.host_id as "hostId",
        u.id as "host.id", u.name as "host.name",
        u.profile_image as "host.profileImage", u.rating as "host.rating"
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      ${whereClause}
      ORDER BY m.date ASC, m.time ASC
    `, params);

    const nearbyMeetups = meetupsResult.rows
      .map(meetup => {
        const meetupLat = parseFloat(meetup.latitude);
        const meetupLng = parseFloat(meetup.longitude);

        if (isNaN(meetupLat) || isNaN(meetupLng)) {
          return null;
        }

        const distance = calculateDistance(centerLat, centerLng, meetupLat, meetupLng);

        return {
          ...meetup,
          distance,
          host: {
            id: meetup['host.id'],
            name: meetup['host.name'],
            profileImage: meetup['host.profileImage'],
            rating: meetup['host.rating']
          }
        };
      })
      .filter(meetup => meetup && meetup.distance <= searchRadius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, parseInt(limit));

    logger.info(`주변 모임 검색 완료: ${nearbyMeetups.length}개 (반경 ${searchRadius}m 내)`);

    res.json({
      success: true,
      meetups: nearbyMeetups,
      center: { latitude: centerLat, longitude: centerLng },
      radius: searchRadius,
      total: nearbyMeetups.length
    });

  } catch (error) {
    logger.error('주변 모임 검색 오류:', error);
    res.status(500).json({
      success: false,
      message: '주변 약속 검색에 실패했습니다.'
    });
  }
};

// 내 모임 목록 조회
exports.getMyMeetups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'all', page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query;
    let params;

    if (type === 'hosted') {
      query = `
        SELECT m.*, 'hosted' as relation_type
        FROM meetups m
        WHERE m.host_id = $1
        ORDER BY m.date DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, parseInt(limit), offset];
    } else if (type === 'joined') {
      query = `
        SELECT m.*, 'joined' as relation_type, mp.status as participation_status
        FROM meetups m
        JOIN meetup_participants mp ON m.id = mp.meetup_id
        WHERE mp.user_id = $1
        ORDER BY m.date DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, parseInt(limit), offset];
    } else {
      query = `
        SELECT m.*,
          CASE WHEN m.host_id = $1 THEN 'hosted' ELSE 'joined' END as relation_type,
          mp.status as participation_status
        FROM meetups m
        LEFT JOIN meetup_participants mp ON m.id = mp.meetup_id AND mp.user_id = $1
        WHERE m.host_id = $1 OR mp.user_id = $1
        ORDER BY m.date DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, parseInt(limit), offset];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      meetups: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });

  } catch (error) {
    logger.error('내 모임 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 약속 조회에 실패했습니다.'
    });
  }
};

// 모임 목록 조회
exports.getMeetups = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT m.*, u.name as host_name, u.profile_image as host_profile_image
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      ${whereClause}
      ORDER BY m.date DESC, m.time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      success: true,
      meetups: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });

  } catch (error) {
    logger.error('모임 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 목록 조회에 실패했습니다.'
    });
  }
};

// 모임 생성
exports.createMeetup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title, description, category, location, address,
      latitude, longitude, date, time, maxParticipants,
      priceRange, ageRange, genderPreference, image
    } = req.body;

    logger.info('모임 생성 요청:', { userId, title, category, location });

    const result = await pool.query(`
      INSERT INTO meetups (
        host_id, title, description, category, location, address,
        latitude, longitude, date, time, max_participants,
        price_range, age_range, gender_preference, image,
        status, current_participants, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        '모집중', 1, NOW(), NOW()
      ) RETURNING *
    `, [
      userId, title, description, category, location, address,
      latitude, longitude, date, time, maxParticipants || 4,
      priceRange, ageRange, genderPreference, image
    ]);

    const meetup = result.rows[0];

    // 호스트를 참가자로 자동 추가
    await pool.query(`
      INSERT INTO meetup_participants (meetup_id, user_id, status, joined_at)
      VALUES ($1, $2, '참가승인', NOW())
    `, [meetup.id, userId]);

    logger.info('모임 생성 완료:', meetup.id);

    res.status(201).json({
      success: true,
      message: '약속이 만들어졌습니다.',
      meetup
    });

  } catch (error) {
    logger.error('모임 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 만들기에 실패했습니다.'
    });
  }
};

// 모임 상세 조회
exports.getMeetupById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT m.*,
        u.id as host_id, u.name as host_name,
        u.profile_image as host_profile_image, u.rating as host_rating
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.'
      });
    }

    const meetup = result.rows[0];

    // 참가자 목록 조회
    const participantsResult = await pool.query(`
      SELECT mp.*, u.name, u.profile_image, u.rating
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
      ORDER BY mp.joined_at
    `, [id]);

    res.json({
      success: true,
      meetup: {
        ...meetup,
        host: {
          id: meetup.host_id,
          name: meetup.host_name,
          profileImage: meetup.host_profile_image,
          rating: meetup.host_rating
        },
        participants: participantsResult.rows
      }
    });

  } catch (error) {
    logger.error('모임 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 조회에 실패했습니다.'
    });
  }
};

// 모임 수정
exports.updateMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    // 호스트 확인
    const meetupResult = await pool.query(
      'SELECT host_id FROM meetups WHERE id = $1',
      [id]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.'
      });
    }

    if (meetupResult.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '약속을 수정할 권한이 없습니다.'
      });
    }

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '수정할 내용이 없습니다.'
      });
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE meetups
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    res.json({
      success: true,
      message: '약속이 수정되었습니다.',
      meetup: result.rows[0]
    });

  } catch (error) {
    logger.error('모임 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 수정에 실패했습니다.'
    });
  }
};

// 모임 삭제
exports.deleteMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const meetupResult = await pool.query(
      'SELECT host_id FROM meetups WHERE id = $1',
      [id]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.'
      });
    }

    if (meetupResult.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '약속을 삭제할 권한이 없습니다.'
      });
    }

    await pool.query('DELETE FROM meetups WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '약속이 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('모임 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 삭제에 실패했습니다.'
    });
  }
};

// 모임 참가
exports.joinMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 모임 확인
    const meetupResult = await pool.query(
      'SELECT * FROM meetups WHERE id = $1',
      [id]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.'
      });
    }

    const meetup = meetupResult.rows[0];

    if (meetup.status !== '모집중') {
      return res.status(400).json({
        success: false,
        error: '현재 참가할 수 없는 약속입니다.'
      });
    }

    if (meetup.current_participants >= meetup.max_participants) {
      return res.status(400).json({
        success: false,
        error: '약속 정원이 가득 찼습니다.'
      });
    }

    // 이미 참가 여부 확인
    const existingResult = await pool.query(
      'SELECT * FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 참가 신청한 약속입니다.'
      });
    }

    // 참가 신청
    await pool.query(`
      INSERT INTO meetup_participants (meetup_id, user_id, status, joined_at)
      VALUES ($1, $2, '참가신청', NOW())
    `, [id, userId]);

    res.json({
      success: true,
      message: '참가 신청이 완료되었습니다.'
    });

  } catch (error) {
    logger.error('모임 참가 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 참가에 실패했습니다.'
    });
  }
};

// 모임 참가 취소
exports.leaveMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '참가 신청을 찾을 수 없습니다.'
      });
    }

    // 참가자 수 감소
    await pool.query(
      'UPDATE meetups SET current_participants = current_participants - 1 WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: '참가가 취소되었습니다.'
    });

  } catch (error) {
    logger.error('참가 취소 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가 취소에 실패했습니다.'
    });
  }
};

// 참가자 목록 조회
exports.getParticipants = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT mp.*, u.name, u.profile_image, u.rating
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
      ORDER BY mp.joined_at
    `, [id]);

    res.json({
      success: true,
      participants: result.rows
    });

  } catch (error) {
    logger.error('참가자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 목록 조회에 실패했습니다.'
    });
  }
};

// 참가 승인/거절
exports.updateParticipantStatus = async (req, res) => {
  try {
    const { id, participantId } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    // 호스트 확인
    const meetupResult = await pool.query(
      'SELECT host_id FROM meetups WHERE id = $1',
      [id]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.'
      });
    }

    if (meetupResult.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '참가 상태를 변경할 권한이 없습니다.'
      });
    }

    const result = await pool.query(`
      UPDATE meetup_participants
      SET status = $1
      WHERE meetup_id = $2 AND user_id = $3
      RETURNING *
    `, [status, id, participantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '참가자를 찾을 수 없습니다.'
      });
    }

    // 승인된 경우 참가자 수 증가
    if (status === '참가승인') {
      await pool.query(
        'UPDATE meetups SET current_participants = current_participants + 1 WHERE id = $1',
        [id]
      );
    }

    res.json({
      success: true,
      message: `참가 상태가 ${status}(으)로 변경되었습니다.`,
      participant: result.rows[0]
    });

  } catch (error) {
    logger.error('참가 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가 상태 변경에 실패했습니다.'
    });
  }
};

// 모임 상태 변경
exports.updateMeetupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const meetupResult = await pool.query(
      'SELECT host_id FROM meetups WHERE id = $1',
      [id]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.'
      });
    }

    if (meetupResult.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '약속 상태를 변경할 권한이 없습니다.'
      });
    }

    const result = await pool.query(`
      UPDATE meetups
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    res.json({
      success: true,
      message: `약속 상태가 ${status}(으)로 변경되었습니다.`,
      meetup: result.rows[0]
    });

  } catch (error) {
    logger.error('모임 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '약속 상태 변경에 실패했습니다.'
    });
  }
};

// 최근 본 글 추가 (조회수 기록)
exports.addView = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    logger.debug('최근 본 글 추가 요청:', { meetupId, userId });

    // 모임이 존재하는지 확인
    const meetupResult = await pool.query('SELECT id FROM meetups WHERE id = $1', [meetupId]);
    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '약속을 찾을 수 없습니다.'
      });
    }

    // 최근 본 글에 추가 (중복 시 시간만 업데이트)
    await pool.query(
      'INSERT INTO user_recent_views (user_id, meetup_id) VALUES ($1, $2) ON CONFLICT (user_id, meetup_id) DO UPDATE SET viewed_at = NOW()',
      [userId, meetupId]
    );

    logger.info('최근 본 글 추가 성공');

    res.json({
      success: true,
      message: '최근 본 글에 추가되었습니다.'
    });

  } catch (error) {
    logger.error('최근 본 글 추가 오류:', error);
    res.status(500).json({
      success: false,
      message: '최근 본 글 추가 중 오류가 발생했습니다.'
    });
  }
};

// 찜 상태 확인
exports.checkWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT id FROM meetup_wishlists WHERE user_id = $1 AND meetup_id = $2',
      [userId, meetupId]
    );

    res.json({
      success: true,
      data: {
        isWishlisted: result.rows.length > 0
      }
    });

  } catch (error) {
    logger.error('찜 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '찜 상태 확인 중 오류가 발생했습니다.'
    });
  }
};

// 모임 리뷰 작성
exports.createReview = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { rating, comment, tags } = req.body;
    const userId = req.user.userId;

    logger.info('리뷰 작성 요청:', { meetupId, userId, rating });

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '평점은 1-5 사이의 값이어야 합니다' });
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

    // 사용자가 해당 모임에 참가했는지 확인
    const participantResult = await pool.query(
      "SELECT id FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2 AND status = '참가승인'",
      [meetupId, userId]
    );

    if (participantResult.rows.length === 0) {
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
    const reviewResult = await pool.query(`
      INSERT INTO reviews (
        meetup_id, reviewer_id, reviewee_id, rating, content, tags, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
      RETURNING id, meetup_id, reviewer_id, reviewee_id, rating, content, tags, created_at
    `, [meetupId, userId, meetup.host_id, rating, comment || '', JSON.stringify(tags || [])]);

    const review = reviewResult.rows[0];

    // 호스트의 평균 평점 업데이트
    const avgRatingResult = await pool.query(`
      SELECT AVG(r.rating) as avg_rating
      FROM reviews r
      JOIN meetups m ON r.meetup_id = m.id
      WHERE m.host_id = $1
    `, [meetup.host_id]);

    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;

    await pool.query(
      'UPDATE users SET rating = $1, updated_at = NOW() WHERE id = $2',
      [avgRating, meetup.host_id]
    );

    logger.info('리뷰 작성 완료:', { reviewId: review.id, rating, avgRating });

    res.status(201).json({
      success: true,
      data: {
        ...review,
        tags: typeof review.tags === 'string' ? JSON.parse(review.tags) : (review.tags || []),
      }
    });
  } catch (error) {
    logger.error('리뷰 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 리뷰 목록 조회
exports.getReviews = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    logger.info('리뷰 목록 조회 요청:', { meetupId, page, limit });

    const reviewsResult = await pool.query(`
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
    `, [meetupId, parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE meetup_id = $1',
      [meetupId]
    );

    const avgRatingResult = await pool.query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM reviews WHERE meetup_id = $1
    `, [meetupId]);

    const reviews = reviewsResult.rows.map(review => ({
      ...review,
      tags: typeof review.tags === 'string' ? JSON.parse(review.tags) : (review.tags || []),
    }));

    const total = parseInt(countResult.rows[0].total);
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;

    logger.info('리뷰 목록 조회 성공:', { count: reviews.length, avgRating });

    res.json({
      success: true,
      data: reviews,
      meta: {
        averageRating: avgRating,
        totalReviews: total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 확정/취소
exports.confirmMeetup = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;
    const { action } = req.body;

    logger.info('모임 확정/취소 요청:', { meetupId, userId, action });

    if (!action || !['confirm', 'cancel'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: '올바른 액션을 선택해주세요 (confirm/cancel).'
      });
    }

    const meetupResult = await pool.query(
      'SELECT * FROM meetups WHERE id = $1 AND host_id = $2',
      [meetupId, userId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없거나 호스트 권한이 없습니다.'
      });
    }

    const meetup = meetupResult.rows[0];
    let newStatus;

    if (action === 'confirm') {
      if (meetup.status === 'confirmed' || meetup.status === '모집완료') {
        return res.status(400).json({ success: false, error: '이미 확정된 약속입니다.' });
      }
      newStatus = '모집완료';
    } else {
      if (meetup.status === 'cancelled' || meetup.status === '취소') {
        return res.status(400).json({ success: false, error: '이미 취소된 약속입니다.' });
      }
      newStatus = '취소';
    }

    await pool.query(
      'UPDATE meetups SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, meetupId]
    );

    // 취소인 경우 참가자들에게 약속금 환불 처리
    if (action === 'cancel') {
      const participantsResult = await pool.query(`
        SELECT mp.user_id, pd.id as deposit_id, pd.amount
        FROM meetup_participants mp
        LEFT JOIN promise_deposits pd ON mp.meetup_id = pd.meetup_id AND mp.user_id = pd.user_id
        WHERE mp.meetup_id = $1 AND mp.status = '참가승인'
      `, [meetupId]);

      for (const participant of participantsResult.rows) {
        if (participant.deposit_id && participant.amount) {
          await pool.query(`
            UPDATE user_points
            SET available_points = available_points + $1,
                total_used = total_used - $1,
                updated_at = NOW()
            WHERE user_id = $2
          `, [participant.amount, participant.user_id]);

          await pool.query(`
            INSERT INTO point_transactions
            (user_id, transaction_type, amount, description, created_at)
            VALUES ($1, 'earned', $2, $3, NOW())
          `, [participant.user_id, participant.amount, `약속 취소로 인한 약속금 환불: ${meetup.title}`]);

          await pool.query(
            "UPDATE promise_deposits SET status = 'refunded', updated_at = NOW() WHERE id = $1",
            [participant.deposit_id]
          );
        }
      }
    }

    logger.info('모임 확정/취소 성공:', { meetupId, action, newStatus });

    res.json({
      success: true,
      message: action === 'confirm' ? '약속이 확정되었습니다.' : '약속이 취소되었습니다.',
      status: newStatus
    });
  } catch (error) {
    logger.error('모임 확정/취소 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
};

// GPS 체크인
exports.gpsCheckin = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.user.userId;

    logger.info('GPS 체크인 요청:', { meetupId, userId, latitude, longitude });

    if (!latitude || !longitude) {
      return res.status(400).json({ error: '위치 정보가 필요합니다' });
    }

    const meetupResult = await pool.query(
      'SELECT id, title, latitude, longitude, date, time, status FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '약속을 찾을 수 없습니다' });
    }

    const meetup = meetupResult.rows[0];

    // 참가자인지 확인
    const participantResult = await pool.query(
      "SELECT id FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2 AND status = '참가승인'",
      [meetupId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: '약속 참가자만 체크인할 수 있습니다' });
    }

    // 거리 계산
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(meetup.latitude),
      parseFloat(meetup.longitude)
    );

    logger.debug('거리 계산:', { distance: `${distance}m` });

    const MAX_DISTANCE = 100;
    if (distance > MAX_DISTANCE) {
      return res.status(400).json({
        error: `약속 장소에서 ${MAX_DISTANCE}m 이내에서만 체크인할 수 있습니다`,
        distance: Math.round(distance),
        maxDistance: MAX_DISTANCE
      });
    }

    // 출석 기록
    const existingAttendance = await pool.query(
      'SELECT id, status FROM attendances WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    let attendanceId;
    if (existingAttendance.rows.length > 0) {
      attendanceId = existingAttendance.rows[0].id;
      await pool.query(`
        UPDATE attendances
        SET attendance_type = 'gps', location_latitude = $1, location_longitude = $2,
            status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
        WHERE id = $3
      `, [latitude, longitude, attendanceId]);
    } else {
      const newAttendanceResult = await pool.query(`
        INSERT INTO attendances (meetup_id, user_id, attendance_type, location_latitude, location_longitude, status, confirmed_at)
        VALUES ($1, $2, 'gps', $3, $4, 'confirmed', NOW())
        RETURNING id
      `, [meetupId, userId, latitude, longitude]);
      attendanceId = newAttendanceResult.rows[0].id;
    }

    // meetup_participants에 attended 업데이트
    await pool.query(
      'UPDATE meetup_participants SET attended = true, attended_at = NOW() WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    logger.info('GPS 체크인 성공:', { meetupId, userId, attendanceId, distance });

    res.json({
      success: true,
      message: '체크인이 완료되었습니다!',
      data: {
        attendanceId,
        distance: Math.round(distance),
        checkedInAt: new Date()
      }
    });
  } catch (error) {
    logger.error('GPS 체크인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// QR 코드 생성 (호스트용)
exports.generateQRCode = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const meetupResult = await pool.query(
      'SELECT id, host_id, title FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '약속을 찾을 수 없습니다' });
    }

    if (meetupResult.rows[0].host_id !== userId) {
      return res.status(403).json({ error: '호스트만 QR 코드를 생성할 수 있습니다' });
    }

    const qrData = {
      meetupId,
      hostId: userId,
      timestamp: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10분 후 만료
      type: 'checkin'
    };

    const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

    res.json({
      success: true,
      data: {
        qrCodeData,
        expiresAt: qrData.expiresAt,
        meetupTitle: meetupResult.rows[0].title
      }
    });
  } catch (error) {
    logger.error('QR 코드 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// QR 코드 스캔 체크인
exports.qrCheckin = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { qrCodeData } = req.body;
    const userId = req.user.userId;

    if (!qrCodeData) {
      return res.status(400).json({ error: 'QR 코드 데이터가 필요합니다' });
    }

    try {
      const qrData = JSON.parse(Buffer.from(qrCodeData, 'base64').toString());

      if (qrData.meetupId !== meetupId) {
        return res.status(400).json({ error: '잘못된 QR 코드입니다' });
      }

      if (Date.now() > qrData.expiresAt) {
        return res.status(400).json({ error: 'QR 코드가 만료되었습니다' });
      }

      // 참가자인지 확인
      const participantResult = await pool.query(
        "SELECT id FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2 AND status = '참가승인'",
        [meetupId, userId]
      );

      if (participantResult.rows.length === 0) {
        return res.status(403).json({ error: '약속 참가자만 체크인할 수 있습니다' });
      }

      // 출석 기록
      await pool.query(`
        INSERT INTO attendances (meetup_id, user_id, attendance_type, qr_code_data, status, confirmed_at)
        VALUES ($1, $2, 'qr', $3, 'confirmed', NOW())
        ON CONFLICT (meetup_id, user_id) DO UPDATE SET
          attendance_type = 'qr', qr_code_data = $3, status = 'confirmed',
          confirmed_at = NOW(), updated_at = NOW()
      `, [meetupId, userId, qrCodeData]);

      // meetup_participants에 attended 업데이트
      await pool.query(
        'UPDATE meetup_participants SET attended = true, attended_at = NOW() WHERE meetup_id = $1 AND user_id = $2',
        [meetupId, userId]
      );

      logger.info('QR 체크인 성공:', { meetupId, userId });

      res.json({
        success: true,
        message: 'QR 코드 체크인이 완료되었습니다!'
      });
    } catch (parseError) {
      return res.status(400).json({ error: '잘못된 QR 코드 형식입니다' });
    }
  } catch (error) {
    logger.error('QR 체크인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 리뷰 가능한 참가자 목록
exports.getReviewableParticipants = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const meetupResult = await pool.query(
      'SELECT id, title, status, host_id FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '약속을 찾을 수 없습니다.'
      });
    }

    const meetup = meetupResult.rows[0];

    // 출석한 참가자 목록 조회 (본인 제외)
    const participantsResult = await pool.query(`
      SELECT
        u.id, u.name, u.profile_image,
        mp.attended, mp.attended_at,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END as already_reviewed
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN reviews r ON r.meetup_id = $1 AND r.reviewer_id = $2 AND r.reviewee_id = u.id
      WHERE mp.meetup_id = $1
      AND mp.status = '참가승인'
      AND mp.attended = true
      AND mp.user_id != $2
    `, [meetupId, userId]);

    // 호스트도 리뷰 대상에 포함
    let host = null;
    if (meetup.host_id !== userId) {
      const hostResult = await pool.query(`
        SELECT
          u.id, u.name, u.profile_image,
          CASE WHEN r.id IS NOT NULL THEN true ELSE false END as already_reviewed
        FROM users u
        LEFT JOIN reviews r ON r.meetup_id = $1 AND r.reviewer_id = $2 AND r.reviewee_id = u.id
        WHERE u.id = $3
      `, [meetupId, userId, meetup.host_id]);

      if (hostResult.rows.length > 0) {
        host = { ...hostResult.rows[0], isHost: true };
      }
    }

    const participants = participantsResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      profileImage: p.profile_image,
      attended: p.attended,
      attendedAt: p.attended_at,
      alreadyReviewed: p.already_reviewed,
      isHost: false
    }));

    const allParticipants = host ? [host, ...participants] : participants;

    res.json({
      success: true,
      meetup: { id: meetup.id, title: meetup.title, status: meetup.status },
      participants: allParticipants
    });
  } catch (error) {
    logger.error('리뷰 가능 참가자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '참가자 목록을 불러올 수 없습니다.'
    });
  }
};

// 호스트 출석 확인
exports.hostConfirmAttendance = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { participantId } = req.body;
    const hostId = req.user.userId;

    logger.info('호스트 확인 요청:', { meetupId, participantId, hostId });

    const meetupResult = await pool.query(
      'SELECT host_id FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '약속을 찾을 수 없습니다.' });
    }

    if (meetupResult.rows[0].host_id !== hostId) {
      return res.status(403).json({ success: false, message: '해당 약속의 호스트만 참석을 확인할 수 있습니다.' });
    }

    // 참가자 확인
    const participantResult = await pool.query(
      "SELECT id FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2 AND status = '참가승인'",
      [meetupId, participantId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '승인된 참가자가 아닙니다.' });
    }

    // 출석 기록
    await pool.query(`
      INSERT INTO attendances (meetup_id, user_id, attendance_type, status, confirmed_at)
      VALUES ($1, $2, 'host_confirm', 'confirmed', NOW())
      ON CONFLICT (meetup_id, user_id) DO UPDATE SET
        attendance_type = 'host_confirm', status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
    `, [meetupId, participantId]);

    await pool.query(
      'UPDATE meetup_participants SET attended = true, attended_at = NOW() WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, participantId]
    );

    logger.info('호스트 출석 확인 완료');

    res.json({
      success: true,
      message: '참가자의 출석이 확인되었습니다.'
    });
  } catch (error) {
    logger.error('호스트 출석 확인 오류:', error);
    res.status(500).json({ success: false, message: '호스트 출석 확인에 실패했습니다.' });
  }
};

// 참가자 출석 상태 조회 (호스트용)
exports.getAttendanceParticipants = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const hostId = req.user.userId;

    const meetupResult = await pool.query(
      'SELECT host_id, title, date, time FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '약속을 찾을 수 없습니다.' });
    }

    if (meetupResult.rows[0].host_id !== hostId) {
      return res.status(403).json({ success: false, message: '해당 약속의 호스트만 참가자를 확인할 수 있습니다.' });
    }

    const participantsResult = await pool.query(`
      SELECT
        u.id, u.name, u.profile_image,
        mp.status as participation_status, mp.joined_at, mp.attended,
        a.id as attendance_id, a.confirmed_at, a.attendance_type
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN attendances a ON mp.meetup_id = a.meetup_id AND mp.user_id = a.user_id
      WHERE mp.meetup_id = $1 AND mp.status = '참가승인'
      ORDER BY mp.joined_at ASC
    `, [meetupId]);

    const meetup = meetupResult.rows[0];
    const participants = participantsResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      profileImage: p.profile_image,
      participationStatus: p.participation_status,
      joinedAt: p.joined_at,
      attended: p.attended,
      attendance: p.attendance_id ? {
        id: p.attendance_id,
        confirmedAt: p.confirmed_at,
        method: p.attendance_type
      } : null
    }));

    res.json({
      success: true,
      meetup: { id: meetupId, title: meetup.title, date: meetup.date, time: meetup.time },
      participants,
      stats: {
        total: participants.length,
        attended: participants.filter(p => p.attended).length,
        notAttended: participants.filter(p => !p.attended).length
      }
    });
  } catch (error) {
    logger.error('참가자 출석 상태 조회 오류:', error);
    res.status(500).json({ success: false, message: '참가자 출석 상태 조회에 실패했습니다.' });
  }
};

// 상호 확인 (참가자들끼리 서로 출석 확인)
exports.mutualConfirmAttendance = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { targetUserId } = req.body;
    const confirmerId = req.user.userId;

    logger.info('상호 확인 요청:', { meetupId, targetUserId, confirmerId });

    // 두 사용자 모두 참가자인지 확인
    const participantsResult = await pool.query(
      "SELECT user_id FROM meetup_participants WHERE meetup_id = $1 AND user_id IN ($2, $3) AND status = '참가승인'",
      [meetupId, confirmerId, targetUserId]
    );

    if (participantsResult.rows.length !== 2) {
      return res.status(403).json({
        success: false,
        message: '두 사용자 모두 해당 약속의 승인된 참가자여야 합니다.'
      });
    }

    // 출석 기록
    await pool.query(`
      INSERT INTO attendances (meetup_id, user_id, attendance_type, status, confirmed_at)
      VALUES ($1, $2, 'mutual_confirm', 'confirmed', NOW())
      ON CONFLICT (meetup_id, user_id) DO UPDATE SET
        attendance_type = 'mutual_confirm', status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
    `, [meetupId, targetUserId]);

    await pool.query(
      'UPDATE meetup_participants SET attended = true, attended_at = NOW() WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, targetUserId]
    );

    logger.info('상호 확인 완료');

    res.json({
      success: true,
      message: '참가자의 출석이 상호 확인되었습니다.'
    });
  } catch (error) {
    logger.error('상호 확인 오류:', error);
    res.status(500).json({ success: false, message: '상호 확인에 실패했습니다.' });
  }
};

// 모임 위치 인증
exports.verifyLocation = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: '위치 정보가 필요합니다.'
      });
    }

    // 모임 정보 및 참가 여부 확인
    const meetupResult = await pool.query(`
      SELECT m.*, mp.id as participant_id
      FROM meetups m
      JOIN meetup_participants mp ON m.id = mp.meetup_id
      WHERE m.id = $1 AND mp.user_id = $2 AND mp.status = '참가승인'
    `, [meetupId, userId]);

    if (meetupResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '참가 승인된 약속만 위치 인증이 가능합니다.'
      });
    }

    const meetup = meetupResult.rows[0];
    const meetupLatitude = meetup.latitude || 37.5665;
    const meetupLongitude = meetup.longitude || 126.9780;

    const distance = calculateDistance(latitude, longitude, meetupLatitude, meetupLongitude);
    const maxDistance = 100;
    const isVerified = distance <= maxDistance;

    // 위치 인증 기록 저장
    await pool.query(`
      INSERT INTO location_verifications (
        id, meetup_id, user_id, latitude, longitude, accuracy, distance, verified, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
      )
    `, [meetupId, userId, latitude, longitude, accuracy, Math.round(distance), isVerified]);

    const message = isVerified
      ? `약속 장소 인증 성공! (${Math.round(distance)}m 거리)`
      : `약속 장소에서 너무 멀리 있습니다. (${Math.round(distance)}m 거리, 최대 ${maxDistance}m)`;

    res.json({
      success: true,
      verified: isVerified,
      distance: Math.round(distance),
      maxDistance,
      accuracy,
      message
    });

  } catch (error) {
    logger.error('모임 위치 인증 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
};

// 상호 확인 가능한 참가자 목록 조회
exports.getConfirmableParticipants = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    // 해당 사용자가 승인된 참가자인지 확인
    const participantCheck = await pool.query(
      'SELECT id FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2 AND status IN ($3, $4)',
      [meetupId, userId, 'approved', '참가승인']
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: '해당 약속의 승인된 참가자가 아닙니다.'
      });
    }

    const participantsResult = await pool.query(`
      SELECT DISTINCT
        u.id, u.name, u.profile_image,
        mp.joined_at,
        CASE WHEN mc1.id IS NOT NULL THEN true ELSE false END as confirmed_by_me,
        CASE WHEN mc2.id IS NOT NULL THEN true ELSE false END as confirmed_by_them,
        CASE WHEN mc1.id IS NOT NULL AND mc2.id IS NOT NULL THEN true ELSE false END as mutually_confirmed
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN mutual_confirmations mc1 ON (
        mc1.meetup_id = $1 AND mc1.confirmer_id = $2 AND mc1.target_user_id = u.id
      )
      LEFT JOIN mutual_confirmations mc2 ON (
        mc2.meetup_id = $1 AND mc2.confirmer_id = u.id AND mc2.target_user_id = $2
      )
      WHERE mp.meetup_id = $1
      AND mp.status IN ('approved', '참가승인')
      AND u.id != $2
      ORDER BY mp.joined_at ASC
    `, [meetupId, userId]);

    const participants = participantsResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      profileImage: p.profile_image,
      joinedAt: p.joined_at,
      confirmation: {
        confirmedByMe: p.confirmed_by_me,
        confirmedByThem: p.confirmed_by_them,
        mutuallyConfirmed: p.mutually_confirmed
      }
    }));

    res.json({
      success: true,
      participants,
      stats: {
        total: participants.length,
        confirmedByMe: participants.filter(p => p.confirmation.confirmedByMe).length,
        confirmedByThem: participants.filter(p => p.confirmation.confirmedByThem).length,
        mutuallyConfirmed: participants.filter(p => p.confirmation.mutuallyConfirmed).length
      }
    });

  } catch (error) {
    logger.error('상호 확인 가능 참가자 조회 오류:', error);
    res.status(500).json({ success: false, message: '참가자 목록 조회에 실패했습니다.' });
  }
};

// 노쇼 패널티 적용
exports.applyNoShowPenalties = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: meetupId } = req.params;
    const hostId = req.user.userId;

    // 호스트 권한 확인
    const meetupResult = await client.query(
      'SELECT host_id, title, price, date, time FROM meetups WHERE id = $1',
      [meetupId]
    );

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '약속을 찾을 수 없습니다.' });
    }

    const meetup = meetupResult.rows[0];
    if (meetup.host_id !== hostId) {
      return res.status(403).json({
        success: false,
        message: '해당 약속의 호스트만 노쇼 패널티를 적용할 수 있습니다.'
      });
    }

    await client.query('BEGIN');

    // 승인된 참가자 중 출석하지 않은 사용자 조회
    const noShowParticipantsResult = await client.query(`
      SELECT mp.user_id, u.name, u.email
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN attendances a ON mp.meetup_id = a.meetup_id AND mp.user_id = a.user_id
      WHERE mp.meetup_id = $1
      AND mp.status IN ('approved', '참가승인')
      AND a.id IS NULL
    `, [meetupId]);

    const noShowParticipants = noShowParticipantsResult.rows;
    const penaltyAmount = meetup.price || 1000;
    let appliedPenalties = 0;

    for (const participant of noShowParticipants) {
      const existingPenalty = await client.query(`
        SELECT id FROM point_transactions
        WHERE user_id = $1 AND meetup_id = $2 AND type = 'penalty' AND description LIKE '%노쇼%'
      `, [participant.user_id, meetupId]);

      if (existingPenalty.rows.length === 0) {
        await client.query(`
          INSERT INTO point_transactions (
            id, user_id, type, amount, description, meetup_id, status, created_at
          ) VALUES (
            gen_random_uuid(), $1, 'penalty', $2, '노쇼 패널티', $3, 'completed', NOW()
          )
        `, [participant.user_id, penaltyAmount, meetupId]);

        await client.query(
          'UPDATE users SET points = GREATEST(COALESCE(points, 0) - $1, 0) WHERE id = $2',
          [penaltyAmount, participant.user_id]
        );

        appliedPenalties++;
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${appliedPenalties}명에게 노쇼 패널티가 적용되었습니다.`,
      appliedPenalties,
      penaltyAmount,
      noShowParticipants: noShowParticipants.map(p => ({ userId: p.user_id, name: p.name }))
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('노쇼 패널티 적용 오류:', error);
    res.status(500).json({ success: false, message: '노쇼 패널티 적용에 실패했습니다.' });
  } finally {
    client.release();
  }
};

// QR코드 조회 (호스트용)
exports.getQRCode = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const hostCheck = await pool.query('SELECT host_id FROM meetups WHERE id = $1', [meetupId]);

    if (hostCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '약속을 찾을 수 없습니다.' });
    }

    if (hostCheck.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '해당 약속의 호스트만 QR코드를 생성할 수 있습니다.'
      });
    }

    const qrData = {
      meetupId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000)
    };

    res.json({
      success: true,
      qrCode: JSON.stringify(qrData),
      expiresAt: qrData.expiresAt,
      expiresIn: '10분'
    });

  } catch (error) {
    logger.error('QR코드 생성 오류:', error);
    res.status(500).json({ success: false, message: 'QR코드 생성에 실패했습니다.' });
  }
};

// QR코드 스캔 체크인
exports.qrScanCheckin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: meetupId } = req.params;
    const { qrCodeData } = req.body;
    const userId = req.user.userId;

    let qrData;
    try {
      qrData = JSON.parse(qrCodeData);
    } catch (err) {
      return res.status(400).json({ success: false, message: '올바르지 않은 QR코드입니다.' });
    }

    if (qrData.meetupId !== meetupId) {
      return res.status(400).json({ success: false, message: '다른 약속의 QR코드입니다.' });
    }

    if (Date.now() > qrData.expiresAt) {
      return res.status(400).json({ success: false, message: 'QR코드가 만료되었습니다.' });
    }

    // 참가자 확인
    const participantCheck = await client.query(`
      SELECT id FROM meetup_participants
      WHERE meetup_id = $1 AND user_id = $2 AND status IN ('approved', '참가승인')
    `, [meetupId, userId]);

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: '해당 약속의 승인된 참가자가 아닙니다.' });
    }

    await client.query('BEGIN');

    await client.query(`
      INSERT INTO attendances (meetup_id, user_id, attendance_type, status, confirmed_at)
      VALUES ($1, $2, 'qr_scan', 'confirmed', NOW())
      ON CONFLICT (meetup_id, user_id) DO UPDATE SET
        attendance_type = 'qr_scan', status = 'confirmed', confirmed_at = NOW()
    `, [meetupId, userId]);

    await client.query(`
      UPDATE meetup_participants SET attended = true, attended_at = NOW()
      WHERE meetup_id = $1 AND user_id = $2
    `, [meetupId, userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'QR코드 체크인이 완료되었습니다.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('QR 스캔 체크인 오류:', error);
    res.status(500).json({ success: false, message: 'QR코드 체크인에 실패했습니다.' });
  } finally {
    client.release();
  }
};

// 모임 진행 확인 요청 (호스트용)
exports.progressCheck = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    const meetupResult = await pool.query('SELECT host_id FROM meetups WHERE id = $1', [meetupId]);

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '약속을 찾을 수 없습니다.' });
    }

    if (meetupResult.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '약속 호스트만 진행 확인을 요청할 수 있습니다.'
      });
    }

    const participantsResult = await pool.query(`
      SELECT user_id FROM meetup_participants WHERE meetup_id = $1 AND status IN ('approved', '참가승인')
    `, [meetupId]);

    const notifications = participantsResult.rows.map(p => [
      p.user_id,
      'meetup_progress_check',
      '약속 진행 확인',
      '약속이 예정대로 진행되었나요? 참석 여부를 알려주세요.',
      meetupId,
      userId,
      JSON.stringify({ meetupId, requestedBy: userId })
    ]);

    if (notifications.length > 0) {
      const placeholders = notifications.map((_, i) =>
        `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7}, false, NOW())`
      ).join(', ');

      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, meetup_id, related_user_id, data, is_read, created_at)
        VALUES ${placeholders}
      `, notifications.flat());
    }

    res.json({
      success: true,
      message: '참가자들에게 진행 확인 요청을 보냈습니다.',
      notificationsSent: notifications.length
    });

  } catch (error) {
    logger.error('모임 진행 확인 요청 오류:', error);
    res.status(500).json({ success: false, error: '진행 확인 요청 중 오류가 발생했습니다.' });
  }
};

// 모임 진행 응답 (참가자용)
exports.progressResponse = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;
    const { attended, notes } = req.body;

    const participantResult = await pool.query(`
      SELECT id FROM meetup_participants
      WHERE meetup_id = $1 AND user_id = $2 AND status IN ('approved', '참가승인')
    `, [meetupId, userId]);

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: '해당 약속의 참가자가 아닙니다.' });
    }

    await pool.query(`
      INSERT INTO attendances (meetup_id, user_id, attendance_type, status, notes)
      VALUES ($1, $2, 'self_report', $3, $4)
      ON CONFLICT (meetup_id, user_id)
      DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
    `, [meetupId, userId, attended ? 'confirmed' : 'denied', notes || null]);

    res.json({
      success: true,
      message: '진행 여부 응답이 기록되었습니다.'
    });

  } catch (error) {
    logger.error('모임 진행 응답 오류:', error);
    res.status(500).json({ success: false, error: '진행 응답 처리 중 오류가 발생했습니다.' });
  }
};

// 찜 추가
exports.addWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    // 이미 찜했는지 확인
    const existingResult = await pool.query(
      'SELECT id FROM meetup_wishlists WHERE user_id = $1 AND meetup_id = $2',
      [userId, meetupId]
    );

    if (existingResult.rows.length > 0) {
      return res.json({
        success: true,
        message: '이미 찜한 약속입니다.',
        isWishlisted: true
      });
    }

    // 찜 추가
    await pool.query(
      'INSERT INTO meetup_wishlists (user_id, meetup_id, created_at) VALUES ($1, $2, NOW())',
      [userId, meetupId]
    );

    res.json({
      success: true,
      message: '찜 목록에 추가되었습니다.',
      isWishlisted: true
    });

  } catch (error) {
    logger.error('찜 추가 오류:', error);
    res.status(500).json({ success: false, message: '찜 추가 중 오류가 발생했습니다.' });
  }
};

// 찜 삭제
exports.removeWishlist = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    await pool.query(
      'DELETE FROM meetup_wishlists WHERE user_id = $1 AND meetup_id = $2',
      [userId, meetupId]
    );

    res.json({
      success: true,
      message: '찜 목록에서 삭제되었습니다.',
      isWishlisted: false
    });

  } catch (error) {
    logger.error('찜 삭제 오류:', error);
    res.status(500).json({ success: false, message: '찜 삭제 중 오류가 발생했습니다.' });
  }
};

// 모임 참가 취소 (POST 버전)
exports.leaveMeetupPost = async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;

    // 참가 기록 확인
    const participantResult = await pool.query(
      'SELECT id, status FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '참가 기록을 찾을 수 없습니다.'
      });
    }

    // 참가 취소
    await pool.query(
      'DELETE FROM meetup_participants WHERE meetup_id = $1 AND user_id = $2',
      [meetupId, userId]
    );

    // 현재 참가자 수 감소
    await pool.query(
      'UPDATE meetups SET current_participants = GREATEST(current_participants - 1, 0) WHERE id = $1',
      [meetupId]
    );

    res.json({
      success: true,
      message: '약속 참가가 취소되었습니다.'
    });

  } catch (error) {
    logger.error('모임 참가 취소 오류:', error);
    res.status(500).json({ success: false, message: '참가 취소 중 오류가 발생했습니다.' });
  }
};
