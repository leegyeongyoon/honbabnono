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
router.get('/realtime-stats', adminController.getRealtimeStats);

// 대시보드 실시간 (legacy path)
router.get('/dashboard/realtime', authenticateAdminNew, adminController.getRealtimeStats);

// 대시보드 통계 수집
router.post('/dashboard/collect-stats', authenticateAdminNew, adminController.collectDashboardStats);

// 통계 리포트
router.get('/reports/:type', authenticateAdminNew, adminController.getStatReports);

// 리뷰 관리
router.delete('/reviews/:reviewId', authenticateAdminNew, adminController.deleteReview);
router.patch('/reviews/:reviewId/delete', authenticateAdminNew, adminController.softDeleteReview);

// 간단 통계 (legacy /admin/stats)
router.get('/stats', adminController.getStats);

// 리포트 다운로드
router.get('/reports/download/:type', authenticateAdminNew, adminController.downloadReports);

// 모임 상세 조회 (관리자용)
router.get('/meetups/:meetupId/details', authenticateAdminNew, adminController.getMeetupDetails);

// 모임 상태 변경 액션
router.put('/meetups/:id/:action', authenticateAdminNew, adminController.updateMeetupAction);

// 사용자 상태 변경 액션
router.put('/users/:id/:action', authenticateAdminNew, adminController.updateUserAction);

module.exports = router;
