const express = require('express');
const router = express.Router();
const aiController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// AI 검색
router.post('/search', aiController.aiSearch);

// 챗봇 메시지
router.post('/chatbot', authenticateToken, aiController.chatbot);

// 모임 추천
router.get('/recommend', authenticateToken, aiController.recommendMeetups);

module.exports = router;
