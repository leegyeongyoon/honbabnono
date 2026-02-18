const express = require('express');
const router = express.Router();
const notificationController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// 알림 목록 조회
router.get('/', authenticateToken, notificationController.getNotifications);

// 읽지 않은 알림 수
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);

// 알림 읽음 처리
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

// 모든 알림 읽음 처리
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

// 모든 알림 읽음 처리 (legacy path)
router.put('/mark-all-read', authenticateToken, notificationController.markAllAsRead);

// 알림 삭제
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

// 알림 설정 조회
router.get('/settings', authenticateToken, notificationController.getSettings);

// 알림 설정 변경
router.put('/settings', authenticateToken, notificationController.updateSettings);

// 테스트 알림 생성
router.post('/test', authenticateToken, notificationController.createTestNotification);

// 디바이스 FCM 토큰 등록
router.post('/device-token', authenticateToken, notificationController.registerToken);

// 디바이스 FCM 토큰 해제
router.delete('/device-token', authenticateToken, notificationController.unregisterToken);

// PATCH 버전 알림 읽음 처리
router.patch('/:notificationId/read', authenticateToken, notificationController.markAsReadPatch);

// PATCH 버전 모든 알림 읽음 처리
router.patch('/read-all', authenticateToken, notificationController.markAllAsRead);

module.exports = router;
