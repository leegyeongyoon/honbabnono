const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

// 리프레시 토큰 만료 시간 (7일)
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '접근 토큰이 필요합니다' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }
    req.user = { userId: user.userId || user.id, email: user.email, name: user.name };
    next();
  });
};

// 관리자 인증 미들웨어 (JWT isAdmin 클레임 + DB admins 테이블 검증)
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
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

    // 관리자 권한 확인 (JWT 클레임에 isAdmin 플래그 필수)
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    // 관리자 계정 활성화 상태를 DB에서 검증
    const result = await pool.query(
      'SELECT id, username, email, role, is_active FROM admins WHERE id = $1 AND is_active = true',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '비활성화되거나 존재하지 않는 관리자 계정입니다.'
      });
    }

    req.admin = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 관리자 토큰입니다.'
      });
    }
    return res.status(500).json({
      success: false,
      error: '관리자 인증 처리 중 오류가 발생했습니다.'
    });
  }
};

// authenticateAdminNew는 authenticateAdmin의 별칭 (하위 호환성 유지)
const authenticateAdminNew = authenticateAdmin;

// 점주 인증 미들웨어 (JWT 사용자 인증 + merchants 테이블 검증)
const authenticateMerchant = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: '접근 토큰이 필요합니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    req.user = { userId, email: decoded.email, name: decoded.name };

    const result = await pool.query(
      'SELECT id, user_id, restaurant_id, verification_status FROM merchants WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, error: '점주 등록이 필요합니다.' });
    }

    const merchant = result.rows[0];

    if (merchant.verification_status !== 'verified') {
      return res.status(403).json({ success: false, error: '사업자 인증이 완료되지 않았습니다.' });
    }

    req.merchant = {
      id: merchant.id,
      userId: merchant.user_id,
      restaurantId: merchant.restaurant_id,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
    }
    return res.status(500).json({ success: false, error: '점주 인증 처리 중 오류가 발생했습니다.' });
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
    // cleanup silently
  } catch (error) {
    // token cleanup error - non-critical
  }
};

// 1시간마다 만료된 리프레시 토큰 정리
const cleanupInterval = setInterval(cleanupExpiredRefreshTokens, 60 * 60 * 1000);
cleanupInterval.unref();

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateAdminNew,
  authenticateMerchant,
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
};
