const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// 로그인 라우트 Rate Limiter: 프로덕션 분당 5회, 개발 분당 30회
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: isDev ? 30 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '너무 많은 로그인 시도입니다. 1분 후 다시 시도해주세요.'
  }
});

// 일반 API Rate Limiter: 프로덕션 분당 100회, 개발 분당 500회
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: isDev ? 500 : 100,
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
