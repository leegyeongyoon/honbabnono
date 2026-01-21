const express = require('express');
const router = express.Router();
const pointsController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// 포인트 조회
router.get('/', authenticateToken, pointsController.getPoints);

// 포인트 내역 조회
router.get('/history', authenticateToken, pointsController.getPointHistory);

// 포인트 적립
router.post('/earn', authenticateToken, pointsController.earnPoints);

// 포인트 사용
router.post('/use', authenticateToken, pointsController.usePoints);

// 약속금 결제
router.post('/deposit', authenticateToken, pointsController.payDeposit);

// 약속금 환불
router.post('/refund', authenticateToken, pointsController.refundDeposit);

module.exports = router;
