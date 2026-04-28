const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const logger = require('../../config/logger');

// 관리자 로그인
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const admin = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, admin.password || admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '아이디 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 마지막 로그인 시간 업데이트
    await pool.query(
      'UPDATE admins SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    logger.error('관리자 로그인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 대시보드 통계 (종합)
exports.getDashboardStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // All counts in one query for efficiency
    const countsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as today_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as week_users,
        (SELECT COUNT(*) FROM meetups) as total_meetups,
        (SELECT COUNT(*) FROM meetups WHERE created_at >= CURRENT_DATE) as today_meetups,
        (SELECT COUNT(*) FROM meetups WHERE status IN ('모집중', '모집완료')) as active_meetups,
        (SELECT COUNT(*) FROM meetups WHERE status = '종료') as completed_meetups,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews) as avg_rating,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'pending')) as pending_support,
        (SELECT COUNT(*) FROM promise_deposits WHERE status = 'paid') as active_deposits,
        (SELECT COALESCE(SUM(amount), 0) FROM promise_deposits WHERE status = 'paid') as total_deposit_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM platform_revenues) as total_revenue,
        (SELECT COUNT(*) FROM user_badges) as total_badges_awarded,
        (SELECT COUNT(*) FROM advertisements WHERE is_active = true) as active_ads
    `);

    // Daily trends
    const trendsResult = await pool.query(`
      SELECT
        d::date as date,
        COALESCE((SELECT COUNT(*) FROM users WHERE DATE(created_at) = d::date), 0) as new_users,
        COALESCE((SELECT COUNT(*) FROM meetups WHERE DATE(created_at) = d::date), 0) as new_meetups,
        COALESCE((SELECT COUNT(*) FROM meetups WHERE DATE(updated_at) = d::date AND status = '종료'), 0) as completed_meetups,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE DATE(created_at) = d::date), 0) as new_reviews
      FROM generate_series(
        CURRENT_DATE - ($1 || ' days')::interval,
        CURRENT_DATE,
        '1 day'::interval
      ) d
      ORDER BY d
    `, [days]);

    res.json({
      success: true,
      stats: countsResult.rows[0],
      trends: trendsResult.rows
    });
  } catch (error) {
    logger.error('대시보드 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 목록
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'blocked') {
      whereConditions.push('is_blocked = true');
    } else if (status === 'active') {
      whereConditions.push('is_blocked = false');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT id, email, name, profile_image, provider, is_verified, is_blocked, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      }
    });

  } catch (error) {
    logger.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 상세 조회
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    logger.error('사용자 상세 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 정보 수정
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const ALLOWED_FIELDS = ['name', 'bio', 'phone', 'gender', 'is_active', 'babal_score', 'profile_image', 'is_verified'];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && ALLOWED_FIELDS.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
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
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    logger.error('사용자 수정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 차단
exports.blockUser = async (req, res) => {
  try {
    const id = req.params.id || req.params.userId;
    const { reason } = req.body;

    await pool.query(
      'UPDATE users SET is_blocked = true, blocked_reason = $2, blocked_at = NOW() WHERE id = $1',
      [id, reason]
    );

    res.json({
      success: true,
      message: '사용자가 차단되었습니다.'
    });

  } catch (error) {
    logger.error('사용자 차단 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 사용자 차단 해제
exports.unblockUser = async (req, res) => {
  try {
    const id = req.params.id || req.params.userId;

    await pool.query(
      'UPDATE users SET is_blocked = false, blocked_reason = NULL, blocked_at = NULL WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: '사용자 차단이 해제되었습니다.'
    });

  } catch (error) {
    logger.error('사용자 차단 해제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 목록
exports.getMeetups = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`title ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
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
      SELECT m.*, u.name as host_name
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    res.json({
      success: true,
      meetups: result.rows
    });

  } catch (error) {
    logger.error('모임 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 상세 조회
exports.getMeetupById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT m.*, u.name as host_name, u.email as host_email
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

    res.json({
      success: true,
      meetup: result.rows[0]
    });

  } catch (error) {
    logger.error('모임 상세 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 수정
exports.updateMeetup = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE meetups SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({
      success: true,
      meetup: result.rows[0]
    });

  } catch (error) {
    logger.error('모임 수정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모임 삭제
exports.deleteMeetup = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM meetups WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '약속이 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('모임 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 신고 목록
exports.getReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [parseInt(limit), offset];

    if (status) {
      whereClause = 'WHERE r.status = $3';
      params.push(status);
    }

    const result = await pool.query(`
      SELECT
        r.*,
        reporter.name as reporter_name,
        reported.name as reported_user_name
      FROM reports r
      LEFT JOIN users reporter ON r.reporter_id = reporter.id
      LEFT JOIN users reported ON r.reported_user_id = reported.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    res.json({
      success: true,
      reports: result.rows
    });

  } catch (error) {
    logger.error('신고 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 신고 처리
exports.handleReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    await pool.query(`
      UPDATE reports
      SET status = $1, admin_note = $2, handled_at = NOW()
      WHERE id = $3
    `, [status, adminNote, id]);

    res.json({
      success: true,
      message: '신고가 처리되었습니다.'
    });

  } catch (error) {
    logger.error('신고 처리 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 공지사항 목록
exports.getNotices = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT * FROM notices
      WHERE is_active = true
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    res.json({
      success: true,
      notices: result.rows
    });

  } catch (error) {
    logger.error('공지사항 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 공지사항 작성
exports.createNotice = async (req, res) => {
  try {
    const { title, content, isPinned } = req.body;
    const adminId = req.admin.id;

    const result = await pool.query(`
      INSERT INTO notices (title, content, is_pinned, admin_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [title, content, isPinned || false, adminId]);

    res.status(201).json({
      success: true,
      notice: result.rows[0]
    });

  } catch (error) {
    logger.error('공지사항 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 공지사항 수정
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isPinned, isActive } = req.body;

    const result = await pool.query(`
      UPDATE notices
      SET title = $1, content = $2, is_pinned = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [title, content, isPinned, isActive, id]);

    res.json({
      success: true,
      notice: result.rows[0]
    });

  } catch (error) {
    logger.error('공지사항 수정 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 공지사항 삭제
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM notices WHERE id = $1', [id]);

    res.json({
      success: true,
      message: '공지사항이 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('공지사항 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 관리자 로그아웃
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '관리자 로그아웃 완료'
    });
  } catch (error) {
    logger.error('관리자 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: '로그아웃 중 오류가 발생했습니다.'
    });
  }
};

// 관리자 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      admin: {
        id: req.admin.id,
        username: req.admin.username,
        email: req.admin.email,
        role: req.admin.role
      }
    });
  } catch (error) {
    logger.error('관리자 프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로필 조회 중 오류가 발생했습니다.'
    });
  }
};

// 시스템 설정 조회 (DB 기반)
exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM system_settings');
    const settings = {};
    for (const row of result.rows) {
      const val = row.value;
      if (val === 'true') settings[row.key] = true;
      else if (val === 'false') settings[row.key] = false;
      else if (!isNaN(val) && val !== '') settings[row.key] = Number(val);
      else settings[row.key] = val;
    }

    // Map snake_case to camelCase for frontend
    const mapped = {
      maintenanceMode: settings.maintenance_mode ?? false,
      allowNewSignups: settings.allow_new_signups ?? true,
      maxMeetupParticipants: settings.max_meetup_participants ?? 4,
      meetupCreationCooldown: settings.meetup_creation_cooldown ?? 60,
      autoApprovalEnabled: settings.auto_approval_enabled ?? true,
      emailNotificationsEnabled: settings.email_notifications_enabled ?? true,
      smsNotificationsEnabled: settings.sms_notifications_enabled ?? false,
      depositAmount: settings.deposit_amount ?? 3000,
      platformFee: settings.platform_fee ?? 0
    };

    res.json({ success: true, data: mapped });
  } catch (error) {
    logger.error('시스템 설정 조회 오류:', error);
    // Fallback to defaults if table doesn't exist
    res.json({
      success: true,
      data: {
        maintenanceMode: false, allowNewSignups: true,
        maxMeetupParticipants: 4, meetupCreationCooldown: 60,
        autoApprovalEnabled: true, emailNotificationsEnabled: true,
        smsNotificationsEnabled: false, depositAmount: 3000, platformFee: 0
      }
    });
  }
};

// 시스템 설정 저장 (DB 기반)
exports.updateSettings = async (req, res) => {
  try {
    const keyMap = {
      maintenanceMode: 'maintenance_mode',
      allowNewSignups: 'allow_new_signups',
      maxMeetupParticipants: 'max_meetup_participants',
      meetupCreationCooldown: 'meetup_creation_cooldown',
      autoApprovalEnabled: 'auto_approval_enabled',
      emailNotificationsEnabled: 'email_notifications_enabled',
      smsNotificationsEnabled: 'sms_notifications_enabled',
      depositAmount: 'deposit_amount',
      platformFee: 'platform_fee'
    };

    const updates = req.body;
    const adminId = req.admin.id;

    for (const [camelKey, value] of Object.entries(updates)) {
      const dbKey = keyMap[camelKey];
      if (dbKey) {
        await pool.query(
          `INSERT INTO system_settings (key, value, updated_by, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
          [dbKey, String(value), adminId]
        );
      }
    }

    res.json({ success: true, message: '시스템 설정이 저장되었습니다.' });
  } catch (error) {
    logger.error('시스템 설정 저장 오류:', error);
    res.status(500).json({ success: false, error: '시스템 설정 저장 중 오류가 발생했습니다.' });
  }
};

// 공지사항 고정 상태 변경
exports.pinNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_pinned } = req.body;

    await pool.query(`
      UPDATE notices
      SET is_pinned = $1, updated_at = NOW()
      WHERE id = $2
    `, [is_pinned, id]);

    res.json({
      success: true,
      message: `공지사항이 ${is_pinned ? '고정' : '고정 해제'}되었습니다.`
    });
  } catch (error) {
    logger.error('공지사항 고정 상태 변경 오류:', error);
    res.status(500).json({ success: false, error: '고정 상태 변경에 실패했습니다.' });
  }
};

