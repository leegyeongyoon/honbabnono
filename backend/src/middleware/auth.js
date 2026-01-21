const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('🔐 [MIDDLEWARE] 토큰 검증 시작:', {
    url: req.url,
    method: req.method,
    authHeader: req.headers['authorization'] ? 'Bearer ' + req.headers['authorization'].split(' ')[1].substring(0, 10) + '...' : 'none'
  });
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ [MIDDLEWARE] 토큰 없음');
    return res.status(401).json({ error: '액세스 토큰이 필요합니다' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'honbabnono_secret', (err, user) => {
    if (err) {
      console.log('❌ [MIDDLEWARE] 토큰 검증 실패:', err.message);
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }
    console.log('✅ [MIDDLEWARE] 토큰 검증 성공:', { userId: user.id || user.userId, email: user.email });
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;