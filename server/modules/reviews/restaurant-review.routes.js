const express = require('express');
const router = express.Router();
const controller = require('./restaurant-review.controller');
const { authenticateToken, authenticateMerchant } = require('../../middleware/auth');

// ============================================================
// 매장 리뷰 라우트 — 잇테이블 v2
// 마운트 경로: /api/reviews/restaurant
// ============================================================

// 내가 작성한 매장 리뷰 목록 (※ :restaurantId 보다 먼저 선언해야 'my'가 파라미터로 잡히지 않음)
router.get('/my', authenticateToken, controller.getMyRestaurantReviews);

// 특정 매장의 리뷰 목록 (public)
router.get('/:restaurantId', controller.getRestaurantReviews);

// 매장 리뷰 작성
router.post('/', authenticateToken, controller.createRestaurantReview);

// 리뷰 답변 (점주)
router.put('/:id/reply', authenticateMerchant, controller.replyToReview);

module.exports = router;
