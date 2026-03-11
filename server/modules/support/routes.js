const express = require('express');
const router = express.Router();
const supportController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// 공지사항 조회
router.get('/notices', supportController.getNotices);
router.get('/notices/:id', supportController.getNoticeById);

// FAQ 목록 조회
router.get('/faq', supportController.getFaq);

// 문의하기
router.post('/inquiry', authenticateToken, supportController.createInquiry);

// 내 문의 내역 조회
router.get('/my-inquiries', authenticateToken, supportController.getMyInquiries);

module.exports = router;
