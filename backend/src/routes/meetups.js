const express = require('express');
const router = express.Router();
const meetupController = require('../controllers/meetupController');
const authenticateToken = require('../middleware/auth');

// 모임 목록 조회 (인증 불필요)
router.get('/', meetupController.getMeetups);

// 특정 경로 라우트를 /:id 보다 먼저 정의 (URL 충돌 방지)
router.get('/home', meetupController.getHomeMeetups);

// 내 모임 목록 조회 (인증 필요) - /:id 보다 먼저 정의
router.get('/my/list', authenticateToken, meetupController.getMyMeetups);

// 모임 상세 조회 (인증 불필요)
router.get('/:id', meetupController.getMeetupById);

// 모임 생성 (인증 필요)
router.post('/', authenticateToken, meetupController.createMeetup);

// 모임 참가 신청 (인증 필요)
router.post('/:id/join', authenticateToken, meetupController.joinMeetup);

// 참가 신청 승인/거절 (인증 필요)
router.patch('/:id/participants/:participantId', authenticateToken, meetupController.updateParticipantStatus);

// GPS 체크인 (출석 인증)
router.post('/:id/check-in', authenticateToken, meetupController.checkInMeetup);

// 출석 현황 조회
router.get('/:id/attendance', authenticateToken, meetupController.getAttendance);

// 모임 상태 변경 (호스트 전용)
router.patch('/:id/status', authenticateToken, meetupController.updateMeetupStatus);

// 찜(Wishlist) 관련 라우트
router.get('/:id/wishlist', authenticateToken, meetupController.getWishlistStatus);
router.post('/:id/wishlist', authenticateToken, meetupController.addToWishlist);
router.delete('/:id/wishlist', authenticateToken, meetupController.removeFromWishlist);

module.exports = router;