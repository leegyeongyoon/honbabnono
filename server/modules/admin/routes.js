const express = require('express');
const router = express.Router();
const adminController = require('./controller');
const { authenticateAdminNew } = require('../../middleware/auth');

// 관리자 로그인
router.post('/login', adminController.login);

// 관리자 로그아웃
router.post('/logout', authenticateAdminNew, adminController.logout);

// 관리자 프로필
router.get('/profile', authenticateAdminNew, adminController.getProfile);

// 대시보드 통계
router.get('/dashboard/stats', authenticateAdminNew, adminController.getDashboardStats);

// 사용자 관리
router.get('/users', authenticateAdminNew, adminController.getUsers);
router.get('/users/:id', authenticateAdminNew, adminController.getUserById);
router.put('/users/:id', authenticateAdminNew, adminController.updateUser);
router.put('/users/:id/block', authenticateAdminNew, adminController.blockUser);
router.put('/users/:id/unblock', authenticateAdminNew, adminController.unblockUser);

// 모임 관리
router.get('/meetups', authenticateAdminNew, adminController.getMeetups);
router.get('/meetups/:id', authenticateAdminNew, adminController.getMeetupById);
router.put('/meetups/:id', authenticateAdminNew, adminController.updateMeetup);
router.delete('/meetups/:id', authenticateAdminNew, adminController.deleteMeetup);

// 신고 관리
router.get('/reports', authenticateAdminNew, adminController.getReports);
router.put('/reports/:id', authenticateAdminNew, adminController.handleReport);

// 공지사항 관리
router.get('/notices', adminController.getNotices);
router.post('/notices', authenticateAdminNew, adminController.createNotice);
router.put('/notices/:id', authenticateAdminNew, adminController.updateNotice);
router.patch('/notices/:id/pin', authenticateAdminNew, adminController.pinNotice);
router.delete('/notices/:id', authenticateAdminNew, adminController.deleteNotice);

// 시스템 설정
router.get('/settings', authenticateAdminNew, adminController.getSettings);
router.put('/settings', authenticateAdminNew, adminController.updateSettings);

// 차단 관리
router.get('/blocked-users', authenticateAdminNew, adminController.getBlockedUsers);
router.get('/blocking-stats', authenticateAdminNew, adminController.getBlockingStats);
router.post('/users/bulk-unblock', authenticateAdminNew, adminController.bulkUnblock);

// 사용자 상세 및 포인트
router.get('/users/:userId/details', authenticateAdminNew, adminController.getUserDetails);
router.post('/users/:userId/points', authenticateAdminNew, adminController.updateUserPoints);

// 사용자 차단 (POST/DELETE 레거시 방식)
router.post('/users/:userId/block', authenticateAdminNew, adminController.blockUser);
router.delete('/users/:userId/unblock', authenticateAdminNew, adminController.unblockUser);

// 관리자 계정 관리
router.get('/accounts', authenticateAdminNew, adminController.getAccounts);
router.post('/accounts', authenticateAdminNew, adminController.createAccount);
router.put('/accounts/:adminId', authenticateAdminNew, adminController.updateAccount);
router.put('/accounts/:adminId/password', authenticateAdminNew, adminController.updateAccountPassword);
router.delete('/accounts/:adminId', authenticateAdminNew, adminController.deleteAccount);

// 챗봇 설정
router.get('/chatbot/settings', authenticateAdminNew, adminController.getChatbotSettings);
router.put('/chatbot/settings/:id', authenticateAdminNew, adminController.updateChatbotSettings);

// 실시간 통계
router.get('/realtime-stats', authenticateAdminNew, adminController.getRealtimeStats);

// 대시보드 실시간 (legacy path)
router.get('/dashboard/realtime', authenticateAdminNew, adminController.getRealtimeStats);

// 대시보드 통계 수집
router.post('/dashboard/collect-stats', authenticateAdminNew, adminController.collectDashboardStats);

