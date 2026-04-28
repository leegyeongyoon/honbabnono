const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken, authenticateMerchant } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  createReservationSchema,
  updateArrivalSchema,
  updateStatusSchema,
  cancelReservationSchema,
} = require('../../middleware/schemas/reservations.schemas');

// === 특수 엔드포인트 (/:id보다 먼저 정의해야 함) ===

// 내 예약 목록 조회
router.get('/my', authenticateToken, controller.getMyReservations);

// 점주 예약 목록 조회
router.get('/merchant', authenticateMerchant, controller.getMerchantReservations);

// === 일반 엔드포인트 ===

// 예약 생성
router.post('/', authenticateToken, validate({ body: createReservationSchema }), controller.createReservation);

// 예약 상세 조회
router.get('/:id', authenticateToken, controller.getReservationById);

// 예약 취소
router.put('/:id/cancel', authenticateToken, validate({ body: cancelReservationSchema }), controller.cancelReservation);

// 도착 상태 업데이트
router.put('/:id/arrival', authenticateToken, validate({ body: updateArrivalSchema }), controller.updateArrival);

// 체크인
router.post('/:id/checkin', authenticateToken, controller.checkin);

// 예약 상태 업데이트 (점주)
router.put('/:id/status', authenticateMerchant, validate({ body: updateStatusSchema }), controller.updateStatus);

// 노쇼 처리 (점주)
router.put('/:id/noshow', authenticateMerchant, controller.processNoShow);

module.exports = router;
