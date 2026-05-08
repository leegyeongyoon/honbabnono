const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateToken, authenticateMerchant } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  registerMerchantSchema,
  updateMerchantSchema,
} = require('../../middleware/schemas/merchants.schemas');
const { documentUpload, uploadDocument } = require('./upload');

// ============================================
// 점주 등록/관리 API
// ============================================

// 점주 등록 신청
router.post('/register', authenticateToken, validate({ body: registerMerchantSchema }), controller.registerMerchant);

// 내 점주 정보 조회
router.get('/me', authenticateToken, controller.getMyMerchant);

// 내 점주 정보 수정
router.put('/me', authenticateMerchant, validate({ body: updateMerchantSchema }), controller.updateMerchant);

// 인증 상태 확인
router.get('/verification-status', authenticateToken, controller.getVerificationStatus);

// 서류 사진 업로드 (사업자등록증, 영업신고증, 통장사본)
router.post('/upload-doc', authenticateToken, documentUpload.single('document'), uploadDocument);

module.exports = router;