// 차단된 사용자 목록 조회
exports.getBlockedUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    logger.debug('관리자 차단 회원 목록 조회:', { page, limit, search });

    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT
        ub.id as block_id, ub.blocked_user_id, ub.reason, ub.blocked_at,
        u.id, u.name, u.email, u.provider, u.profile_image, u.created_at as user_created_at,
        COUNT(*) OVER() as total_count
      FROM user_blocked_users ub
      JOIN users u ON ub.blocked_user_id = u.id
      ${whereClause}
      ORDER BY ub.blocked_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    const blockedUsers = result.rows.map(row => ({
      block_id: row.block_id,
      reason: row.reason,
      blocked_at: row.blocked_at,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        provider: row.provider,
        profile_image: row.profile_image,
        created_at: row.user_created_at
      }
    }));

    res.json({
      success: true,
      data: blockedUsers,
      pagination: {
        page, limit, totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    logger.error('차단 회원 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '차단 회원 목록 조회 중 오류가 발생했습니다.' });
  }
};

// 차단 통계 조회
exports.getBlockingStats = async (req, res) => {
  try {
    const period = parseInt(req.query.period) || 30;

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_blocks,
        COUNT(CASE WHEN blocked_at > NOW() - INTERVAL '24 hours' THEN 1 END) as blocks_today,
        COUNT(CASE WHEN blocked_at > NOW() - INTERVAL '7 days' THEN 1 END) as blocks_this_week
      FROM user_blocked_users
    `);

    res.json({
      success: true,
      data: {
        period_days: period,
        general_stats: statsResult.rows[0]
      }
    });
  } catch (error) {
    logger.error('차단 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '차단 통계 조회 중 오류가 발생했습니다.' });
  }
};

// 관리자 계정 목록 조회
exports.getAccounts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT id, username, email, role, is_active, last_login, created_at
      FROM admins
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) as total FROM admins');

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page, limit,
        totalCount: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    logger.error('관리자 계정 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '관리자 계정 목록 조회에 실패했습니다.' });
  }
};

// 관리자 계정 생성
exports.createAccount = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    const existingResult = await pool.query(
      'SELECT id FROM admins WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 존재하는 계정입니다.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO admins (username, email, password, role, is_active, created_at)
      VALUES ($1, $2, $3, $4, true, NOW())
      RETURNING id, username, email, role, created_at
    `, [username, email, passwordHash, role || 'admin']);

    res.status(201).json({
      success: true,
      message: '관리자 계정이 생성되었습니다.',
      admin: result.rows[0]
    });
  } catch (error) {
    logger.error('관리자 계정 생성 오류:', error);
    res.status(500).json({ success: false, error: '관리자 계정 생성에 실패했습니다.' });
  }
};

// 관리자 계정 수정
exports.updateAccount = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { email, role, is_active } = req.body;

    const result = await pool.query(`
      UPDATE admins
      SET email = COALESCE($1, email),
          role = COALESCE($2, role),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, username, email, role, is_active
    `, [email, role, is_active, adminId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '관리자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '관리자 계정이 수정되었습니다.',
      admin: result.rows[0]
    });
  } catch (error) {
    logger.error('관리자 계정 수정 오류:', error);
    res.status(500).json({ success: false, error: '관리자 계정 수정에 실패했습니다.' });
  }
};

