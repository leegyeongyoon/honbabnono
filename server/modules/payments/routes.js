const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  preparePaymentSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
} = require('../../middleware/schemas/payments.schemas');

// 결제 준비 (merchant_uid 생성)
router.post('/prepare', authenticateToken, validate({ body: preparePaymentSchema }), controller.preparePayment);

// 결제 검증 (클라이언트 결제 완료 후)
router.post('/verify', authenticateToken, validate({ body: verifyPaymentSchema }), controller.verifyPayment);

// PortOne 웹훅 (인증 없음 - PortOne 서버에서 호출)
router.post('/webhook', controller.handleWebhook);

// 예약별 결제 조회
router.get('/reservation/:reservationId', authenticateToken, controller.getPaymentByReservation);

// 결제 환불
router.post('/:id/refund', authenticateToken, validate({ body: refundPaymentSchema }), controller.refundPayment);

module.exports = router;