// 통계 리포트
router.get('/reports/:type', authenticateAdminNew, adminController.getStatReports);

// 리뷰 관리 (강화) - static routes first
router.get('/reviews/stats', authenticateAdminNew, adminController.getReviewStats);
router.get('/reviews', authenticateAdminNew, adminController.getReviews);
router.delete('/reviews/:reviewId', authenticateAdminNew, adminController.deleteReview);
router.patch('/reviews/:reviewId/delete', authenticateAdminNew, adminController.softDeleteReview);
router.patch('/reviews/:reviewId/hide', authenticateAdminNew, adminController.hideReview);
router.patch('/reviews/:reviewId/restore', authenticateAdminNew, adminController.restoreReview);

// 간단 통계 (legacy /admin/stats)
router.get('/stats', authenticateAdminNew, adminController.getStats);

// 리포트 다운로드
router.get('/reports/download/:type', authenticateAdminNew, adminController.downloadReports);

// 모임 상세 조회 (관리자용)
router.get('/meetups/:meetupId/details', authenticateAdminNew, adminController.getMeetupDetails);

// 모임 상태 변경 액션
router.put('/meetups/:id/:action', authenticateAdminNew, adminController.updateMeetupAction);

// 사용자 상태 변경 액션
router.put('/users/:id/:action', authenticateAdminNew, adminController.updateUserAction);

// 약속금/결제 관리 - static routes first
router.get('/deposits/stats', authenticateAdminNew, adminController.getDepositStats);
router.get('/deposits', authenticateAdminNew, adminController.getDeposits);
router.post('/deposits/:id/refund', authenticateAdminNew, adminController.processDepositRefund);
router.get('/revenue', authenticateAdminNew, adminController.getRevenue);

// 뱃지 관리 - static routes first
router.get('/badges/stats', authenticateAdminNew, adminController.getBadgeStats);
router.get('/badges', authenticateAdminNew, adminController.getBadges);
router.post('/badges', authenticateAdminNew, adminController.createBadge);
router.post('/badges/award', authenticateAdminNew, adminController.awardBadge);
router.post('/badges/revoke', authenticateAdminNew, adminController.revokeBadge);
router.put('/badges/:id', authenticateAdminNew, adminController.updateBadge);
router.delete('/badges/:id', authenticateAdminNew, adminController.deleteBadge);

// 알림 관리 - static routes first
router.get('/notifications/stats', authenticateAdminNew, adminController.getNotificationStats);
router.get('/notifications', authenticateAdminNew, adminController.getNotifications);
router.post('/notifications/broadcast', authenticateAdminNew, adminController.broadcastNotification);

// 지원 티켓 관리 - static routes first
router.get('/support-tickets/stats', authenticateAdminNew, adminController.getSupportTicketStats);
router.get('/support-tickets', authenticateAdminNew, adminController.getSupportTickets);
router.put('/support-tickets/:id', authenticateAdminNew, adminController.updateSupportTicket);

// 채팅 관리 - static routes first
router.get('/chat/stats', authenticateAdminNew, adminController.getChatStats);
router.get('/chat-rooms', authenticateAdminNew, adminController.getChatRooms);
router.get('/chat-rooms/:id/messages', authenticateAdminNew, adminController.getChatMessages);
router.delete('/chat-messages/:id', authenticateAdminNew, adminController.deleteChatMessage);

// 광고 관리 (관리자 CRUD)
router.get('/advertisements', authenticateAdminNew, adminController.getAdvertisements);
router.post('/advertisements', authenticateAdminNew, adminController.createAdvertisement);
router.put('/advertisements/:id', authenticateAdminNew, adminController.updateAdvertisement);
router.delete('/advertisements/:id', authenticateAdminNew, adminController.deleteAdvertisement);
router.patch('/advertisements/:id/toggle', authenticateAdminNew, adminController.toggleAdvertisement);

// 감사 로그
router.get('/audit-logs', authenticateAdminNew, adminController.getAuditLogs);

module.exports = router;