// 관리자 비밀번호 변경
exports.updateAccountPassword = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '비밀번호는 6자 이상이어야 합니다.'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE admins SET password = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, adminId]
    );

    res.json({
      success: true,
      message: '비밀번호가 변경되었습니다.'
    });
  } catch (error) {
    logger.error('관리자 비밀번호 변경 오류:', error);
    res.status(500).json({ success: false, error: '비밀번호 변경에 실패했습니다.' });
  }
};

// 관리자 계정 삭제
exports.deleteAccount = async (req, res) => {
  try {
    const { adminId } = req.params;

    // 자기 자신은 삭제 불가
    if (req.admin.id === adminId) {
      return res.status(400).json({
        success: false,
        error: '자기 자신의 계정은 삭제할 수 없습니다.'
      });
    }

    await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);

    res.json({
      success: true,
      message: '관리자 계정이 삭제되었습니다.'
    });
  } catch (error) {
    logger.error('관리자 계정 삭제 오류:', error);
    res.status(500).json({ success: false, error: '관리자 계정 삭제에 실패했습니다.' });
  }
};

// 사용자 상세 정보 조회 (관리자용)
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    // 추가 통계 정보
    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM meetups WHERE host_id = $1) as hosted_meetups,
        (SELECT COUNT(*) FROM meetup_participants WHERE user_id = $1) as joined_meetups,
        (SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1) as reviews_written,
        (SELECT COALESCE(available_points, 0) FROM user_points WHERE user_id = $1) as points
    `, [userId]);

    res.json({
      success: true,
      user: userResult.rows[0],
      stats: statsResult.rows[0]
    });
  } catch (error) {
    logger.error('사용자 상세 정보 조회 오류:', error);
    res.status(500).json({ success: false, error: '사용자 정보 조회에 실패했습니다.' });
  }
};

// 사용자 포인트 지급/차감
exports.updateUserPoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, type, description } = req.body;

    if (!amount || !type || !['add', 'subtract'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '올바른 금액과 유형을 입력해주세요.'
      });
    }

    const pointAmount = parseInt(amount);
    const operator = type === 'add' ? '+' : '-';

    await pool.query(`
      INSERT INTO user_points (user_id, total_points, available_points, used_points)
      VALUES ($1, $2, $2, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        available_points = user_points.available_points ${operator} $2,
        total_points = CASE WHEN '${type}' = 'add' THEN user_points.total_points + $2 ELSE user_points.total_points END,
        updated_at = NOW()
    `, [userId, pointAmount]);

    await pool.query(`
      INSERT INTO point_transactions (user_id, type, amount, description, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [userId, type === 'add' ? 'earned' : 'used', pointAmount, description || '관리자 조정']);

    res.json({
      success: true,
      message: `포인트가 ${type === 'add' ? '지급' : '차감'}되었습니다.`
    });
  } catch (error) {
    logger.error('사용자 포인트 수정 오류:', error);
    res.status(500).json({ success: false, error: '포인트 수정에 실패했습니다.' });
  }
};

// 챗봇 설정 조회
exports.getChatbotSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chatbot_settings ORDER BY created_at DESC LIMIT 10');

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('챗봇 설정 조회 오류:', error);
    res.status(500).json({ success: false, error: '챗봇 설정 조회에 실패했습니다.' });
  }
};

// 챗봇 설정 수정
exports.updateChatbotSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { keyword, response, is_active } = req.body;

    const result = await pool.query(`
      UPDATE chatbot_settings
      SET keyword = COALESCE($1, keyword),
          response = COALESCE($2, response),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [keyword, response, is_active, id]);

    res.json({
      success: true,
      message: '챗봇 설정이 수정되었습니다.',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('챗봇 설정 수정 오류:', error);
    res.status(500).json({ success: false, error: '챗봇 설정 수정에 실패했습니다.' });
  }
};

// 실시간 통계 조회 (종합)
exports.getRealtimeStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 hour') as new_users_hour,
        (SELECT COUNT(DISTINCT user_id) FROM meetup_participants WHERE joined_at > NOW() - INTERVAL '24 hours') as active_users_day,
        (SELECT COUNT(*) FROM meetups) as total_meetups,
        (SELECT COUNT(*) FROM meetups WHERE status IN ('모집중', '모집완료')) as active_meetups,
        (SELECT COUNT(*) FROM meetups WHERE created_at > NOW() - INTERVAL '1 hour') as new_meetups_hour,
        (SELECT COUNT(*) FROM chat_rooms) as total_chat_rooms,
        (SELECT COUNT(DISTINCT cr.id) FROM chat_rooms cr JOIN chat_messages cm ON cr.id = cm."chatRoomId" WHERE cm."createdAt" > NOW() - INTERVAL '24 hours') as active_chat_rooms,
        (SELECT COALESCE(SUM(amount), 0) FROM platform_revenues) as total_revenue,
        (SELECT COUNT(*) FROM advertisements) as total_ads,
        (SELECT COUNT(*) FROM advertisements WHERE is_active = true) as active_ads,
        (SELECT COALESCE(SUM(available_points), 0) FROM user_points) as total_points,
        (SELECT COUNT(*) FROM promise_deposits WHERE status = 'pending') as pending_deposits,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'pending')) as pending_support
    `);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        systemHealth: 'healthy'
      }
    });
  } catch (error) {
    logger.error('실시간 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '실시간 통계 조회에 실패했습니다.' });
  }
};

