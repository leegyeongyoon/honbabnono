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
  manualReservationSchema,
  modifyReservationSchema,
} = require('../../middleware/schemas/reservations.schemas');

// === 특수 엔드포인트 (/:id보다 먼저 정의해야 함) ===

// 내 예약 목록 조회
router.get('/my', authenticateToken, controller.getMyReservations);

// 점주 예약 목록 조회
router.get('/merchant', authenticateMerchant, controller.getMerchantReservations);

// 점주 수동(전화) 예약 등록
router.post('/manual', authenticateMerchant, validate({ body: manualReservationSchema }), controller.createManualReservation);

// === 일반 엔드포인트 ===

// 예약 생성
router.post('/', authenticateToken, validate({ body: createReservationSchema }), controller.createReservation);

// 예약 상세 조회
router.get('/:id', authenticateToken, controller.getReservationById);

// 취소 미리보기 (환불액 — 읽기 전용)
router.get('/:id/cancel-preview', authenticateToken, controller.cancelPreview);

// 예약 취소
router.put('/:id/cancel', authenticateToken, validate({ body: cancelReservationSchema }), controller.cancelReservation);

// 예약 변경 (날짜/시간/인원)
router.put('/:id/modify', authenticateToken, validate({ body: modifyReservationSchema }), controller.modifyReservation);

// 도착 상태 업데이트
router.put('/:id/arrival', authenticateToken, validate({ body: updateArrivalSchema }), controller.updateArrival);

// 체크인
router.post('/:id/checkin', authenticateToken, controller.checkin);

// 예약 상태 업데이트 (점주)
router.put('/:id/status', authenticateMerchant, validate({ body: updateStatusSchema }), controller.updateStatus);

// 노쇼 처리 (점주)
router.put('/:id/noshow', authenticateMerchant, controller.processNoShow);

module.exports = router;
