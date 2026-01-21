const express = require('express');
const router = express.Router();
const userController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// 현재 사용자 정보 조회 (토큰 검증용)
router.get('/me', authenticateToken, userController.getMe);

// 사용자 통계 조회
router.get('/stats', authenticateToken, userController.getStats);

// 밥알지수 조회
router.get('/rice-index', authenticateToken, userController.getRiceIndex);

// 내 리뷰 조회
router.get('/reviews', authenticateToken, userController.getMyReviews);

// 내 활동 내역 (참여한 모임들)
router.get('/activities', authenticateToken, userController.getActivities);

// 내가 호스트한 모임 조회
router.get('/hosted-meetups', authenticateToken, userController.getHostedMeetups);

// 위시리스트 조회 (기존)
router.get('/wishlist', authenticateToken, userController.getWishlist);

// 위시리스트 추가/제거 (기존)
router.post('/wishlist/:meetupId', authenticateToken, userController.toggleWishlist);

// 찜 목록 조회 (페이지네이션 지원)
router.get('/wishlists', authenticateToken, userController.getWishlists);

// 최근 본 글 관련
router.get('/recent-views', authenticateToken, userController.getRecentViews);
router.delete('/recent-views', authenticateToken, userController.deleteAllRecentViews);
router.delete('/recent-views/:viewId', authenticateToken, userController.deleteRecentView);

// 차단 회원 관리
router.get('/blocked-users', authenticateToken, userController.getBlockedUsers);

// 프로필 업데이트
router.put('/profile', authenticateToken, userController.updateProfile);

// 참가한 모임 조회
router.get('/joined-meetups', authenticateToken, userController.getJoinedMeetups);

// 알림 설정
router.get('/notification-settings', authenticateToken, userController.getNotificationSettings);
router.put('/notification-settings', authenticateToken, userController.updateNotificationSettings);

// 계정 관리
router.delete('/account', authenticateToken, userController.deleteAccount);
router.put('/password', authenticateToken, userController.changePassword);
router.get('/profile', authenticateToken, userController.getProfile);

// 포인트
router.get('/points', authenticateToken, userController.getUserPoints);
router.get('/point-transactions', authenticateToken, userController.getPointTransactions);

// 뱃지
router.get('/badges', authenticateToken, userController.getUserBadges);

// 통계 및 활동
router.get('/activity-stats', authenticateToken, userController.getActivityStats);
router.get('/reviewable-meetups', authenticateToken, userController.getReviewableMeetups);

// 개인정보 설정
router.get('/privacy-settings', authenticateToken, userController.getPrivacySettings);
router.put('/privacy-settings', authenticateToken, userController.updatePrivacySettings);

// 데이터 관리
router.get('/data-export', authenticateToken, userController.exportData);
router.get('/deposits', authenticateToken, userController.getDeposits);

// 포인트 충전/사용
router.post('/charge-points', authenticateToken, userController.chargePoints);
router.post('/spend-points', authenticateToken, userController.spendPoints);
router.get('/point-history', authenticateToken, userController.getPointHistory);

// 리뷰 관리
router.get('/reviews/manage', authenticateToken, userController.getReviewsManage);

// 참가자 평가 조회 (다른 사용자)
router.get('/:userId/participant-reviews', userController.getParticipantReviews);

module.exports = router;