// 통계 리포트 조회
exports.getStatReports = async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    let query;
    switch (type) {
      case 'users':
        query = `SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at BETWEEN $1 AND $2 GROUP BY DATE(created_at) ORDER BY date`;
        break;
      case 'meetups':
        query = `SELECT DATE(created_at) as date, COUNT(*) as count FROM meetups WHERE created_at BETWEEN $1 AND $2 GROUP BY DATE(created_at) ORDER BY date`;
        break;
      case 'points':
        query = `SELECT DATE(created_at) as date, SUM(amount) as total FROM point_transactions WHERE created_at BETWEEN $1 AND $2 GROUP BY DATE(created_at) ORDER BY date`;
        break;
      default:
        return res.status(400).json({ success: false, error: '지원하지 않는 리포트 유형입니다.' });
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    const result = await pool.query(query, [start, end]);

    res.json({
      success: true,
      type,
      data: result.rows
    });
  } catch (error) {
    logger.error('리포트 조회 오류:', error);
    res.status(500).json({ success: false, error: '리포트 조회에 실패했습니다.' });
  }
};

// 리뷰 삭제 (관리자)
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({
      success: true,
      message: '리뷰가 삭제되었습니다.'
    });
  } catch (error) {
    logger.error('리뷰 삭제 오류:', error);
    res.status(500).json({ success: false, error: '리뷰 삭제에 실패했습니다.' });
  }
};

// 대량 차단 해제
exports.bulkUnblock = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '차단 해제할 사용자 목록이 필요합니다.'
      });
    }

    await pool.query(
      'DELETE FROM user_blocked_users WHERE blocked_user_id = ANY($1)',
      [userIds]
    );

    res.json({
      success: true,
      message: `${userIds.length}명의 차단이 해제되었습니다.`
    });
  } catch (error) {
    logger.error('대량 차단 해제 오류:', error);
    res.status(500).json({ success: false, error: '대량 차단 해제에 실패했습니다.' });
  }
};

