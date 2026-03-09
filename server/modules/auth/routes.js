const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema } = require('../../middleware/schemas/auth.schemas');
const { loginLimiter } = require('../../middleware/rateLimiter');

// 카카오 로그인 시작 (인증 페이지로 리다이렉트) — rate limited
router.get('/kakao', loginLimiter, authController.kakaoAuthRedirect);

// 카카오 로그인 시작 (레거시 경로) — rate limited
router.get('/kakao/login', loginLimiter, authController.kakaoAuthRedirect);

// 카카오 로그인 콜백 처리 (카카오 서버에서 호출 — rate limit 없음)
router.get('/kakao/callback', authController.kakaoCallback);

// 카카오 로그인 API (웹 앱용) — rate limited
router.post('/kakao', loginLimiter, authController.kakaoLogin);

// 토큰 검증 및 자동 로그인 API
router.post('/verify-token', authController.verifyToken);

// 로그아웃
router.post('/logout', authenticateToken, authController.logout);

// 테스트 로그인 (개발용)
router.post('/test-login', authController.testLogin);

// 사용자 프로필 조회
router.get('/profile', authenticateToken, authController.getProfile);

// 이메일 회원가입
router.post('/register', validate({ body: registerSchema }), authController.register);

// 이메일 로그인
router.post('/login', validate({ body: loginSchema }), authController.login);

// 리프레시 토큰으로 새 액세스 토큰 발급
router.post('/refresh-token', authController.refreshToken);

// 비밀번호 재설정 요청
router.post('/forgot-password', authController.forgotPassword);

// 비밀번호 재설정 실행
router.post('/reset-password', authController.resetPassword);

module.exports = router;
