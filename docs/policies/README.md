# 혼밥시러 비즈니스 로직 정책 문서 인덱스

> 최종 업데이트: 2024-01-23

## 문서 현황 요약

| 카테고리 | 완료 | 대기 | 전체 |
|----------|------|------|------|
| 약속금/결제 | 3 | 0 | 3 |
| 포인트 | 1 | 0 | 1 |
| 모임 관리 | 1 | 0 | 1 |
| 리뷰 | 1 | 0 | 1 |
| 출석 | 1 | 0 | 1 |
| 사용자 | 1 | 0 | 1 |
| 뱃지 | 1 | 0 | 1 |
| 채팅 | 1 | 0 | 1 |
| 알림 | 1 | 0 | 1 |
| AI/검색 | 1 | 0 | 1 |
| 고객지원 | 1 | 0 | 1 |
| 관리자 | 1 | 0 | 1 |
| 노쇼 시스템 | 1 | 0 | 1 |
| **합계** | **15** | **0** | **15** |

---

## 완료 문서 목록

| 문서명 | 설명 | 상태 |
|--------|------|------|
| [DEPOSIT_POLICY.md](./DEPOSIT_POLICY.md) | 약속금 시스템 정책 | ✅ 완료 |
| [CANCELLATION_POLICY.md](./CANCELLATION_POLICY.md) | 취소 정책 (시간대별 환불율) | ✅ 완료 |
| [NOSHOW_POLICY.md](./NOSHOW_POLICY.md) | 노쇼 처리 정책 | ✅ 완료 |
| [POINTS_POLICY.md](./POINTS_POLICY.md) | 포인트 시스템 정책 | ✅ 완료 |
| [MEETUP_POLICY.md](./MEETUP_POLICY.md) | 모임 관리 정책 | ✅ 완료 |
| [REVIEW_POLICY.md](./REVIEW_POLICY.md) | 리뷰 시스템 정책 | ✅ 완료 |
| [ATTENDANCE_POLICY.md](./ATTENDANCE_POLICY.md) | 출석 시스템 정책 (GPS/QR/상호확인) | ✅ 완료 |
| [USER_POLICY.md](./USER_POLICY.md) | 사용자 관리 정책 (밥알지수/차단/설정) | ✅ 완료 |
| [BADGE_POLICY.md](./BADGE_POLICY.md) | 뱃지 시스템 정책 | ✅ 완료 |
| [CHAT_POLICY.md](./CHAT_POLICY.md) | 채팅 시스템 정책 (1:1/모임채팅) | ✅ 완료 |
| [NOTIFICATION_POLICY.md](./NOTIFICATION_POLICY.md) | 알림 시스템 정책 | ✅ 완료 |
| [AI_SEARCH_POLICY.md](./AI_SEARCH_POLICY.md) | AI 검색/추천 정책 (OpenAI/Kakao) | ✅ 완료 |
| [SUPPORT_POLICY.md](./SUPPORT_POLICY.md) | 고객지원 정책 (FAQ/문의/공지) | ✅ 완료 |
| [ADMIN_POLICY.md](./ADMIN_POLICY.md) | 관리자 시스템 정책 (대시보드/계정/설정) | ✅ 완료 |
| [NOSHOW_SYSTEM_POLICY.md](./NOSHOW_SYSTEM_POLICY.md) | 노쇼 시스템 구현 상세 (신고/처리/배상) | ✅ 완료 |

---

## 전체 비즈니스 로직 상세 목록

### 1. 사용자 시스템 (USER_POLICY.md) ✅ 완료

#### 1.1 프로필 관리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 내 정보 조회 | 로그인 사용자 정보 반환 | `getMe` |
| 다른 사용자 프로필 조회 | 특정 사용자 공개 정보 조회 | `getProfile` |
| 프로필 업데이트 | 이름, 이미지, 소개 등 수정 | `updateProfile` |
| 계정 삭제 | 회원 탈퇴 처리 | `deleteAccount` |
| 비밀번호 변경 | 이메일 가입 사용자 비밀번호 변경 | `changePassword` |
| 데이터 내보내기 | 개인정보 다운로드 | `exportData` |

#### 1.2 통계/지수
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 사용자 통계 조회 | 참가/주최 모임 수, 리뷰 수 등 | `getStats` |
| 밥알지수 계산 | 신뢰도 점수 (0-100) | `getRiceIndex` |

#### 1.3 찜/최근 본 글
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 찜 목록 조회 | 찜한 모임 목록 | `getWishlist`, `getWishlists` |
| 찜 토글 | 찜 추가/삭제 토글 | `toggleWishlist` |
| 최근 본 글 조회 | 조회한 모임 목록 | `getRecentViews` |
| 최근 본 글 삭제 | 개별/전체 삭제 | `deleteRecentView`, `deleteAllRecentViews` |

