const express = require('express');
const router = express.Router();
const chatController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// 1대1 채팅 권한 체크
router.get('/check-direct-chat-permission', chatController.checkDirectChatPermission);

// 채팅방 목록 조회
router.get('/rooms', authenticateToken, chatController.getChatRooms);

// 읽지 않은 채팅 수 조회
router.get('/unread-count', authenticateToken, chatController.getUnreadCount);

// 모임 ID로 채팅방 조회
router.get('/rooms/by-meetup/:meetupId', authenticateToken, chatController.getChatRoomByMeetup);

// 채팅 메시지 조회
router.get('/rooms/:id/messages', authenticateToken, chatController.getMessages);

// 메시지 전송
router.post('/rooms/:id/messages', authenticateToken, chatController.sendMessage);

// 메시지 읽음 처리
router.post('/rooms/:id/read', authenticateToken, chatController.markAsRead);

// 채팅방 나가기
router.delete('/rooms/:id/leave', authenticateToken, chatController.leaveChatRoom);

// 모든 채팅 읽음 처리
router.post('/read-all', authenticateToken, chatController.markAllAsRead);

module.exports = router;
