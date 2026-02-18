const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

// 리프레시 토큰 만료 시간 (7일)
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 토큰 검증 시작:', {
    url: req.originalUrl,
    method: req.method,
    authHeader: authHeader?.substring(0, 20) + '...',
    token: token?.substring(0, 20) + '...'
  });

  if (!token) {
    console.log('❌ 토큰이 없습니다');
    return res.status(401).json({ error: '접근 토큰이 필요합니다' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ 토큰 검증 실패:', err.message);
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }
    console.log('✅ 토큰 검증 성공:', { userId: user.userId || user.id, email: user.email, url: req.originalUrl });
    req.user = { userId: user.userId || user.id, email: user.email, name: user.name };
    next();
  });
};

// 관리자 인증 미들웨어 (기본)
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 관리자 토큰 검증 시작:', {
    url: req.originalUrl,
    method: req.method,
    authHeader: authHeader?.substring(0, 20) + '...',
    token: token?.substring(0, 20) + '...'
  });

  if (!token) {
    console.log('❌ 관리자 토큰이 없습니다');
    return res.status(401).json({ error: '관리자 접근 토큰이 필요합니다' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ 관리자 토큰 검증 실패:', err.message);
      return res.status(403).json({ error: '유효하지 않은 관리자 토큰입니다' });
    }

    // 관리자 권한 확인 (이메일 기반)
    if (!user.email || !user.email.includes('@')) {
      console.log('❌ 관리자 권한 없음:', { email: user.email });
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }

    console.log('✅ 관리자 토큰 검증 성공:', { userId: user.userId || user.id, email: user.email, url: req.originalUrl });
    req.user = { userId: user.userId || user.id, email: user.email, name: user.name };
    next();
  });
};

// 관리자 인증 미들웨어 (DB 확인 포함)
const authenticateAdminNew = async (req, res, next) => {
  try {
    console.log('🔐 관리자 인증 시작:', {
      url: req.url,
      method: req.method,
      authHeader: req.headers.authorization ? 'Bearer ' + req.headers.authorization.split(' ')[1]?.substring(0, 20) + '...' : 'None'
    });

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ 관리자 인증 실패: 토큰 없음');
      return res.status(401).json({
        success: false,
        error: '관리자 인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰 형식입니다.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 관리자 권한 확인
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    // 관리자 계정 활성화 상태 확인
    const result = await pool.query(
      'SELECT id, username, email, role, is_active FROM admins WHERE id = $1 AND is_active = true',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      console.log('❌ 관리자 인증 실패: 계정 없음 또는 비활성화');
      return res.status(403).json({
        success: false,
        error: '비활성화되거나 존재하지 않는 관리자 계정입니다.'
      });
    }

    console.log('✅ 관리자 인증 성공:', {
      adminId: decoded.adminId,
      username: result.rows[0].username,
      role: result.rows[0].role
    });

    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('관리자 인증 오류:', error);
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 관리자 토큰입니다.'
    });
  }
};

// JWT 액세스 토큰 생성 (짧은 만료 시간)
const generateJWT = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

// 리프레시 토큰 생성 (DB 저장)
const generateRefreshToken = async (user) => {
  const refreshToken = crypto.randomBytes(64).toString('hex');

  // 같은 사용자의 기존 토큰 제거 (1인 1토큰 정책)
  await pool.query('DELETE FROM user_refresh_tokens WHERE user_id = $1', [user.id]);

  // 새 토큰 저장
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(`
    INSERT INTO user_refresh_tokens (user_id, token, email, name, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `, [user.id, refreshToken, user.email, user.name, expiresAt]);

  return refreshToken;
};

// 리프레시 토큰 검증 (DB 조회)
const verifyRefreshToken = async (refreshToken) => {
  const result = await pool.query(
    'SELECT user_id AS "userId", email, name, created_at AS "createdAt" FROM user_refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [refreshToken]
  );

  if (result.rows.length === 0) {
    // 만료됐거나 없는 토큰이면 삭제
    await pool.query('DELETE FROM user_refresh_tokens WHERE token = $1', [refreshToken]);
    return null;
  }

  return result.rows[0];
};

// 리프레시 토큰 삭제 (로그아웃 시)
const revokeRefreshToken = async (refreshToken) => {
  const result = await pool.query('DELETE FROM user_refresh_tokens WHERE token = $1', [refreshToken]);
  return result.rowCount > 0;
};

// 만료된 리프레시 토큰 정리 (주기적 호출용)
const cleanupExpiredRefreshTokens = async () => {
  try {
    const result = await pool.query('DELETE FROM user_refresh_tokens WHERE expires_at < NOW()');
    if (result.rowCount > 0) {
      console.log(`🔑 만료된 리프레시 토큰 ${result.rowCount}개 정리 완료`);
    }
  } catch (error) {
    console.error('리프레시 토큰 정리 오류:', error.message);
  }
};

// 1시간마다 만료된 리프레시 토큰 정리
const cleanupInterval = setInterval(cleanupExpiredRefreshTokens, 60 * 60 * 1000);
cleanupInterval.unref();

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateAdminNew,
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
};
