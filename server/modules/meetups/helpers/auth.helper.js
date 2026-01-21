/**
 * 인증 관련 헬퍼 함수
 */
const jwt = require('jsonwebtoken');

/**
 * 요청에서 사용자 ID 추출 (선택적 인증)
 * @param {Object} req - Express 요청 객체
 * @returns {string|null} 사용자 ID 또는 null
 */
const extractUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
};

/**
 * 요청에서 사용자 ID 필수 추출
 * @param {Object} req - Express 요청 객체
 * @returns {{ userId: string|null, error: string|null }}
 */
const requireUserId = (req) => {
  const userId = extractUserId(req);
  if (!userId) {
    return { userId: null, error: '인증이 필요합니다.' };
  }
  return { userId, error: null };
};

/**
 * 인증 필수 미들웨어
 */
const requireAuth = (req, res, next) => {
  const { userId, error } = requireUserId(req);
  if (error) {
    return res.status(401).json({ success: false, error });
  }
  req.userId = userId;
  next();
};

/**
 * 선택적 인증 미들웨어
 */
const optionalAuth = (req, res, next) => {
  req.userId = extractUserId(req);
  next();
};

module.exports = {
  extractUserId,
  requireUserId,
  requireAuth,
  optionalAuth,
};
