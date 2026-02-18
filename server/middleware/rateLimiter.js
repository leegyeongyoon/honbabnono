const rateLimit = require('express-rate-limit');

// 로그인 라우트 Rate Limiter: 분당 5회
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '너무 많은 로그인 시도입니다. 1분 후 다시 시도해주세요.'
  }
});

// 일반 API Rate Limiter: 분당 100회
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
  }
});

module.exports = {
  loginLimiter,
  apiLimiter
};
