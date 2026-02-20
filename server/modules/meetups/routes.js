const express = require('express');
const router = express.Router();

// 분할된 컨트롤러들 import
const listController = require('./controllers/list.controller');
const crudController = require('./controllers/crud.controller');
const participationController = require('./controllers/participation.controller');
const attendanceController = require('./controllers/attendance.controller');
const reviewController = require('./controllers/review.controller');
const miscController = require('./controllers/misc.controller');

const { authenticateToken } = require('../../middleware/auth');

// === 특수 엔드포인트 (/:id보다 먼저 정의해야 함) ===

// 홈화면용 활성 모임 목록
router.get('/home', listController.getHomeMeetups);

// 활성 모임 목록 조회
router.get('/active', listController.getActiveMeetups);

// 완료된 모임 목록 조회
router.get('/completed', authenticateToken, listController.getCompletedMeetups);

// 주변 모임 검색 (GPS 기반)
router.get('/nearby', listController.getNearbyMeetups);

// 내 모임 목록 조회
router.get('/my', authenticateToken, listController.getMyMeetups);

// === 일반 엔드포인트 ===

// 모임 목록 조회
router.get('/', listController.getMeetups);

// 모임 생성
router.post('/', authenticateToken, crudController.createMeetup);

// 모임 상세 조회
router.get('/:id', crudController.getMeetupById);

// 모임 수정
router.put('/:id', authenticateToken, crudController.updateMeetup);

// 모임 삭제
router.delete('/:id', authenticateToken, crudController.deleteMeetup);

// 모임 참가
router.post('/:id/join', authenticateToken, participationController.joinMeetup);

// 모임 참가 취소
router.delete('/:id/leave', authenticateToken, participationController.leaveMeetup);

// 모임 참가 취소 (POST 버전 - 레거시 호환)
router.post('/:id/leave', authenticateToken, participationController.leaveMeetup);

// 모임 참가자 목록
router.get('/:id/participants', participationController.getParticipants);

// 참가 승인/거절 (호스트용)
router.put('/:id/participants/:participantId', authenticateToken, participationController.updateParticipantStatus);

// 모임 상태 변경
router.patch('/:id/status', authenticateToken, crudController.updateMeetupStatus);

// 최근 본 글 기록 (조회수)
router.post('/:id/view', authenticateToken, miscController.addView);

// 찜 상태 확인
router.get('/:id/wishlist', authenticateToken, miscController.checkWishlist);

// 찜 추가
router.post('/:id/wishlist', authenticateToken, miscController.addWishlist);

// 찜 삭제
router.delete('/:id/wishlist', authenticateToken, miscController.removeWishlist);

// 모임 리뷰 작성
router.post('/:id/reviews', authenticateToken, reviewController.createReview);

// 리뷰 목록 조회
router.get('/:id/reviews', reviewController.getReviews);

// 참가자 개별 리뷰 작성
router.post('/:id/user-reviews', authenticateToken, reviewController.createUserReview);

// 모임 확정/취소
router.put('/:id/confirm', authenticateToken, miscController.confirmMeetup);

// 출석 현황 조회 (CheckInButton.tsx에서 사용)
router.get('/:id/attendance', authenticateToken, attendanceController.getAttendance);

// GPS 체크인
router.post('/:id/checkin/gps', authenticateToken, attendanceController.gpsCheckin);

// QR 코드 생성 (호스트용)
router.post('/:id/qrcode/generate', authenticateToken, attendanceController.generateQRCode);

// QR 코드 체크인
router.post('/:id/checkin/qr', authenticateToken, attendanceController.qrCheckin);

// 리뷰 가능한 참가자 목록
router.get('/:id/reviewable-participants', authenticateToken, reviewController.getReviewableParticipants);

// 호스트 출석 확인
router.post('/:id/attendance/host-confirm/:participantId', authenticateToken, attendanceController.hostConfirmAttendance);

// 참가자 출석 상태 조회 (호스트용)
router.get('/:id/attendance/participants', authenticateToken, attendanceController.getAttendanceParticipants);

// 상호 확인
router.post('/:id/attendance/mutual-confirm/:participantId', authenticateToken, attendanceController.mutualConfirmAttendance);

// 위치 인증
router.post('/:id/verify-location', authenticateToken, attendanceController.verifyLocation);

// 상호 확인 가능한 참가자 목록
router.get('/:id/attendance/confirmable-participants', authenticateToken, miscController.getConfirmableParticipants);

// 노쇼 패널티 적용
router.post('/:id/apply-no-show-penalties', authenticateToken, miscController.applyNoShowPenalties);

// QR코드 조회 (호스트용)
router.get('/:id/attendance/qr-code', authenticateToken, attendanceController.getQRCode);

// QR코드 스캔 체크인
router.post('/:id/attendance/qr-scan', authenticateToken, attendanceController.qrCheckin);

// 모임 진행 확인 요청
router.post('/:id/progress-check', authenticateToken, miscController.progressCheck);

// 모임 진행 응답
router.post('/:id/progress-response', authenticateToken, miscController.progressResponse);

module.exports = router;
