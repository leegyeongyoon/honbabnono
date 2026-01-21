const express = require('express');
const router = express.Router();
const badgeController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// 전체 뱃지 목록
router.get('/', badgeController.getAllBadges);

// 획득 가능한 뱃지 목록
router.get('/available', badgeController.getAvailableBadges);

// 뱃지 진행률
router.get('/progress', authenticateToken, badgeController.getBadgeProgress);

// 내 뱃지 목록
router.get('/my', authenticateToken, badgeController.getMyBadges);

// 뱃지 획득
router.post('/earn/:badgeId', authenticateToken, badgeController.earnBadge);

// 대표 뱃지 설정
router.put('/featured/:badgeId', authenticateToken, badgeController.setFeaturedBadge);

module.exports = router;
