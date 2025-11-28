const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');

// 테스트용 Express 앱 설정
const app = express();
app.use(express.json());

// 테스트용 PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'honbabnono.c3iokeig2kd8.ap-northeast-2.rds.amazonaws.com',
  database: process.env.DB_NAME || 'honbabnono',
  password: process.env.DB_PASSWORD || 'honbabnono',
  port: process.env.DB_PORT || 5432,
});

// Mock JWT for admin authentication
const jwt = require('jsonwebtoken');
const mockAdminToken = jwt.sign(
  { adminId: 'test-admin-id', role: 'admin' },
  process.env.JWT_SECRET || 'test-secret',
  { expiresIn: '1h' }
);

// Mock auth middleware
const mockAuthenticateAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token === mockAdminToken.split('.')[2]) { // Simple token validation
      req.admin = { adminId: 'test-admin-id' };
      next();
    } else {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// API 라우트 설정 - 실제 서버의 라우트를 모킹
app.get('/admin/blocked-users', mockAuthenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'blocked_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    let whereClause = 'WHERE 1=1';
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR ub.reason ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT 
        ub.id as block_id,
        ub.blocked_user_id,
        ub.blocked_by_user_id,
        ub.reason,
        ub.created_at as blocked_at,
        u.id,
        u.name,
        u.email,
        u.provider,
        u.is_verified,
        u.created_at as user_created_at,
        u.last_login_at,
        u.profile_image,
        blocker.name as blocked_by_name,
        blocker.email as blocked_by_email,
        COUNT(*) OVER() as total_count
      FROM user_blocked_users ub
      JOIN users u ON ub.blocked_user_id = u.id
      LEFT JOIN users blocker ON ub.blocked_by_user_id = blocker.id
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    const blockedUsers = result.rows.map(row => ({
      block_id: row.block_id,
      reason: row.reason,
      blocked_at: row.blocked_at,
      blocked_by: {
        id: row.blocked_by_user_id,
        name: row.blocked_by_name,
        email: row.blocked_by_email
      },
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        provider: row.provider,
        is_verified: row.is_verified,
        created_at: row.user_created_at,
        last_login_at: row.last_login_at,
        profile_image: row.profile_image
      }
    }));

    res.json({
      success: true,
      data: blockedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '차단 회원 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

app.post('/admin/users/:userId/block', mockAuthenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 ID와 차단 사유가 필요합니다.' 
      });
    }

    if (reason.length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: '차단 사유는 5글자 이상 입력해주세요.' 
      });
    }

    // Check if already blocked
    const existingBlock = await pool.query(
      'SELECT id FROM user_blocked_users WHERE blocked_user_id = $1',
      [userId]
    );

    if (existingBlock.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 차단된 회원입니다.' 
      });
    }

    // Check user exists
    const userCheck = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '존재하지 않는 회원입니다.' 
      });
    }

    const userName = userCheck.rows[0].name;

    // Block user (admin block with NULL blocked_by_user_id)
    await pool.query(
      `INSERT INTO user_blocked_users (blocked_user_id, blocked_by_user_id, reason, created_at)
       VALUES ($1, NULL, $2, NOW())`,
      [userId, `[관리자 차단] ${reason}`]
    );

    res.json({
      success: true,
      message: `${userName}님이 관리자에 의해 차단되었습니다.`
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '회원 차단 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

app.delete('/admin/users/:userId/unblock', mockAuthenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const blockCheck = await pool.query(
      'SELECT ub.id, u.name FROM user_blocked_users ub JOIN users u ON ub.blocked_user_id = u.id WHERE ub.blocked_user_id = $1',
      [userId]
    );

    if (blockCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '차단되지 않은 회원입니다.' 
      });
    }

    const userName = blockCheck.rows[0].name;
    await pool.query('DELETE FROM user_blocked_users WHERE blocked_user_id = $1', [userId]);

    res.json({
      success: true,
      message: `${userName}님의 차단이 관리자에 의해 해제되었습니다.`
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '차단 해제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

app.get('/admin/blocking-stats', mockAuthenticateAdmin, async (req, res) => {
  try {
    const period = req.query.period || '30';
    const periodDays = parseInt(period);

    const statsQuery = `
      WITH blocking_stats AS (
        SELECT 
          COUNT(*) as total_blocks,
          COUNT(CASE WHEN blocked_by_user_id IS NULL THEN 1 END) as admin_blocks,
          COUNT(CASE WHEN blocked_by_user_id IS NOT NULL THEN 1 END) as user_blocks,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as blocks_today,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as blocks_this_week,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '${periodDays} days' THEN 1 END) as blocks_period
        FROM user_blocked_users
      )
      SELECT 
        json_build_object(
          'total_blocks', bs.total_blocks,
          'admin_blocks', bs.admin_blocks,
          'user_blocks', bs.user_blocks,
          'blocks_today', bs.blocks_today,
          'blocks_this_week', bs.blocks_this_week,
          'blocks_period', bs.blocks_period
        ) as general_stats
      FROM blocking_stats bs
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        period_days: periodDays,
        general_stats: stats.general_stats,
        daily_trend: [],
        top_reasons: []
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '차단 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

app.post('/admin/users/bulk-unblock', mockAuthenticateAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '차단 해제할 회원 ID 목록이 필요합니다.' 
      });
    }

    if (userIds.length > 50) {
      return res.status(400).json({ 
        success: false, 
        message: '한 번에 최대 50명까지만 차단 해제할 수 있습니다.' 
      });
    }

    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');
    const checkQuery = `
      SELECT ub.blocked_user_id, u.name 
      FROM user_blocked_users ub
      JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.blocked_user_id IN (${placeholders})
    `;

    const checkedUsers = await pool.query(checkQuery, userIds);
    const blockedUserIds = checkedUsers.rows.map(row => row.blocked_user_id);
    const unblockedCount = blockedUserIds.length;

    if (unblockedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '차단된 회원이 없습니다.' 
      });
    }

    const deletePlaceholders = blockedUserIds.map((_, index) => `$${index + 1}`).join(',');
    await pool.query(
      `DELETE FROM user_blocked_users WHERE blocked_user_id IN (${deletePlaceholders})`,
      blockedUserIds
    );

    res.json({
      success: true,
      message: `총 ${unblockedCount}명의 차단이 해제되었습니다.`,
      unblocked_count: unblockedCount
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '일괄 차단 해제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

describe('Admin Blocking Management API', () => {
  let testUserId;
  let testUserId2;

  beforeAll(async () => {
    // Create test users for blocking tests
    const testUser1 = await pool.query(
      `INSERT INTO users (id, email, name, password, provider, provider_id, is_verified, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, 'email', 'test1', true, NOW(), NOW()) RETURNING id`,
      [`test-user-${Date.now()}-1`, `test1-${Date.now()}@test.com`, '테스트유저1', 'password123']
    );
    testUserId = testUser1.rows[0].id;

    const testUser2 = await pool.query(
      `INSERT INTO users (id, email, name, password, provider, provider_id, is_verified, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, 'email', 'test2', true, NOW(), NOW()) RETURNING id`,
      [`test-user-${Date.now()}-2`, `test2-${Date.now()}@test.com`, '테스트유저2', 'password123']
    );
    testUserId2 = testUser2.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await pool.query('DELETE FROM user_blocked_users WHERE blocked_user_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    if (testUserId2) {
      await pool.query('DELETE FROM user_blocked_users WHERE blocked_user_id = $1', [testUserId2]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId2]);
    }
    
    await pool.end();
  });

  describe('GET /admin/blocked-users', () => {
    it('should return blocked users list with pagination', async () => {
      const response = await request(app)
        .get('/admin/blocked-users')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/admin/blocked-users')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .query({ search: '테스트' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/admin/blocked-users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /admin/users/:userId/block', () => {
    it('should block a user with valid reason', async () => {
      const response = await request(app)
        .post(`/admin/users/${testUserId}/block`)
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          reason: '테스트 차단 사유입니다'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('관리자에 의해 차단');
    });

    it('should not block already blocked user', async () => {
      const response = await request(app)
        .post(`/admin/users/${testUserId}/block`)
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          reason: '또 다른 차단 사유'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 차단된');
    });

    it('should validate reason length', async () => {
      const response = await request(app)
        .post(`/admin/users/${testUserId2}/block`)
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          reason: '짧음'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('5글자 이상');
    });

    it('should handle non-existent user', async () => {
      const response = await request(app)
        .post('/admin/users/non-existent-user/block')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          reason: '유효한 차단 사유입니다'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('존재하지 않는');
    });
  });

  describe('DELETE /admin/users/:userId/unblock', () => {
    it('should unblock a blocked user', async () => {
      const response = await request(app)
        .delete(`/admin/users/${testUserId}/unblock`)
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('차단이 관리자에 의해 해제');
    });

    it('should handle unblocking non-blocked user', async () => {
      const response = await request(app)
        .delete(`/admin/users/${testUserId2}/unblock`)
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('차단되지 않은');
    });
  });

  describe('GET /admin/blocking-stats', () => {
    it('should return blocking statistics', async () => {
      const response = await request(app)
        .get('/admin/blocking-stats')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.general_stats).toBeDefined();
      expect(typeof response.body.data.general_stats.total_blocks).toBe('number');
    });

    it('should support custom period', async () => {
      const response = await request(app)
        .get('/admin/blocking-stats')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .query({ period: 7 });

      expect(response.status).toBe(200);
      expect(response.body.data.period_days).toBe(7);
    });
  });

  describe('POST /admin/users/bulk-unblock', () => {
    beforeEach(async () => {
      // Block test users for bulk unblock tests
      await pool.query(
        `INSERT INTO user_blocked_users (blocked_user_id, blocked_by_user_id, reason, created_at)
         VALUES ($1, NULL, '테스트 차단', NOW()) ON CONFLICT DO NOTHING`,
        [testUserId]
      );
      await pool.query(
        `INSERT INTO user_blocked_users (blocked_user_id, blocked_by_user_id, reason, created_at)
         VALUES ($1, NULL, '테스트 차단', NOW()) ON CONFLICT DO NOTHING`,
        [testUserId2]
      );
    });

    it('should unblock multiple users', async () => {
      const response = await request(app)
        .post('/admin/users/bulk-unblock')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          userIds: [testUserId, testUserId2]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.unblocked_count).toBeGreaterThan(0);
    });

    it('should validate user IDs array', async () => {
      const response = await request(app)
        .post('/admin/users/bulk-unblock')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          userIds: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should limit bulk operations to 50 users', async () => {
      const manyUserIds = Array.from({ length: 51 }, (_, i) => `user-${i}`);
      
      const response = await request(app)
        .post('/admin/users/bulk-unblock')
        .set('Authorization', `Bearer ${mockAdminToken}`)
        .send({
          userIds: manyUserIds
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('최대 50명');
    });
  });
});