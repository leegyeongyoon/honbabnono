const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3001;

// CORS 설정
app.use(cors({
  origin: 'http://localhost:3002',
  credentials: true
}));

app.use(express.json());

// PostgreSQL 연결 풀
const pool = new Pool({
  connectionString: 'postgresql://postgres:honbabnono@honbabnono.c3iokeig2kd8.ap-northeast-2.rds.amazonaws.com:5432/honbabnono',
  ssl: {
    rejectUnauthorized: false
  }
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 통계 API
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [usersResult, meetupsResult, todayMeetupsResult, activeMeetupsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM meetups'),
      pool.query('SELECT COUNT(*) as total FROM meetups WHERE DATE(created_at) = CURRENT_DATE'),
      pool.query('SELECT COUNT(*) as total FROM meetups WHERE status = $1', ['모집중'])
    ]);

    const stats = {
      totalUsers: parseInt(usersResult.rows[0].total),
      totalMeetups: parseInt(meetupsResult.rows[0].total),
      todayMeetups: parseInt(todayMeetupsResult.rows[0].total),
      activeMeetups: parseInt(activeMeetupsResult.rows[0].total)
    };

    res.json(stats);
  } catch (error) {
    console.error('통계 조회 실패:', error);
    res.status(500).json({ error: '통계를 불러올 수 없습니다.' });
  }
});

// 사용자 목록 API
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        email, 
        provider, 
        is_verified as "isVerified",
        created_at as "createdAt",
        updated_at as "lastLoginAt",
        CASE 
          WHEN is_verified = true THEN 'active'
          WHEN is_verified = false THEN 'pending'
          ELSE 'active'
        END as status
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error);
    res.status(500).json({ error: '사용자 목록을 불러올 수 없습니다.' });
  }
});

// 사용자 인증
app.post('/api/admin/users/:userId/verify', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('사용자 인증 실패:', error);
    res.status(500).json({ error: '사용자 인증에 실패했습니다.' });
  }
});

// 사용자 차단
app.post('/api/admin/users/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE users SET is_verified = false WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('사용자 차단 실패:', error);
    res.status(500).json({ error: '사용자 차단에 실패했습니다.' });
  }
});

// 사용자 차단 해제
app.post('/api/admin/users/:userId/unblock', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('사용자 차단 해제 실패:', error);
    res.status(500).json({ error: '사용자 차단 해제에 실패했습니다.' });
  }
});

// 모임 목록 API
app.get('/api/admin/meetups', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.title,
        u.name as "hostName",
        m.location,
        m.date,
        m.time,
        m.current_participants as "currentParticipants",
        m.max_participants as "maxParticipants",
        m.category,
        m.status,
        m.created_at as "createdAt"
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      ORDER BY m.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('모임 목록 조회 실패:', error);
    res.status(500).json({ error: '모임 목록을 불러올 수 없습니다.' });
  }
});

// 모임 취소
app.post('/api/admin/meetups/:meetupId/cancel', async (req, res) => {
  try {
    const { meetupId } = req.params;
    await pool.query('UPDATE meetups SET status = $1 WHERE id = $2', ['취소', meetupId]);
    res.json({ success: true });
  } catch (error) {
    console.error('모임 취소 실패:', error);
    res.status(500).json({ error: '모임 취소에 실패했습니다.' });
  }
});

// 모임 승인
app.post('/api/admin/meetups/:meetupId/approve', async (req, res) => {
  try {
    const { meetupId } = req.params;
    await pool.query('UPDATE meetups SET status = $1 WHERE id = $2', ['모집중', meetupId]);
    res.json({ success: true });
  } catch (error) {
    console.error('모임 승인 실패:', error);
    res.status(500).json({ error: '모임 승인에 실패했습니다.' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ 관리자 API 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log('📊 사용 가능한 엔드포인트:');
  console.log('   - GET /api/admin/stats - 통계');
  console.log('   - GET /api/admin/users - 사용자 목록');
  console.log('   - GET /api/admin/meetups - 모임 목록');
  console.log('   - POST /api/admin/users/:id/verify - 사용자 인증');
  console.log('   - POST /api/admin/users/:id/block - 사용자 차단');
  console.log('   - POST /api/admin/meetups/:id/cancel - 모임 취소');
});