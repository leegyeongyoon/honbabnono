const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateMerchant, authenticateAdmin } = require('../../middleware/auth');

// ============================================
// 점주 API
// ============================================

// 정산 요약 (총매출, 수수료, 순정산) — summary를 :id보다 먼저 정의
router.get('/merchant/summary', authenticateMerchant, controller.getMerchantSettlementSummary);

// 정산 목록 조회 (기간 필터, 페이지네이션)
router.get('/merchant', authenticateMerchant, controller.getMerchantSettlements);

// 정산 상세 (개별 주문 분해)
router.get('/merchant/:id', authenticateMerchant, controller.getMerchantSettlementDetail);

// ============================================
// 관리자 / 스케줄러 API
// ============================================

// 정산 실행 (관리자 또는 스케줄러에서 호출)
router.post('/process', authenticateAdmin, controller.processSettlements);

module.exports = router;
