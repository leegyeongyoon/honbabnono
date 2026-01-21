const express = require('express');
const router = express.Router();
const depositsController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// 약속금 결제
router.post('/payment', authenticateToken, depositsController.createPayment);

// 약속금 일반 환불
router.post('/refund', authenticateToken, depositsController.refundPayment);

// 특정 약속금 환불
router.post('/:id/refund', authenticateToken, depositsController.refundDeposit);

// 약속금 포인트 전환
router.post('/:id/convert-to-points', authenticateToken, depositsController.convertToPoints);

module.exports = router;