#### 1.4 차단 관리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 사용자 차단 | 특정 사용자 차단 | `blockUser` |
| 차단 해제 | 차단 취소 | `unblockUser` |
| 차단 목록 조회 | 차단한 사용자 목록 | `getBlockedUsers` |
| 차단 상태 확인 | 특정 사용자 차단 여부 | `checkBlockedStatus` |

#### 1.5 설정 관리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 알림 설정 조회 | 푸시, 채팅, 마케팅 등 | `getNotificationSettings` |
| 알림 설정 변경 | 설정값 업데이트 | `updateNotificationSettings` |
| 개인정보 설정 조회 | 공개 범위 등 | `getPrivacySettings` |
| 개인정보 설정 변경 | 설정값 업데이트 | `updatePrivacySettings` |

#### 1.6 초대 시스템
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 초대 코드 조회/생성 | 내 초대 코드 | `getInviteCode` |
| 초대 코드 사용 | 다른 사람 코드로 가입 | `useInviteCode` |

#### 1.7 활동 내역
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 활동 내역 조회 | 전체 활동 로그 | `getActivities` |
| 주최한 모임 조회 | 호스트로 생성한 모임 | `getHostedMeetups` |
| 참가한 모임 조회 | 참가자로 참여한 모임 | `getJoinedMeetups` |

---

### 2. 출석 시스템 (ATTENDANCE_POLICY.md) ✅ 완료

#### 2.1 체크인 방식
| 로직 | 설명 | 함수명 | 거리제한 |
|------|------|--------|---------|
| GPS 체크인 | GPS 위치 기반 자동 확인 | `gpsCheckin` | 100m |
| QR 코드 생성 | 호스트용 QR 생성 (10분 유효) | `generateQRCode`, `getQRCode` | - |
| QR 코드 체크인 | QR 스캔으로 출석 | `qrCheckin`, `qrScanCheckin` | - |
| 호스트 출석 확인 | 호스트가 참가자 수동 확인 | `hostConfirmAttendance` | - |
| 상호 확인 | 참가자들끼리 서로 확인 | `mutualConfirmAttendance` | - |
| 자가 보고 | 참가자 스스로 응답 | `progressResponse` | - |

#### 2.2 출석 관리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 참가자 출석 상태 조회 | 호스트용 출석 현황 | `getAttendanceParticipants` |
| 상호 확인 가능 참가자 | 확인 가능한 참가자 목록 | `getConfirmableParticipants` |
| 모임 위치 인증 | 위치 검증만 수행 | `verifyLocation` |
| 진행 확인 요청 | 호스트→참가자 확인 요청 | `progressCheck` |
| 리뷰 가능 참가자 | 출석 완료 참가자 목록 | `getReviewableParticipants` |

---

### 3. 노쇼 시스템 (NOSHOW_SYSTEM_POLICY.md) ✅ 완료

> 기존 NOSHOW_POLICY.md는 정책 설명, 이 문서는 시스템 구현 상세

#### 3.1 신고/처리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 노쇼 신고 | 참가자→참가자 노쇼 신고 | `reportNoShow` |
| 노쇼 현황 조회 | 모임별 노쇼 신고 현황 | `getNoShowStatus` |
| 노쇼 처리 실행 | 관리자/스케줄러 실행 | `processNoShow` |
| 노쇼 패널티 적용 | 호스트가 패널티 적용 | `applyNoShowPenalties` |

#### 3.2 배상/제재
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 피해자 배상 | 몰수금 70% 출석자 분배 | `processNoShow` 내부 |
| 플랫폼 수수료 | 몰수금 30% 플랫폼 수익 | `processNoShow` 내부 |
| 밥알 점수 감소 | 노쇼 시 -15점 | `processNoShow` 내부 |
| 누적 노쇼 제재 | 3/5/10회 시 제한 | `checkNoShowRestriction` |

#### 3.3 조회/이의
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 내 배상금 내역 | 받은 배상금 목록 | `getMyCompensations` |
| 노쇼 이의 신청 | 이의 접수 | `appealNoShow` |
| 내 취소 이력 | 취소/노쇼 이력 | `getMyCancellationHistory` |
| 내 제재 현황 | 현재 제재 상태 | `getMyRestrictions` |

---

### 4. 뱃지 시스템 (BADGE_POLICY.md) ✅ 완료

#### 4.1 뱃지 조회
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 전체 뱃지 목록 | 모든 뱃지 조회 | `getAllBadges` |
| 획득 가능 뱃지 | 활성 뱃지 목록 | `getAvailableBadges` |
| 내 뱃지 목록 | 획득한 뱃지 조회 | `getMyBadges` |

