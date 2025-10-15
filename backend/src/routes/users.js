const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');

// 회원가입
router.post('/register', userController.register);

// 로그인
router.post('/login', userController.login);

// 프로필 조회 (인증 필요)
router.get('/profile', authenticateToken, userController.getProfile);

// 프로필 업데이트 (인증 필요)
router.put('/profile', authenticateToken, userController.updateProfile);

// 사용자 목록 조회 (인증 필요)
router.get('/', authenticateToken, userController.getUsers);

module.exports = router;