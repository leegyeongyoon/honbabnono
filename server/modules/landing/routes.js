const express = require('express');
const router = express.Router();
const controller = require('./controller');
const validate = require('../../middleware/validate');
const { trackEventSchema, submitLeadSchema } = require('../../middleware/schemas/landing.schemas');

// 공개 — 인증 없음 (가짜문 검증 랜딩에서 호출). index.js에서 apiLimiter 적용.
router.post('/event', validate({ body: trackEventSchema }), controller.trackEvent);
router.post('/lead', validate({ body: submitLeadSchema }), controller.submitLead);

module.exports = router;
