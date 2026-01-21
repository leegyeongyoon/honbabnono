const express = require('express');
const router = express.Router();
const meetupController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');

// === 특수 엔드포인트 (/:id보다 먼저 정의해야 함) ===

// 홈화면용 활성 모임 목록
router.get('/home', meetupController.getHomeMeetups);

// 활성 모임 목록 조회
router.get('/active', meetupController.getActiveMeetups);

// 완료된 모임 목록 조회
router.get('/completed', authenticateToken, meetupController.getCompletedMeetups);

// 주변 모임 검색 (GPS 기반)
router.get('/nearby', meetupController.getNearbyMeetups);

// 내 모임 목록 조회
router.get('/my', authenticateToken, meetupController.getMyMeetups);

// === 일반 엔드포인트 ===

// 모임 목록 조회
router.get('/', meetupController.getMeetups);

// 모임 생성
router.post('/', authenticateToken, meetupController.createMeetup);

// 모임 상세 조회
router.get('/:id', meetupController.getMeetupById);

// 모임 수정
router.put('/:id', authenticateToken, meetupController.updateMeetup);

// 모임 삭제
router.delete('/:id', authenticateToken, meetupController.deleteMeetup);

// 모임 참가
router.post('/:id/join', authenticateToken, meetupController.joinMeetup);

// 모임 참가 취소
router.delete('/:id/leave', authenticateToken, meetupController.leaveMeetup);

// 모임 참가 취소 (POST 버전 - 레거시 호환)
router.post('/:id/leave', authenticateToken, meetupController.leaveMeetupPost);

// 모임 참가자 목록
router.get('/:id/participants', meetupController.getParticipants);

// 참가 승인/거절 (호스트용)
router.put('/:id/participants/:participantId', authenticateToken, meetupController.updateParticipantStatus);

// 모임 상태 변경
router.patch('/:id/status', authenticateToken, meetupController.updateMeetupStatus);

// 최근 본 글 기록 (조회수)
router.post('/:id/view', authenticateToken, meetupController.addView);

// 찜 상태 확인
router.get('/:id/wishlist', authenticateToken, meetupController.checkWishlist);

// 찜 추가
router.post('/:id/wishlist', authenticateToken, meetupController.addWishlist);

// 찜 삭제
router.delete('/:id/wishlist', authenticateToken, meetupController.removeWishlist);

// 리뷰 작성
router.post('/:id/reviews', authenticateToken, meetupController.createReview);

// 리뷰 목록 조회
router.get('/:id/reviews', meetupController.getReviews);

// 모임 확정/취소
router.put('/:id/confirm', authenticateToken, meetupController.confirmMeetup);

// GPS 체크인
router.post('/:id/checkin/gps', authenticateToken, meetupController.gpsCheckin);

// QR 코드 생성 (호스트용)
router.post('/:id/qrcode/generate', authenticateToken, meetupController.generateQRCode);

// QR 코드 체크인
router.post('/:id/checkin/qr', authenticateToken, meetupController.qrCheckin);

// 리뷰 가능한 참가자 목록
router.get('/:id/reviewable-participants', authenticateToken, meetupController.getReviewableParticipants);

// 호스트 출석 확인
router.post('/:id/attendance/host-confirm', authenticateToken, meetupController.hostConfirmAttendance);

// 참가자 출석 상태 조회 (호스트용)
router.get('/:id/attendance/participants', authenticateToken, meetupController.getAttendanceParticipants);

// 상호 확인
router.post('/:id/attendance/mutual-confirm', authenticateToken, meetupController.mutualConfirmAttendance);

// 위치 인증
router.post('/:id/verify-location', authenticateToken, meetupController.verifyLocation);

// 상호 확인 가능한 참가자 목록
router.get('/:id/attendance/confirmable-participants', authenticateToken, meetupController.getConfirmableParticipants);

// 노쇼 패널티 적용
router.post('/:id/apply-no-show-penalties', authenticateToken, meetupController.applyNoShowPenalties);

// QR코드 조회 (호스트용)
router.get('/:id/attendance/qr-code', authenticateToken, meetupController.getQRCode);

// QR코드 스캔 체크인
router.post('/:id/attendance/qr-scan', authenticateToken, meetupController.qrScanCheckin);

// 모임 진행 확인 요청
router.post('/:id/progress-check', authenticateToken, meetupController.progressCheck);

// 모임 진행 응답
router.post('/:id/progress-response', authenticateToken, meetupController.progressResponse);

module.exports = router;