// 관리자 통계 조회 (간단 버전)
exports.getStats = async (req, res) => {
  try {
    const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    const totalMeetupsResult = await pool.query('SELECT COUNT(*) as count FROM meetups');
    const totalMeetups = parseInt(totalMeetupsResult.rows[0].count);

    const todayMeetupsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM meetups
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayMeetups = parseInt(todayMeetupsResult.rows[0].count);

    const activeMeetupsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM meetups
      WHERE status IN ('모집중', '모집완료', '진행중')
    `);
    const activeMeetups = parseInt(activeMeetupsResult.rows[0].count);

    res.json({
      totalUsers,
      totalMeetups,
      todayMeetups,
      activeMeetups
    });
  } catch (error) {
    logger.error('관리자 통계 조회 오류:', error);
    res.status(500).json({ message: '통계 조회 중 오류가 발생했습니다.' });
  }
};

// 리포트 다운로드 (CSV)
exports.downloadReports = async (req, res) => {
  try {
    const { type } = req.params;

    const reportData = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);

      if (type === 'daily') {
        date.setDate(date.getDate() - i);
      } else if (type === 'weekly') {
        date.setDate(date.getDate() - (i * 7));
      } else if (type === 'monthly') {
        date.setMonth(date.getMonth() - i);
      }

      const startDate = new Date(date);
      const endDate = new Date(date);

      if (type === 'daily') {
        endDate.setDate(endDate.getDate() + 1);
      } else if (type === 'weekly') {
        endDate.setDate(endDate.getDate() + 7);
      } else if (type === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      try {
        const newUsersQuery = await pool.query(
          'SELECT COUNT(*) as count FROM users WHERE created_at >= $1 AND created_at < $2',
          [startDate.toISOString(), endDate.toISOString()]
        );

        const newMeetupsQuery = await pool.query(
          'SELECT COUNT(*) as count FROM meetups WHERE created_at >= $1 AND created_at < $2',
          [startDate.toISOString(), endDate.toISOString()]
        );

        const completedMeetupsQuery = await pool.query(
          'SELECT COUNT(*) as count FROM meetups WHERE status = $1 AND updated_at >= $2 AND updated_at < $3',
          ['종료', startDate.toISOString(), endDate.toISOString()]
        );

        const period = type === 'daily' ?
          date.toLocaleDateString('ko-KR') :
          type === 'weekly' ?
          `${date.toLocaleDateString('ko-KR')} 주` :
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const newUsers = parseInt(newUsersQuery.rows[0].count) || 0;
        const newMeetups = parseInt(newMeetupsQuery.rows[0].count) || 0;
        const completedMeetups = parseInt(completedMeetupsQuery.rows[0].count) || 0;

        reportData.push({
          period,
          newUsers,
          newMeetups,
          completedMeetups,
          activeUsers: Math.floor((newUsers + newMeetups) * 0.8)
        });
      } catch (queryError) {
        logger.error('리포트 쿼리 오류:', queryError);
      }
    }

    // CSV 형식으로 변환
    const csvHeader = '기간,신규 사용자,신규 밥약속,완료된 밥약속,활성 사용자\n';
    const csvRows = reportData.map(row =>
      `${row.period},${row.newUsers},${row.newMeetups},${row.completedMeetups},${row.activeUsers}`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv); // BOM for Korean characters

  } catch (error) {
    logger.error('리포트 다운로드 오류:', error);
    res.status(500).json({ success: false, error: '리포트 다운로드에 실패했습니다.' });
  }
};

// 모임 상세 조회 (관리자용)
exports.getMeetupDetails = async (req, res) => {
  try {
    const { meetupId } = req.params;

    const meetupResult = await pool.query(`
      SELECT m.*, u.name as host_name, u.email as host_email
      FROM meetups m
      JOIN users u ON m.host_id = u.id
      WHERE m.id = $1
    `, [meetupId]);

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속을 찾을 수 없습니다.'
      });
    }

    // 참가자 목록
    const participantsResult = await pool.query(`
      SELECT mp.*, u.name, u.email
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
    `, [meetupId]);

    res.json({
      success: true,
      meetup: meetupResult.rows[0],
      participants: participantsResult.rows
    });
  } catch (error) {
    logger.error('모임 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '약속 상세 조회에 실패했습니다.' });
  }
};

// 모임 상태 변경 (관리자 액션)
exports.updateMeetupAction = async (req, res) => {
  try {
    const { id, action } = req.params;

    let newStatus;
    switch (action) {
      case 'approve':
        newStatus = '모집중';
        break;
      case 'reject':
        newStatus = '반려';
        break;
      case 'suspend':
        newStatus = '중단';
        break;
      case 'restore':
        newStatus = '모집중';
        break;
      default:
        return res.status(400).json({ success: false, error: '지원하지 않는 액션입니다.' });
    }

    await pool.query(
      'UPDATE meetups SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `약속이 ${action === 'approve' ? '승인' : action === 'reject' ? '반려' : action === 'suspend' ? '중단' : '복원'}되었습니다.`
    });
  } catch (error) {
    logger.error('모임 상태 변경 오류:', error);
    res.status(500).json({ success: false, error: '약속 상태 변경에 실패했습니다.' });
  }
};

// 사용자 상태 변경 (관리자 액션)
exports.updateUserAction = async (req, res) => {
  try {
    const { id, action } = req.params;
    const { reason } = req.body;

    switch (action) {
      case 'ban':
        await pool.query(
          'UPDATE users SET is_banned = true, ban_reason = $1, banned_at = NOW() WHERE id = $2',
          [reason || '관리자에 의한 정지', id]
        );
        break;
      case 'unban':
        await pool.query(
          'UPDATE users SET is_banned = false, ban_reason = NULL, banned_at = NULL WHERE id = $1',
          [id]
        );
        break;
      case 'verify':
        await pool.query(
          'UPDATE users SET is_verified = true WHERE id = $1',
          [id]
        );
        break;
      case 'unverify':
        await pool.query(
          'UPDATE users SET is_verified = false WHERE id = $1',
          [id]
        );
        break;
      default:
        return res.status(400).json({ success: false, error: '지원하지 않는 액션입니다.' });
    }

    res.json({
      success: true,
      message: `사용자가 ${action === 'ban' ? '정지' : action === 'unban' ? '정지 해제' : action === 'verify' ? '인증' : '인증 해제'}되었습니다.`
    });
  } catch (error) {
    logger.error('사용자 상태 변경 오류:', error);
    res.status(500).json({ success: false, error: '사용자 상태 변경에 실패했습니다.' });
  }
};

// 대시보드 통계 수집
exports.collectDashboardStats = async (req, res) => {
  try {
    // 통계 데이터 수집 및 저장 (캐싱 또는 집계 테이블에)
    const stats = {
      collectedAt: new Date(),
      totalUsers: 0,
      totalMeetups: 0,
      activeMeetups: 0,
      todaySignups: 0
    };

    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    stats.totalUsers = parseInt(usersResult.rows[0].count);

    const meetupsResult = await pool.query('SELECT COUNT(*) as count FROM meetups');
    stats.totalMeetups = parseInt(meetupsResult.rows[0].count);

    const activeResult = await pool.query(
      "SELECT COUNT(*) as count FROM meetups WHERE status IN ('모집중', '모집완료', '진행중')"
    );
    stats.activeMeetups = parseInt(activeResult.rows[0].count);

    const todayResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURRENT_DATE'
    );
    stats.todaySignups = parseInt(todayResult.rows[0].count);

    logger.info('Dashboard stats collected:', stats);

    res.json({
      success: true,
      message: '통계가 수집되었습니다.',
      stats
    });
  } catch (error) {
    logger.error('대시보드 통계 수집 오류:', error);
    res.status(500).json({ success: false, error: '통계 수집에 실패했습니다.' });
  }
};

// 리뷰 삭제 (PATCH 버전 - 소프트 삭제)
exports.softDeleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // 소프트 삭제 (is_deleted 플래그 사용)
    const result = await pool.query(`
      UPDATE reviews
      SET is_deleted = true, deleted_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [reviewId]);

    if (result.rows.length === 0) {
      // 테이블에 is_deleted 컬럼이 없는 경우 일반 삭제 수행
      await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    }

    res.json({
      success: true,
      message: '리뷰가 삭제되었습니다.'
    });
  } catch (error) {
    logger.error('리뷰 소프트 삭제 오류:', error);
    res.status(500).json({ success: false, error: '리뷰 삭제에 실패했습니다.' });
  }
};

// ========== 약속금/결제 관리 ==========