#### 4.2 뱃지 진행률
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 진행률 조회 | 카테고리별 달성률 계산 | `getBadgeProgress` |
| 모임 참가 수 기반 | meetup_count 카테고리 | `getBadgeProgress` 내부 |
| 리뷰 작성 수 기반 | review_count 카테고리 | `getBadgeProgress` 내부 |

#### 4.3 뱃지 획득/설정
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 뱃지 획득 | 수동 획득 처리 | `earnBadge` |
| 대표 뱃지 설정 | 프로필 대표 뱃지 | `setFeaturedBadge` |
| 자동 획득 체크 | 조건 충족 시 자동 부여 | `checkBadgeEligibility` |

---

### 5. 채팅 시스템 (CHAT_POLICY.md) ✅ 완료

#### 5.1 권한/채팅방
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 1대1 채팅 권한 체크 | 성별, 모임내, 차단 검증 | `checkDirectChatPermission` |
| 채팅방 목록 조회 | 참여 중인 채팅방 | `getChatRooms` |
| 모임 채팅방 조회 | meetupId로 채팅방 찾기 | `getChatRoomByMeetup` |
| 채팅방 나가기 | 채팅방 퇴장 | `leaveChatRoom` |

#### 5.2 메시지
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 메시지 조회 | 채팅방 메시지 목록 (차단 필터링) | `getMessages` |
| 메시지 전송 | 새 메시지 발송 | `sendMessage` |
| 읽음 처리 | 특정 채팅방 읽음 | `markAsRead` |
| 전체 읽음 처리 | 모든 채팅방 읽음 | `markAllAsRead` |
| 읽지 않은 수 | 총 미읽 메시지 수 | `getUnreadCount` |

---

### 6. 알림 시스템 (NOTIFICATION_POLICY.md) ✅ 완료

#### 6.1 알림 관리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 알림 목록 조회 | 유형별 필터링 지원 | `getNotifications` |
| 읽지 않은 알림 수 | 미읽 알림 카운트 | `getUnreadCount` |
| 알림 읽음 처리 | 개별 알림 읽음 | `markAsRead`, `markAsReadPatch` |
| 전체 읽음 처리 | 모든 알림 읽음 | `markAllAsRead` |
| 알림 삭제 | 알림 제거 | `deleteNotification` |

#### 6.2 알림 설정
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 설정 조회 | 푸시, 채팅, 모임, 마케팅 | `getSettings` |
| 설정 변경 | 알림 유형별 on/off | `updateSettings` |

#### 6.3 알림 생성
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 알림 생성 | 내부 함수 | `createNotification` |
| 테스트 알림 | 개발용 테스트 | `createTestNotification` |

---

### 7. 고객지원 시스템 (SUPPORT_POLICY.md) ✅ 완료

#### 7.1 FAQ/문의
| 로직 | 설명 | 함수명 |
|------|------|--------|
| FAQ 목록 조회 | 카테고리별 필터링 | `getFaq` |
| 문의 접수 | 새 문의 생성 | `createInquiry` |
| 내 문의 내역 | 접수한 문의 목록 | `getMyInquiries` |

#### 7.2 법적 문서
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 이용약관 조회 | 현재 버전 조회 | `getTerms` |
| 개인정보처리방침 조회 | 현재 버전 조회 | `getPrivacyPolicy` |

#### 7.3 공지사항
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 공지 목록 조회 | 고정 우선 정렬 | `getNotices` |
| 공지 상세 조회 | 조회수 자동 증가 | `getNoticeById` |
| 앱 정보 조회 | 버전, 기능 목록 | `getAppInfo` |

---

### 8. AI/검색 시스템 (AI_SEARCH_POLICY.md) ✅ 완료

#### 8.1 AI 기능
| 로직 | 설명 | 함수명 |
|------|------|--------|
| AI 검색 | 자연어 의도 파악 후 검색 | `aiSearch` |
| 챗봇 | GPT 기반 대화형 도움 | `chatbot` |
| 모임 추천 | 참여 이력 기반 추천 | `recommendMeetups` |

#### 8.2 위치 검색
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 주소/장소 검색 | 카카오 API 프록시 | `searchAddress` |
| 키워드 검색 | 장소명/업체명 검색 | `searchAddress` 내부 |
| 주소 검색 | 도로명/지번 주소 검색 | `searchAddress` 내부 |

---

### 9. 관리자 시스템 (ADMIN_POLICY.md) ✅ 완료

#### 9.1 대시보드
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 대시보드 통계 | 전체 현황 집계 | `getDashboardStats` |
| 실시간 통계 | 현재 활성 데이터 | `getRealtimeStats` |
| 통계 수집 | 정기 집계 | `collectDashboardStats` |

