const express = require('express');
const router = express.Router();
const depositsController = require('./controller');
const { authenticateToken, authenticateAdminNew } = require('../../middleware/auth');

// ============================================
// PortOne 결제 연동 API
// ============================================

// 결제 준비 (merchant_uid 생성)
router.post('/prepare', authenticateToken, depositsController.preparePayment);

// 결제 검증 (클라이언트 결제 완료 후)
router.post('/verify', authenticateToken, depositsController.verifyPayment);

// PortOne 환불
router.post('/portone-refund', authenticateToken, depositsController.refundDepositViaPortone);

// ============================================
// 약속금 기본 API
// ============================================

// 약속금 결제 (레거시 - 포인트/목업)
router.post('/payment', authenticateToken, depositsController.createPayment);

// 약속금 일반 환불
router.post('/refund', authenticateToken, depositsController.refundPayment);

// 특정 약속금 환불
router.post('/:id/refund', authenticateToken, depositsController.refundDeposit);

// 약속금 포인트 전환
router.post('/:id/convert-to-points', authenticateToken, depositsController.convertToPoints);

// ============================================
// 취소 정책 기반 API
// ============================================

// 환불 예상 금액 조회
router.get('/refund-preview/:meetupId', authenticateToken, depositsController.getRefundPreview);

// 참가 취소 및 정책 기반 환불 처리
router.post('/cancel-participation/:meetupId', authenticateToken, depositsController.cancelParticipationWithRefund);

// 내 취소 이력 조회
router.get('/cancellation-history', authenticateToken, depositsController.getMyCancellationHistory);

// ============================================
// 노쇼 처리 API
// ============================================

// 노쇼 신고
router.post('/meetups/:meetupId/report-noshow', authenticateToken, depositsController.reportNoShow);

// 노쇼 현황 조회
router.get('/meetups/:meetupId/noshow-status', authenticateToken, depositsController.getNoShowStatus);

// 노쇼 처리 실행 (관리자 전용)
router.post('/noshow/process/:meetupId', authenticateAdminNew, depositsController.processNoShow);

// 노쇼 이의 신청
router.post('/noshow/appeal', authenticateToken, depositsController.appealNoShow);

// ============================================
// 배상금 및 제재 API
// ============================================

// 내 배상금 내역 조회
router.get('/compensations/my', authenticateToken, depositsController.getMyCompensations);

// 내 제재 현황 조회
router.get('/restrictions/my', authenticateToken, depositsController.getMyRestrictions);

module.exports = router;
