const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authenticateToken = require('../middleware/auth');

// 모임 리뷰 작성
router.post('/meetups/:id/reviews', authenticateToken, reviewController.createReview);

// 모임 리뷰 목록 조회
router.get('/meetups/:id/reviews', authenticateToken, reviewController.getMeetupReviews);

// 리뷰 작성 가능한 대상 목록 조회
router.get('/meetups/:id/reviewable-participants', authenticateToken, reviewController.getReviewableParticipants);

// 사용자가 받은 리뷰 목록 조회
router.get('/users/:userId/reviews', reviewController.getUserReviews);

module.exports = router;