exports.getDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (status && status !== 'all') {
      conditions.push(`pd.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT pd.*, u.name as user_name, u.email as user_email, m.title as meetup_title,
        COUNT(*) OVER() as total_count
      FROM promise_deposits pd
      LEFT JOIN users u ON pd.user_id = u.id
      LEFT JOIN meetups m ON pd.meetup_id = m.id
      ${where}
      ORDER BY pd.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      deposits: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('약속금 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '약속금 목록 조회에 실패했습니다.' });
  }
};

exports.getDepositStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded,
        COUNT(CASE WHEN status = 'forfeited' THEN 1 END) as forfeited,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid_amount,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END), 0) as total_refunded_amount,
        COALESCE(SUM(CASE WHEN status = 'forfeited' THEN amount ELSE 0 END), 0) as total_forfeited_amount
      FROM promise_deposits
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('약속금 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '약속금 통계 조회에 실패했습니다.' });
  }
};

exports.processDepositRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const deposit = await pool.query('SELECT * FROM promise_deposits WHERE id = $1', [id]);
    if (deposit.rows.length === 0) {
      return res.status(404).json({ success: false, error: '약속금을 찾을 수 없습니다.' });
    }

    await pool.query(
      `UPDATE promise_deposits SET status = 'refunded', refund_amount = amount, refund_reason = $2, returned_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id, reason || '관리자 환불']
    );

    res.json({ success: true, message: '환불이 처리되었습니다.' });
  } catch (error) {
    logger.error('약속금 환불 처리 오류:', error);
    res.status(500).json({ success: false, error: '환불 처리에 실패했습니다.' });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT *, COUNT(*) OVER() as total_count
      FROM platform_revenues
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    const statsResult = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN revenue_type = 'noshow_fee' THEN amount ELSE 0 END), 0) as noshow_revenue,
        COALESCE(SUM(CASE WHEN revenue_type = 'late_cancel_fee' THEN amount ELSE 0 END), 0) as cancel_revenue,
        COALESCE(SUM(CASE WHEN revenue_type = 'service_fee' THEN amount ELSE 0 END), 0) as service_revenue
      FROM platform_revenues
    `);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      revenues: result.rows,
      stats: statsResult.rows[0],
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('수익 조회 오류:', error);
    res.status(500).json({ success: false, error: '수익 조회에 실패했습니다.' });
  }
};

// ========== 뱃지 관리 ==========

exports.getBadges = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.badge_type = b.name) as awarded_count
      FROM badges b
      ORDER BY b.category, b.required_count
    `);
    res.json({ success: true, badges: result.rows });
  } catch (error) {
    logger.error('뱃지 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 목록 조회에 실패했습니다.' });
  }
};

exports.createBadge = async (req, res) => {
  try {
    const { name, description, category, required_count, icon } = req.body;
    const result = await pool.query(`
      INSERT INTO badges (name, description, category, required_count, icon, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      RETURNING *
    `, [name, description, category || 'general', required_count || 1, icon || '🏅']);
    res.status(201).json({ success: true, badge: result.rows[0] });
  } catch (error) {
    logger.error('뱃지 생성 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 생성에 실패했습니다.' });
  }
};

exports.updateBadge = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, required_count, icon, is_active } = req.body;
    const result = await pool.query(`
      UPDATE badges SET name = COALESCE($1, name), description = COALESCE($2, description),
        category = COALESCE($3, category), required_count = COALESCE($4, required_count),
        icon = COALESCE($5, icon), is_active = COALESCE($6, is_active), updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [name, description, category, required_count, icon, is_active, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: '뱃지를 찾을 수 없습니다.' });
    res.json({ success: true, badge: result.rows[0] });
  } catch (error) {
    logger.error('뱃지 수정 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 수정에 실패했습니다.' });
  }
};

exports.deleteBadge = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM badges WHERE id = $1', [id]);
    res.json({ success: true, message: '뱃지가 삭제되었습니다.' });
  } catch (error) {
    logger.error('뱃지 삭제 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 삭제에 실패했습니다.' });
  }
};

exports.awardBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;
    await pool.query(`
      INSERT INTO user_badges (user_id, badge_type, earned_at)
      VALUES ($1, (SELECT name FROM badges WHERE id = $2), NOW())
      ON CONFLICT DO NOTHING
    `, [userId, badgeId]);
    res.json({ success: true, message: '뱃지가 부여되었습니다.' });
  } catch (error) {
    logger.error('뱃지 부여 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 부여에 실패했습니다.' });
  }
};

exports.revokeBadge = async (req, res) => {
  try {
    const { userId, badgeId } = req.body;
    await pool.query('DELETE FROM user_badges WHERE user_id = $1 AND badge_type = (SELECT name FROM badges WHERE id = $2)', [userId, badgeId]);
    res.json({ success: true, message: '뱃지가 회수되었습니다.' });
  } catch (error) {
    logger.error('뱃지 회수 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 회수에 실패했습니다.' });
  }
};

exports.getBadgeStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM badges) as total_badges,
        (SELECT COUNT(*) FROM user_badges) as total_awarded,
        (SELECT COUNT(DISTINCT user_id) FROM user_badges) as unique_users
    `);
    const byCategory = await pool.query(`
      SELECT b.category, COUNT(ub.id) as count
      FROM badges b LEFT JOIN user_badges ub ON b.name = ub.badge_type
      GROUP BY b.category
    `);
    res.json({ success: true, data: { ...result.rows[0], byCategory: byCategory.rows } });
  } catch (error) {
    logger.error('뱃지 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '뱃지 통계 조회에 실패했습니다.' });
  }
};

// ========== 알림 관리 ==========

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (type) {
      conditions.push(`n.type = $${idx}`);
      params.push(type);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT n.*, u.name as user_name, u.email as user_email,
        COUNT(*) OVER() as total_count
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ${where}
      ORDER BY n.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      notifications: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('알림 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '알림 목록 조회에 실패했습니다.' });
  }
};

exports.broadcastNotification = async (req, res) => {
  try {
    const { title, content, type } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: '제목과 내용은 필수입니다.' });
    }

    const usersResult = await pool.query('SELECT id FROM users WHERE deleted_at IS NULL');
    const users = usersResult.rows;

    let insertCount = 0;
    for (const user of users) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
        VALUES ($1, $2, $3, $4, false, NOW())
      `, [user.id, title, content, type || 'system']);
      insertCount++;
    }

    res.json({ success: true, message: `${insertCount}명에게 알림이 발송되었습니다.` });
  } catch (error) {
    logger.error('전체 알림 발송 오류:', error);
    res.status(500).json({ success: false, error: '알림 발송에 실패했습니다.' });
  }
};

exports.getNotificationStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count
      FROM notifications
    `);

    const deviceResult = await pool.query(`
      SELECT
        COUNT(*) as total_tokens,
        COUNT(CASE WHEN platform = 'ios' THEN 1 END) as ios_tokens,
        COUNT(CASE WHEN platform = 'android' THEN 1 END) as android_tokens,
        COUNT(CASE WHEN platform = 'web' THEN 1 END) as web_tokens
      FROM device_tokens
    `);

    res.json({
      success: true,
      data: {
        notifications: result.rows[0],
        devices: deviceResult.rows[0]
      }
    });
  } catch (error) {
    logger.error('알림 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '알림 통계 조회에 실패했습니다.' });
  }
};

