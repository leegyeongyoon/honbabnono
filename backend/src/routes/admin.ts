import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

// PostgreSQL 연결 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:honbabnono@honbabnono.c3iokeig2kd8.ap-northeast-2.rds.amazonaws.com:5432/honbabnono'
});

// 사용자 목록 조회
router.get('/users', async (req, res) => {
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
router.post('/users/:userId/verify', async (req, res) => {
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
router.post('/users/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;
    // 실제로는 별도 blocked 컬럼이나 테이블을 사용해야 하지만, 
    // 현재 스키마에서는 is_verified를 false로 설정
    await pool.query('UPDATE users SET is_verified = false WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('사용자 차단 실패:', error);
    res.status(500).json({ error: '사용자 차단에 실패했습니다.' });
  }
});

// 사용자 차단 해제
router.post('/users/:userId/unblock', async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('사용자 차단 해제 실패:', error);
    res.status(500).json({ error: '사용자 차단 해제에 실패했습니다.' });
  }
});

// 모임 목록 조회
router.get('/meetups', async (req, res) => {
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
router.post('/meetups/:meetupId/cancel', async (req, res) => {
  try {
    const { meetupId } = req.params;
    await pool.query('UPDATE meetups SET status = $1 WHERE id = $2', ['cancelled', meetupId]);
    res.json({ success: true });
  } catch (error) {
    console.error('모임 취소 실패:', error);
    res.status(500).json({ error: '모임 취소에 실패했습니다.' });
  }
});

// 모임 승인 (현재 스키마에서는 active 상태로 변경)
router.post('/meetups/:meetupId/approve', async (req, res) => {
  try {
    const { meetupId } = req.params;
    await pool.query('UPDATE meetups SET status = $1 WHERE id = $2', ['active', meetupId]);
    res.json({ success: true });
  } catch (error) {
    console.error('모임 승인 실패:', error);
    res.status(500).json({ error: '모임 승인에 실패했습니다.' });
  }
});

// 대시보드 통계
router.get('/stats', async (req, res) => {
  try {
    const [usersResult, meetupsResult, todayMeetupsResult, activeMeetupsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM meetups'),
      pool.query('SELECT COUNT(*) as total FROM meetups WHERE DATE(created_at) = CURRENT_DATE'),
      pool.query('SELECT COUNT(*) as total FROM meetups WHERE status = $1', ['active'])
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

export default router;