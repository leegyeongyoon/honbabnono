const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken, authenticateMerchant } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  createOrderSchema,
  updateCookingStatusSchema,
} = require('../../middleware/schemas/orders.schemas');

// === 특수 엔드포인트 (/:id보다 먼저 정의해야 함) ===

// 점주 주문 목록 조회
router.get('/merchant', authenticateMerchant, controller.getMerchantOrders);

// 예약별 주문 조회
router.get('/reservation/:reservationId', authenticateToken, controller.getOrderByReservation);

// === 일반 엔드포인트 ===

// 주문 생성
router.post('/', authenticateToken, validate({ body: createOrderSchema }), controller.createOrder);

// 주문 상세 조회
router.get('/:id', authenticateToken, controller.getOrderById);

// 조리 상태 업데이트 (점주)
router.put('/:id/cooking-status', authenticateMerchant, validate({ body: updateCookingStatusSchema }), controller.updateCookingStatus);

// 주문 거절 (점주)
router.put('/:id/reject', authenticateMerchant, controller.rejectOrder);

module.exports = router;
