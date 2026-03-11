const express = require('express');
const router = express.Router();
const reviewController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { createReviewSchema, updateReviewSchema, replyReviewSchema } = require('../../middleware/schemas/reviews.schemas');

// 모임 리뷰 목록 조회
router.get('/meetup/:meetupId', reviewController.getMeetupReviews);

// 리뷰 작성
router.post('/', authenticateToken, validate({ body: createReviewSchema }), reviewController.createReview);

// 리뷰 수정
router.put('/:id', authenticateToken, validate({ body: updateReviewSchema }), reviewController.updateReview);

// 리뷰 삭제
router.delete('/:id', authenticateToken, reviewController.deleteReview);

// 리뷰 답변 (호스트/리뷰 대상자)
router.post('/:id/reply', authenticateToken, validate({ body: replyReviewSchema }), reviewController.replyToReview);

// 리뷰 피처링 (관리자)
router.patch('/:reviewId/feature', authenticateToken, reviewController.featureReview);

// 참가자 개별 평가
router.post('/participant', authenticateToken, validate({ body: createReviewSchema }), reviewController.rateParticipant);

// 사용자 리뷰 통계 조회
router.get('/stats/:userId', reviewController.getUserReviewStats);

module.exports = router;
