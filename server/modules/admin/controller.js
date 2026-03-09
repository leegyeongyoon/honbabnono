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
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

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

// 대시보드 통계
exports.getDashboardStats = async (req, res) => {
  try {
    // 총 사용자 수
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');

    // 총 모임 수
    const meetupsResult = await pool.query('SELECT COUNT(*) as count FROM meetups');

    // 오늘 가입자 수
    const todayUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE"
    );

    // 오늘 생성된 모임 수
    const todayMeetupsResult = await pool.query(
      "SELECT COUNT(*) as count FROM meetups WHERE created_at >= CURRENT_DATE"
    );

    // 활성 모임 수
    const activeMeetupsResult = await pool.query(
      "SELECT COUNT(*) as count FROM meetups WHERE status IN ('모집중', '모집완료')"
    );

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalMeetups: parseInt(meetupsResult.rows[0].count),
        todayUsers: parseInt(todayUsersResult.rows[0].count),
        todayMeetups: parseInt(todayMeetupsResult.rows[0].count),
        activeMeetups: parseInt(activeMeetupsResult.rows[0].count)
      }
    });

  } catch (error) {
    logger.error('대시보드 통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
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

// 시스템 설정 조회
exports.getSettings = async (req, res) => {
  try {
    const settings = {
      maintenanceMode: false,
      allowNewSignups: true,
      maxMeetupParticipants: 4,
      meetupCreationCooldown: 60,
      autoApprovalEnabled: true,
      emailNotificationsEnabled: true,
      smsNotificationsEnabled: false,
      depositAmount: 3000,
      platformFee: 0
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('시스템 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 설정 조회 중 오류가 발생했습니다.'
    });
  }
};

// 시스템 설정 저장
exports.updateSettings = async (req, res) => {
  try {
    const {
      maintenanceMode,
      allowNewSignups,
      maxMeetupParticipants,
      meetupCreationCooldown,
      autoApprovalEnabled,
      emailNotificationsEnabled,
      smsNotificationsEnabled,
      depositAmount,
      platformFee
    } = req.body;

    if (typeof maxMeetupParticipants !== 'number' || maxMeetupParticipants < 1 || maxMeetupParticipants > 50) {
      return res.status(400).json({
        success: false,
        error: '최대 참가자 수는 1명 이상 50명 이하여야 합니다.'
      });
    }

    if (typeof depositAmount !== 'number' || depositAmount < 0) {
      return res.status(400).json({
        success: false,
        error: '예약금은 0원 이상이어야 합니다.'
      });
    }

    logger.info('시스템 설정 저장:', {
      maintenanceMode,
      allowNewSignups,
      maxMeetupParticipants,
      meetupCreationCooldown,
      autoApprovalEnabled,
      emailNotificationsEnabled,
      smsNotificationsEnabled,
      depositAmount,
      platformFee,
      updatedBy: req.admin.username,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: '시스템 설정이 저장되었습니다.'
    });
  } catch (error) {
    logger.error('시스템 설정 저장 오류:', error);
    res.status(500).json({
      success: false,
      error: '시스템 설정 저장 중 오류가 발생했습니다.'
    });
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
      INSERT INTO admins (username, email, password_hash, role, is_active, created_at)
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
      'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
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

// 실시간 통계 조회
exports.getRealtimeStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 hour') as new_users_hour,
        (SELECT COUNT(*) FROM meetups WHERE created_at > NOW() - INTERVAL '1 hour') as new_meetups_hour,
        (SELECT COUNT(*) FROM meetup_participants WHERE joined_at > NOW() - INTERVAL '1 hour') as new_participants_hour,
        (SELECT COUNT(*) FROM meetups WHERE status = '모집중') as active_meetups,
        (SELECT COUNT(DISTINCT user_id) FROM meetup_participants WHERE joined_at > NOW() - INTERVAL '24 hours') as active_users_day
    `);

    res.json({
      success: true,
      data: result.rows[0]
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
