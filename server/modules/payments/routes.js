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

// 결제 준비 (merchant_uid 생성, payments 테이블 pending 레코드)
router.post('/prepare', authenticateToken, validate({ body: preparePaymentSchema }), controller.preparePayment);

// 결제 완료 확인 (imp_uid로 PortOne 검증, 상태 업데이트)
router.post('/complete', authenticateToken, validate({ body: verifyPaymentSchema }), controller.completePayment);

// 레거시 호환: /verify -> /complete
router.post('/verify', authenticateToken, validate({ body: verifyPaymentSchema }), controller.completePayment);

// PortOne 웹훅 수신 (인증 없음 - PortOne 서버에서 호출)
router.post('/webhook', controller.handleWebhook);

// 예약별 결제 정보 조회
router.get('/reservation/:reservationId', authenticateToken, controller.getPaymentByReservation);

// 환불 처리 (매장별 환불 정책 적용)
router.post('/:id/refund', authenticateToken, validate({ body: refundPaymentSchema }), controller.refundPayment);

module.exports = router;
