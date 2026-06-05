const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken, authenticateMerchant } = require('../../middleware/auth');

// ============================================================
// 예약 기반 1:1 채팅 라우트 — 마운트 경로: /api/reservation-chat
// ============================================================

// 내 채팅방 목록 (고객) — /rooms/:id보다 먼저
router.get('/rooms/my', authenticateToken, controller.getMyRooms);

// 예약으로 채팅방 조회 (고객/점주 공용)
router.get('/rooms/by-reservation/:reservationId', authenticateToken, controller.getRoomByReservation);

// 채팅방 생성/조회 (고객)
router.post('/rooms', authenticateToken, controller.createOrGetRoom);

// 메시지 목록 / 전송 / 읽음
router.get('/rooms/:id/messages', authenticateToken, controller.getMessages);
router.post('/rooms/:id/messages', authenticateToken, controller.sendMessage);
router.post('/rooms/:id/read', authenticateToken, controller.markRead);

// 미읽음 합계
router.get('/unread-count', authenticateToken, controller.getUnreadCount);

// 점주 전용
router.get('/merchant/rooms', authenticateMerchant, controller.getMerchantRooms);
router.get('/merchant/unread-count', authenticateMerchant, controller.getMerchantUnreadCount);

module.exports = router;
