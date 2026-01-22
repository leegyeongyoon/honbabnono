const jwt = require('jsonwebtoken');
const pool = require('../config/database');

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

// JWT 토큰 생성
const generateJWT = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateAdminNew,
  generateJWT
};