// ========== 지원 티켓 관리 ==========

exports.getSupportTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (status && status !== 'all') {
      conditions.push(`st.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (priority) {
      conditions.push(`st.priority = $${idx}`);
      params.push(priority);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT st.*, u.name as user_name, u.email as user_email,
        COUNT(*) OVER() as total_count
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      ${where}
      ORDER BY
        CASE st.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
        st.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      tickets: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('지원 티켓 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '지원 티켓 목록 조회에 실패했습니다.' });
  }
};

exports.updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_response, priority } = req.body;
    const adminId = req.admin.id;

    const result = await pool.query(`
      UPDATE support_tickets
      SET status = COALESCE($1, status),
          admin_response = COALESCE($2, admin_response),
          priority = COALESCE($3, priority),
          resolved_by = CASE WHEN $1 IN ('resolved', 'closed') THEN $4 ELSE resolved_by END,
          resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN NOW() ELSE resolved_at END,
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, admin_response, priority, adminId, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: '티켓을 찾을 수 없습니다.' });
    res.json({ success: true, ticket: result.rows[0] });
  } catch (error) {
    logger.error('지원 티켓 수정 오류:', error);
    res.status(500).json({ success: false, error: '지원 티켓 수정에 실패했습니다.' });
  }
};

exports.getSupportTicketStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('open', 'pending') THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count
      FROM support_tickets
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('지원 티켓 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '지원 티켓 통계 조회에 실패했습니다.' });
  }
};

// ========== 채팅 관리 ==========

