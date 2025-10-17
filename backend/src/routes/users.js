const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');

// 카카오 로그인 전용 앱이므로 기본 회원가입/로그인 라우트 제거
// 카카오 OAuth는 main server에서 처리됨

// 프로필 조회 (인증 필요)
router.get('/profile', authenticateToken, userController.getProfile);

// 프로필 업데이트 (인증 필요)
router.put('/profile', authenticateToken, userController.updateProfile);

// 사용자 목록 조회 (인증 필요)
router.get('/', authenticateToken, userController.getUsers);

module.exports = router;