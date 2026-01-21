const express = require('express');
const router = express.Router();
const userController = require('../user/controller');
const { authenticateToken } = require('../../middleware/auth');

// 포인트 잔액 조회 (legacy path: /users/points)
router.get('/points', authenticateToken, userController.getPoints);

// 내 리뷰 목록 (legacy path: /users/my-reviews)
router.get('/my-reviews', authenticateToken, userController.getLegacyMyReviews);

// 리뷰 수정 (legacy)
router.put('/my-reviews/:reviewId', authenticateToken, userController.updateLegacyReview);

// 리뷰 삭제 (legacy)
router.delete('/my-reviews/:reviewId', authenticateToken, userController.deleteLegacyReview);

// 찜 목록 관련 (legacy)
router.get('/wishlist', authenticateToken, userController.getLegacyWishlist);
router.post('/wishlist/:meetupId', authenticateToken, userController.addLegacyWishlist);
router.delete('/wishlist/:meetupId', authenticateToken, userController.removeLegacyWishlist);

// 참가한 모임 목록 (legacy)
router.get('/my-meetups', authenticateToken, userController.getMyMeetups);

// 결제 내역 (legacy)
router.get('/payment-history', authenticateToken, userController.getPaymentHistory);

// 포인트 내역 (legacy)
router.get('/point-history', authenticateToken, userController.getLegacyPointHistory);

// 포인트 사용/환불 (legacy)
router.post('/use-points', authenticateToken, userController.usePoints);
router.post('/refund-points', authenticateToken, userController.refundPoints);

// 초대 코드 (legacy)
router.get('/invite-code', authenticateToken, userController.getInviteCode);
router.post('/use-invite-code', authenticateToken, userController.useInviteCode);

// 회원 차단 (legacy path: /users/:userId/block)
router.post('/:userId/block', authenticateToken, userController.blockUser);

// 회원 차단 해제 (legacy)
router.delete('/:userId/block', authenticateToken, userController.unblockUser);

// 차단 상태 확인 (legacy)
router.get('/:userId/blocked-status', authenticateToken, userController.checkBlockedStatus);

// 알림 설정 (legacy path: /users/notification-settings)
router.get('/notification-settings', authenticateToken, userController.getLegacyNotificationSettings);
router.put('/notification-settings', authenticateToken, userController.updateLegacyNotificationSettings);

// 포인트 통계 (legacy path: /users/point-stats)
router.get('/point-stats', authenticateToken, userController.getPointStats);

// 최근 본 글 (legacy path: /users/recent-views)
router.get('/recent-views', authenticateToken, userController.getLegacyRecentViews);
router.post('/recent-views/:meetupId', authenticateToken, userController.addLegacyRecentView);

// 포인트 충전 (legacy path: /users/charge-points)
router.post('/charge-points', authenticateToken, userController.chargeLegacyPoints);

module.exports = router;