exports.getChatRooms = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`m.title ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT cr.*, m.title as meetup_title, m.status as meetup_status,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm."chatRoomId" = cr.id) as message_count,
        (SELECT COUNT(*) FROM chat_participants cp WHERE cp."chatRoomId" = cr.id) as participant_count,
        (SELECT MAX(cm."createdAt") FROM chat_messages cm WHERE cm."chatRoomId" = cr.id) as last_message_at,
        COUNT(*) OVER() as total_count
      FROM chat_rooms cr
      LEFT JOIN meetups m ON cr."meetupId" = m.id
      ${where}
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      rooms: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('채팅방 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '채팅방 목록 조회에 실패했습니다.' });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT cm.*, u.name as sender_name, u.profile_image as sender_image,
        COUNT(*) OVER() as total_count
      FROM chat_messages cm
      LEFT JOIN users u ON cm."senderId" = u.id
      WHERE cm."chatRoomId" = $1
      ORDER BY cm."createdAt" DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), offset]);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      messages: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('채팅 메시지 조회 오류:', error);
    res.status(500).json({ success: false, error: '채팅 메시지 조회에 실패했습니다.' });
  }
};

exports.deleteChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE chat_messages SET message = '[관리자에 의해 삭제됨]', "isDeleted" = true, "deletedAt" = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ success: true, message: '메시지가 삭제되었습니다.' });
  } catch (error) {
    logger.error('채팅 메시지 삭제 오류:', error);
    res.status(500).json({ success: false, error: '메시지 삭제에 실패했습니다.' });
  }
};

exports.getChatStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM chat_rooms) as total_rooms,
        (SELECT COUNT(*) FROM chat_messages) as total_messages,
        (SELECT COUNT(DISTINCT cr.id) FROM chat_rooms cr
         JOIN chat_messages cm ON cr.id = cm."chatRoomId"
         WHERE cm."createdAt" > NOW() - INTERVAL '24 hours') as active_rooms,
        (SELECT COUNT(*) FROM chat_messages WHERE "createdAt" >= CURRENT_DATE) as today_messages
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('채팅 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '채팅 통계 조회에 실패했습니다.' });
  }
};

// ========== 리뷰 관리 (강화) ==========

exports.getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, reported, hidden } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (reported === 'true') {
      conditions.push(`r.id IN (SELECT DISTINCT reported_content_id FROM reports WHERE content_type = 'review' AND status = 'pending')`);
    }
    if (hidden === 'true') {
      conditions.push('r.is_hidden = true');
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT r.*,
        reviewer.name as reviewer_name, reviewer.email as reviewer_email,
        m.title as meetup_title,
        COUNT(*) OVER() as total_count
      FROM reviews r
      LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
      LEFT JOIN meetups m ON r.meetup_id = m.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      reviews: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '리뷰 목록 조회에 실패했습니다.' });
  }
};

exports.hideReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    await pool.query(`
      UPDATE reviews SET is_hidden = true, hidden_reason = $2, hidden_at = NOW(), hidden_by = $3
      WHERE id = $1
    `, [reviewId, reason || '관리자 판단', req.admin.id]);
    res.json({ success: true, message: '리뷰가 숨김 처리되었습니다.' });
  } catch (error) {
    logger.error('리뷰 숨김 오류:', error);
    res.status(500).json({ success: false, error: '리뷰 숨김에 실패했습니다.' });
  }
};

exports.restoreReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await pool.query(`
      UPDATE reviews SET is_hidden = false, hidden_reason = NULL, hidden_at = NULL, hidden_by = NULL
      WHERE id = $1
    `, [reviewId]);
    res.json({ success: true, message: '리뷰가 복원되었습니다.' });
  } catch (error) {
    logger.error('리뷰 복원 오류:', error);
    res.status(500).json({ success: false, error: '리뷰 복원에 실패했습니다.' });
  }
};

exports.getReviewStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(CASE WHEN is_hidden = true THEN 1 END) as hidden_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_count,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_count,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_count
      FROM reviews
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('리뷰 통계 조회 오류:', error);
    res.status(500).json({ success: false, error: '리뷰 통계 조회에 실패했습니다.' });
  }
};

// ========== 광고 관리 (관리자 CRUD) ==========

exports.getAdvertisements = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (status === 'active') {
      conditions.push('is_active = true');
    } else if (status === 'inactive') {
      conditions.push('is_active = false');
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT *, COUNT(*) OVER() as total_count
      FROM advertisements
      ${where}
      ORDER BY priority DESC, created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      advertisements: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('광고 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '광고 목록 조회에 실패했습니다.' });
  }
};

exports.createAdvertisement = async (req, res) => {
  try {
    const { title, description, image_url, link_url, position, priority, start_date, end_date, business_name, contact_info } = req.body;
    const adminId = req.admin ? req.admin.id : null;
    const result = await pool.query(`
      INSERT INTO advertisements (title, description, image_url, link_url, created_by, position, priority, start_date, end_date, business_name, contact_info, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
      RETURNING *
    `, [title, description, image_url, link_url, adminId, position || 'banner', priority || 0, start_date, end_date, business_name, contact_info]);
    res.status(201).json({ success: true, advertisement: result.rows[0] });
  } catch (error) {
    logger.error('광고 생성 오류:', error);
    res.status(500).json({ success: false, error: '광고 생성에 실패했습니다.' });
  }
};

exports.updateAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, link_url, position, priority, start_date, end_date, is_active, business_name, contact_info } = req.body;
    const result = await pool.query(`
      UPDATE advertisements SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        image_url = COALESCE($3, image_url), link_url = COALESCE($4, link_url),
        position = COALESCE($5, position), priority = COALESCE($6, priority),
        start_date = COALESCE($7, start_date), end_date = COALESCE($8, end_date),
        is_active = COALESCE($9, is_active), business_name = COALESCE($10, business_name),
        contact_info = COALESCE($11, contact_info), updated_at = NOW()
      WHERE id = $12 RETURNING *
    `, [title, description, image_url, link_url, position, priority, start_date, end_date, is_active, business_name, contact_info, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: '광고를 찾을 수 없습니다.' });
    res.json({ success: true, advertisement: result.rows[0] });
  } catch (error) {
    logger.error('광고 수정 오류:', error);
    res.status(500).json({ success: false, error: '광고 수정에 실패했습니다.' });
  }
};

exports.deleteAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM advertisements WHERE id = $1', [id]);
    res.json({ success: true, message: '광고가 삭제되었습니다.' });
  } catch (error) {
    logger.error('광고 삭제 오류:', error);
    res.status(500).json({ success: false, error: '광고 삭제에 실패했습니다.' });
  }
};

exports.toggleAdvertisement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE advertisements SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: '광고를 찾을 수 없습니다.' });
    res.json({ success: true, advertisement: result.rows[0] });
  } catch (error) {
    logger.error('광고 토글 오류:', error);
    res.status(500).json({ success: false, error: '광고 토글에 실패했습니다.' });
  }
};

// ========== 감사 로그 ==========

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT al.*, a.username as admin_username,
        COUNT(*) OVER() as total_count
      FROM admin_audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      logs: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('감사 로그 조회 오류:', error);
    res.status(500).json({ success: false, error: '감사 로그 조회에 실패했습니다.' });
  }
};

// ============================================
// v2 피벗 — 매장 관리 (관리자)
// ============================================

exports.getRestaurantsForAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, category, q } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (status === 'active') conditions.push('r.is_active = true');
    else if (status === 'inactive') conditions.push('r.is_active = false');

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`r.category = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(r.name ILIKE $${params.length} OR r.address ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), offset);

    const sql = `
      SELECT r.id, r.name, r.category, r.address, r.phone, r.description,
             r.is_active, r.created_at, r.updated_at,
             u.name AS owner_name,
             m.business_name, m.business_number,
             COUNT(*) OVER() AS total_count
      FROM restaurants r
      LEFT JOIN merchants m ON m.restaurant_id = r.id
      LEFT JOIN users u ON u.id = m.user_id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(sql, params);
    const total = result.rows.length ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      restaurants: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    logger.error('관리자 매장 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '매장 목록 조회에 실패했습니다.' });
  }
};

exports.toggleRestaurantActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const result = await pool.query(
      `UPDATE restaurants SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, is_active`,
      [Boolean(is_active), id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: '매장을 찾을 수 없습니다.' });
    }
    res.json({ success: true, restaurant: result.rows[0] });
  } catch (error) {
    logger.error('관리자 매장 활성화 토글 오류:', error);
    res.status(500).json({ success: false, error: '매장 상태 변경에 실패했습니다.' });
  }
};

// ============================================
// v2 피벗 — 예약 모니터링 (관리자)
// ============================================

exports.getReservationsForAdmin = async (req, res) => {
  try {
    const { date, status, restaurantId, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (date) {
      params.push(date);
      conditions.push(`res.reservation_date = $${params.length}`);
    }
    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`res.status = $${params.length}`);
    }
    if (restaurantId) {
      params.push(restaurantId);
      conditions.push(`res.restaurant_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit), offset);

    const sql = `
      SELECT res.id,
             res.reservation_date,
             res.reservation_time,
             res.party_size,
             res.status,
             res.arrival_status,
             res.checked_in_at,
             res.created_at,
             r.name AS restaurant_name,
             u.name AS customer_name,
             u.phone AS customer_phone,
             p.status AS payment_status,
             p.amount AS payment_amount,
             COALESCE(
               (SELECT string_agg(oi.menu_name || ' x' || oi.quantity, ', ')
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                WHERE o.reservation_id = res.id),
               ''
             ) AS menu_items,
             COUNT(*) OVER() AS total_count
      FROM reservations res
      LEFT JOIN restaurants r ON r.id = res.restaurant_id
      LEFT JOIN users u ON u.id = res.user_id
      LEFT JOIN payments p ON p.reservation_id = res.id
      ${where}
      ORDER BY res.reservation_date DESC, res.reservation_time DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(sql, params);
    const total = result.rows.length ? parseInt(result.rows[0].total_count) : 0;

    res.json({
      success: true,
      reservations: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    logger.error('관리자 예약 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '예약 목록 조회에 실패했습니다.' });
  }
};
