const express = require('express');
const router = express.Router();
const adsController = require('./controller');

// 전체 광고 목록 조회
router.get('/', adsController.getAllAds);

// 활성 광고 목록 조회 (공개)
router.get('/active', adsController.getActiveAds);

// 광고 클릭 기록 (공개)
router.post('/:id/click', adsController.recordClick);

// 광고 디테일 조회 (공개)
router.get('/detail/:id', adsController.getAdDetail);

module.exports = router;