#### 9.2 사용자 관리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 사용자 목록 | 검색/필터링 | `getUsers` |
| 사용자 상세 | 상세 정보 조회 | `getUserById`, `getUserDetails` |
| 사용자 수정 | 정보 변경 | `updateUser`, `updateUserAction` |
| 사용자 차단/해제 | 이용 제한 | `blockUser`, `unblockUser` |
| 포인트 조정 | 관리자 포인트 수정 | `updateUserPoints` |

#### 9.3 모임 관리
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 모임 목록 | 검색/필터링 | `getMeetups` |
| 모임 상세 | 상세 정보 조회 | `getMeetupById`, `getMeetupDetails` |
| 모임 수정 | 정보 변경 | `updateMeetup`, `updateMeetupAction` |
| 모임 삭제 | 모임 제거 | `deleteMeetup` |

#### 9.4 신고/리뷰
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 신고 목록 | 신고 현황 조회 | `getReports` |
| 신고 처리 | 신고 대응 처리 | `handleReport` |
| 리뷰 삭제 | 부적절한 리뷰 제거 | `deleteReview`, `softDeleteReview` |

#### 9.5 공지/설정
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 공지 관리 | CRUD + 고정 | `createNotice`, `updateNotice`, `deleteNotice`, `pinNotice` |
| 시스템 설정 | 앱 설정 관리 | `getSettings`, `updateSettings` |
| 챗봇 설정 | AI 챗봇 설정 | `getChatbotSettings`, `updateChatbotSettings` |

#### 9.6 계정/리포트
| 로직 | 설명 | 함수명 |
|------|------|--------|
| 관리자 계정 관리 | 어드민 계정 CRUD | `getAccounts`, `createAccount`, `updateAccount`, `deleteAccount` |
| 차단 사용자 관리 | 차단 현황/일괄 해제 | `getBlockedUsers`, `getBlockingStats`, `bulkUnblock` |
| 통계 리포트 | 리포트 생성/다운로드 | `getStatReports`, `downloadReports` |

---

## 작성 우선순위

### 1순위 (핵심 기능)
1. ✅ DEPOSIT_POLICY.md - 약속금 결제
2. ✅ CANCELLATION_POLICY.md - 취소 환불
3. ✅ NOSHOW_POLICY.md - 노쇼 정책
4. ✅ POINTS_POLICY.md - 포인트 시스템
5. ✅ MEETUP_POLICY.md - 모임 관리
6. ✅ REVIEW_POLICY.md - 리뷰 시스템

### 2순위 (사용자 경험)
7. ✅ ATTENDANCE_POLICY.md - 출석 시스템
8. ✅ USER_POLICY.md - 사용자 관리
9. ✅ BADGE_POLICY.md - 뱃지/업적

### 3순위 (커뮤니케이션)
10. ✅ CHAT_POLICY.md - 채팅 시스템
11. ✅ NOTIFICATION_POLICY.md - 알림 시스템

### 4순위 (부가 기능)
12. ✅ AI_SEARCH_POLICY.md - AI/검색
13. ✅ SUPPORT_POLICY.md - 고객지원

### 5순위 (관리)
14. ✅ ADMIN_POLICY.md - 관리자 기능

---

## 문서 작성 규칙

### 필수 구조
```markdown
# [정책명] (영문명)

> 최종 업데이트: YYYY-MM-DD

## 1. 개요

## 2. [주요 개념 설명]

## 3. [핵심 로직별 상세 설명]
### 3.1 로직명
- 설명
- 조건/검증
- 처리 흐름 (코드 예시 또는 의사코드)
- 에러 케이스

## 4. API 엔드포인트
| 메서드 | 경로 | 설명 |
|--------|------|------|

## 5. 데이터 구조
```javascript
// 관련 테이블/객체 구조
```

## 6. 에러 처리
| 에러 코드 | 상황 | 메시지 |

## 7. 변경 이력
| 날짜 | 버전 | 변경 내용 |
```

### 주의사항
- 코드는 의사코드 또는 핵심 로직만 포함
- 실제 구현 세부사항은 코드 참조 안내
- 비즈니스 규칙 중심 설명

---

## 업데이트 기록

| 날짜 | 변경 내용 |
|------|----------|
| 2024-01-23 | 초기 인덱스 생성, DEPOSIT/CANCELLATION/NOSHOW 완료 |
| 2024-01-23 | POINTS/MEETUP/REVIEW 정책 문서 추가 |
| 2024-01-23 | 전체 비즈니스 로직 상세 목록 작성 (16개 카테고리, 150+ 개별 로직) |
| 2024-01-23 | ATTENDANCE/USER/BADGE/CHAT/NOTIFICATION/AI_SEARCH/SUPPORT/ADMIN/NOSHOW_SYSTEM 정책 문서 추가 (15/15 완료) |
