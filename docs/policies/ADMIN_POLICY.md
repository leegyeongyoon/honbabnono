# 관리자 시스템 정책 (Admin Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 관리자 시스템은 서비스 운영에 필요한 사용자 관리, 모임 관리, 통계 조회, 시스템 설정 등의 기능을 제공합니다.

## 2. 관리자 인증

### 2.1 로그인 (`login`)

```javascript
// 요청
POST /api/admin/login
{
  username: "admin",
  password: "password123"
}

// 처리 로직
SELECT * FROM admins WHERE username = $1 AND is_active = true

// 비밀번호 검증
const isValidPassword = await bcrypt.compare(password, admin.password_hash)

// JWT 토큰 생성
const token = jwt.sign({
  adminId: admin.id,
  username: admin.username,
  role: admin.role,
  isAdmin: true
}, JWT_SECRET, { expiresIn: '8h' })

// 마지막 로그인 시간 업데이트
UPDATE admins SET last_login = NOW() WHERE id = $1
```

### 2.2 토큰 정보

| 항목 | 값 |
|------|------|
| 만료 시간 | 8시간 |
| 페이로드 | adminId, username, role, isAdmin |

### 2.3 로그아웃 (`logout`)

클라이언트 측 토큰 삭제 처리 (서버는 상태 유지하지 않음)

### 2.4 프로필 조회 (`getProfile`)

현재 로그인한 관리자 정보 반환

## 3. 대시보드 통계

### 3.1 기본 통계 (`getDashboardStats`)

```javascript
// 응답
{
  success: true,
  stats: {
    totalUsers: 1500,      // 총 사용자 수
    totalMeetups: 800,     // 총 모임 수
    todayUsers: 25,        // 오늘 가입자 수
    todayMeetups: 15,      // 오늘 생성된 모임 수
    activeMeetups: 120     // 활성 모임 수 ('모집중', '모집완료')
  }
}
```

### 3.2 실시간 통계 (`getRealtimeStats`)

```javascript
SELECT
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '1 hour') as new_users_hour,
  (SELECT COUNT(*) FROM meetups WHERE created_at > NOW() - INTERVAL '1 hour') as new_meetups_hour,
  (SELECT COUNT(*) FROM meetup_participants WHERE joined_at > NOW() - INTERVAL '1 hour') as new_participants_hour,
  (SELECT COUNT(*) FROM meetups WHERE status = '모집중') as active_meetups,
  (SELECT COUNT(DISTINCT user_id) FROM meetup_participants WHERE joined_at > NOW() - INTERVAL '24 hours') as active_users_day
```

### 3.3 통계 수집 (`collectDashboardStats`)

정기적으로 통계를 수집하여 캐싱/집계하는 내부 함수

### 3.4 간단 통계 (`getStats`)

```javascript
// 응답 (간단 버전)
{
  totalUsers: 1500,
  totalMeetups: 800,
  todayMeetups: 15,
  activeMeetups: 120
}
```

## 4. 사용자 관리

### 4.1 사용자 목록 조회 (`getUsers`)

```javascript
// 요청
GET /api/admin/users?page=1&limit=20&search=홍길동&status=active

// 필터 옵션
- search: 이름 또는 이메일 검색 (ILIKE)
- status: 'blocked' | 'active'
- page, limit: 페이지네이션
```

### 4.2 사용자 상세 조회 (`getUserById`, `getUserDetails`)

```javascript
// getUserDetails는 추가 통계 포함
SELECT
  (SELECT COUNT(*) FROM meetups WHERE host_id = $1) as hosted_meetups,
  (SELECT COUNT(*) FROM meetup_participants WHERE user_id = $1) as joined_meetups,
  (SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1) as reviews_written,
  (SELECT COALESCE(available_points, 0) FROM user_points WHERE user_id = $1) as points
```

### 4.3 사용자 정보 수정 (`updateUser`)

동적 필드 업데이트 지원:

```javascript
// 동적 UPDATE 쿼리 생성
for (const [key, value] of Object.entries(updates)) {
  if (value !== undefined && key !== 'id') {
    updateFields.push(`${key} = $${paramIndex}`)
  }
}

UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW()
WHERE id = $id
```

### 4.4 사용자 차단 (`blockUser`)

```javascript
UPDATE users SET
  is_blocked = true,
  blocked_reason = $reason,
  blocked_at = NOW()
WHERE id = $userId
```

### 4.5 사용자 차단 해제 (`unblockUser`)

```javascript
UPDATE users SET
  is_blocked = false,
  blocked_reason = NULL,
  blocked_at = NULL
WHERE id = $userId
```

### 4.6 사용자 상태 변경 (`updateUserAction`)

| 액션 | 설명 | 처리 |
|------|------|------|
| `ban` | 이용 정지 | is_banned = true |
| `unban` | 정지 해제 | is_banned = false |
| `verify` | 인증 처리 | is_verified = true |
| `unverify` | 인증 해제 | is_verified = false |

### 4.7 포인트 조정 (`updateUserPoints`)

```javascript
// 요청
POST /api/admin/users/:userId/points
{
  amount: 1000,
  type: "add" | "subtract",
  description: "이벤트 보상"
}

// UPSERT로 포인트 조정
INSERT INTO user_points (...) VALUES (...)
ON CONFLICT (user_id)
DO UPDATE SET available_points = available_points ± amount

// 트랜잭션 기록
INSERT INTO point_transactions (user_id, type, amount, description, created_at)
VALUES ($1, 'earned' | 'used', $2, $3, NOW())
```

## 5. 모임 관리

### 5.1 모임 목록 조회 (`getMeetups`)

```javascript
// 요청
GET /api/admin/meetups?page=1&limit=20&status=모집중&search=점심

// 쿼리
SELECT m.*, u.name as host_name
FROM meetups m
LEFT JOIN users u ON m.host_id = u.id
WHERE title ILIKE $search AND status = $status
ORDER BY m.created_at DESC
```

### 5.2 모임 상세 조회 (`getMeetupById`, `getMeetupDetails`)

```javascript
// getMeetupDetails는 참가자 목록 포함
SELECT mp.*, u.name, u.email
FROM meetup_participants mp
JOIN users u ON mp.user_id = u.id
WHERE mp.meetup_id = $meetupId
```

### 5.3 모임 수정 (`updateMeetup`)

```javascript
UPDATE meetups SET status = $status, updated_at = NOW()
WHERE id = $id
```

### 5.4 모임 삭제 (`deleteMeetup`)

```javascript
DELETE FROM meetups WHERE id = $id
```

### 5.5 모임 상태 변경 (`updateMeetupAction`)

| 액션 | 새 상태 | 설명 |
|------|---------|------|
| `approve` | 모집중 | 모임 승인 |
| `reject` | 반려 | 모임 반려 |
| `suspend` | 중단 | 모임 중단 |
| `restore` | 모집중 | 모임 복원 |

## 6. 신고 관리

### 6.1 신고 목록 조회 (`getReports`)

```javascript
SELECT
  r.*,
  reporter.name as reporter_name,
  reported.name as reported_user_name
FROM reports r
LEFT JOIN users reporter ON r.reporter_id = reporter.id
LEFT JOIN users reported ON r.reported_user_id = reported.id
WHERE r.status = $status  // 선택적
ORDER BY r.created_at DESC
```

### 6.2 신고 처리 (`handleReport`)

```javascript
UPDATE reports SET
  status = $status,
  admin_note = $adminNote,
  handled_at = NOW()
WHERE id = $reportId
```

## 7. 공지사항 관리

### 7.1 공지 목록 조회 (`getNotices`)

```javascript
SELECT * FROM notices
WHERE is_active = true
ORDER BY is_pinned DESC, created_at DESC
LIMIT $limit OFFSET $offset
```

### 7.2 공지 작성 (`createNotice`)

```javascript
INSERT INTO notices (title, content, is_pinned, admin_id, created_at)
VALUES ($title, $content, $isPinned, $adminId, NOW())
```

### 7.3 공지 수정 (`updateNotice`)

```javascript
UPDATE notices SET
  title = $title,
  content = $content,
  is_pinned = $isPinned,
  is_active = $isActive,
  updated_at = NOW()
WHERE id = $noticeId
```

### 7.4 공지 삭제 (`deleteNotice`)

```javascript
DELETE FROM notices WHERE id = $noticeId
```

### 7.5 고정 상태 변경 (`pinNotice`)

```javascript
UPDATE notices SET
  is_pinned = $isPinned,
  updated_at = NOW()
WHERE id = $noticeId
```

## 8. 관리자 계정 관리

### 8.1 계정 목록 조회 (`getAccounts`)

```javascript
SELECT id, username, email, role, is_active, last_login, created_at
FROM admins
ORDER BY created_at DESC
```

### 8.2 계정 생성 (`createAccount`)

```javascript
// 중복 체크
SELECT id FROM admins WHERE username = $1 OR email = $2

// 비밀번호 해싱
const passwordHash = await bcrypt.hash(password, 10)

// 계정 생성
INSERT INTO admins (username, email, password_hash, role, is_active, created_at)
VALUES ($1, $2, $3, $4, true, NOW())
```

### 8.3 계정 수정 (`updateAccount`)

```javascript
UPDATE admins SET
  email = COALESCE($email, email),
  role = COALESCE($role, role),
  is_active = COALESCE($is_active, is_active),
  updated_at = NOW()
WHERE id = $adminId
```

### 8.4 비밀번호 변경 (`updateAccountPassword`)

```javascript
// 최소 6자 검증
if (newPassword.length < 6) {
  return error("비밀번호는 6자 이상이어야 합니다.")
}

const passwordHash = await bcrypt.hash(newPassword, 10)

UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2
```

### 8.5 계정 삭제 (`deleteAccount`)

```javascript
// 자기 자신 삭제 방지
if (req.admin.id === adminId) {
  return error("자기 자신의 계정은 삭제할 수 없습니다.")
}

DELETE FROM admins WHERE id = $adminId
```

## 9. 차단 회원 관리

### 9.1 차단 회원 목록 (`getBlockedUsers`)

```javascript
SELECT
  ub.id as block_id, ub.blocked_user_id, ub.reason, ub.blocked_at,
  u.id, u.name, u.email, u.provider, u.profile_image
FROM user_blocked_users ub
JOIN users u ON ub.blocked_user_id = u.id
WHERE (u.name ILIKE $search OR u.email ILIKE $search)
ORDER BY ub.blocked_at DESC
```

### 9.2 차단 통계 (`getBlockingStats`)

```javascript
SELECT
  COUNT(*) as total_blocks,
  COUNT(CASE WHEN blocked_at > NOW() - INTERVAL '24 hours' THEN 1 END) as blocks_today,
  COUNT(CASE WHEN blocked_at > NOW() - INTERVAL '7 days' THEN 1 END) as blocks_this_week
FROM user_blocked_users
```

### 9.3 대량 차단 해제 (`bulkUnblock`)

```javascript
DELETE FROM user_blocked_users
WHERE blocked_user_id = ANY($userIds)
```

## 10. 리뷰 관리

### 10.1 리뷰 삭제 (`deleteReview`)

```javascript
DELETE FROM reviews WHERE id = $reviewId
```

### 10.2 소프트 삭제 (`softDeleteReview`)

```javascript
UPDATE reviews SET
  is_deleted = true,
  deleted_at = NOW()
WHERE id = $reviewId
```

## 11. 시스템 설정

### 11.1 설정 조회 (`getSettings`)

```javascript
// 현재 정적 설정 반환
{
  maintenanceMode: false,        // 점검 모드
  allowNewSignups: true,         // 신규 가입 허용
  maxMeetupParticipants: 4,      // 최대 참가자 수
  meetupCreationCooldown: 60,    // 모임 생성 쿨다운 (분)
  autoApprovalEnabled: true,     // 자동 승인
  emailNotificationsEnabled: true,
  smsNotificationsEnabled: false,
  depositAmount: 3000,           // 기본 약속금
  platformFee: 0                 // 플랫폼 수수료
}
```

### 11.2 설정 변경 (`updateSettings`)

```javascript
// 유효성 검사
if (maxMeetupParticipants < 1 || maxMeetupParticipants > 50) {
  return error("최대 참가자 수는 1명 이상 50명 이하여야 합니다.")
}

if (depositAmount < 0) {
  return error("예약금은 0원 이상이어야 합니다.")
}
```

## 12. 챗봇 설정

### 12.1 설정 조회 (`getChatbotSettings`)

```javascript
SELECT * FROM chatbot_settings
ORDER BY created_at DESC
LIMIT 10
```

### 12.2 설정 수정 (`updateChatbotSettings`)

```javascript
UPDATE chatbot_settings SET
  keyword = COALESCE($keyword, keyword),
  response = COALESCE($response, response),
  is_active = COALESCE($is_active, is_active),
  updated_at = NOW()
WHERE id = $id
```

## 13. 통계 리포트

### 13.1 리포트 조회 (`getStatReports`)

| 타입 | 쿼리 |
|------|------|
| `users` | 일자별 가입자 수 |
| `meetups` | 일자별 모임 생성 수 |
| `points` | 일자별 포인트 거래량 |

```javascript
// 예: 사용자 리포트
SELECT DATE(created_at) as date, COUNT(*) as count
FROM users
WHERE created_at BETWEEN $startDate AND $endDate
GROUP BY DATE(created_at)
ORDER BY date
```

### 13.2 리포트 다운로드 (`downloadReports`)

| 타입 | 기간 |
|------|------|
| `daily` | 최근 7일 |
| `weekly` | 최근 7주 |
| `monthly` | 최근 7개월 |

```javascript
// CSV 포맷 출력
const csvHeader = '기간,신규 사용자,신규 모임,완료된 모임,활성 사용자\n'

res.setHeader('Content-Type', 'text/csv; charset=utf-8')
res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${date}.csv`)
res.send('\uFEFF' + csv)  // BOM for Korean
```

## 14. 데이터 구조

### 14.1 admins 테이블

```javascript
{
  id: uuid,
  username: string,         // 로그인 ID
  email: string,
  password_hash: string,    // bcrypt 해싱
  role: string,             // 'admin', 'super_admin'
  is_active: boolean,
  last_login: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 14.2 reports 테이블

```javascript
{
  id: uuid,
  reporter_id: uuid,        // 신고자
  reported_user_id: uuid,   // 피신고자
  meetup_id: uuid,          // 관련 모임 (선택)
  reason: string,           // 신고 사유
  status: string,           // '대기', '처리중', '완료', '반려'
  admin_note: string,       // 관리자 메모
  handled_at: timestamp,
  created_at: timestamp
}
```

### 14.3 chatbot_settings 테이블

```javascript
{
  id: uuid,
  keyword: string,          // 트리거 키워드
  response: string,         // 응답 메시지
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

## 15. 권한 관리

### 15.1 관리자 역할 (role)

| 역할 | 설명 | 권한 |
|------|------|------|
| `admin` | 일반 관리자 | 조회, 수정 |
| `super_admin` | 슈퍼 관리자 | 모든 권한 + 계정 관리 |

### 15.2 인증 미들웨어

```javascript
// JWT 토큰 검증
const decoded = jwt.verify(token, JWT_SECRET)

// isAdmin 플래그 확인
if (!decoded.isAdmin) {
  return error("관리자 권한이 필요합니다.")
}
```

## 16. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 로그인 실패 | 401 | "아이디 또는 비밀번호가 올바르지 않습니다" |
| 사용자 없음 | 404 | "사용자를 찾을 수 없습니다" |
| 모임 없음 | 404 | "모임을 찾을 수 없습니다" |
| 관리자 없음 | 404 | "관리자를 찾을 수 없습니다" |
| 필수 정보 누락 | 400 | "필수 정보가 누락되었습니다" |
| 중복 계정 | 400 | "이미 존재하는 계정입니다" |
| 자기 삭제 | 400 | "자기 자신의 계정은 삭제할 수 없습니다" |
| 수정 내용 없음 | 400 | "수정할 내용이 없습니다" |
| 유효성 검사 실패 | 400 | "최대 참가자 수는 1명 이상 50명 이하여야 합니다" |
| 서버 오류 | 500 | "서버 오류가 발생했습니다" |

## 17. 관련 API 엔드포인트

### 17.1 인증

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| POST | `/api/admin/login` | 관리자 로그인 | `login` |
| POST | `/api/admin/logout` | 관리자 로그아웃 | `logout` |
| GET | `/api/admin/profile` | 프로필 조회 | `getProfile` |

### 17.2 대시보드

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/dashboard` | 대시보드 통계 | `getDashboardStats` |
| GET | `/api/admin/stats` | 간단 통계 | `getStats` |
| GET | `/api/admin/stats/realtime` | 실시간 통계 | `getRealtimeStats` |
| POST | `/api/admin/stats/collect` | 통계 수집 | `collectDashboardStats` |

### 17.3 사용자 관리

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/users` | 사용자 목록 | `getUsers` |
| GET | `/api/admin/users/:id` | 사용자 상세 | `getUserById` |
| GET | `/api/admin/users/:userId/details` | 사용자 상세 + 통계 | `getUserDetails` |
| PUT | `/api/admin/users/:id` | 사용자 수정 | `updateUser` |
| POST | `/api/admin/users/:id/block` | 사용자 차단 | `blockUser` |
| POST | `/api/admin/users/:id/unblock` | 차단 해제 | `unblockUser` |
| POST | `/api/admin/users/:id/:action` | 상태 변경 | `updateUserAction` |
| POST | `/api/admin/users/:userId/points` | 포인트 조정 | `updateUserPoints` |

### 17.4 모임 관리

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/meetups` | 모임 목록 | `getMeetups` |
| GET | `/api/admin/meetups/:id` | 모임 상세 | `getMeetupById` |
| GET | `/api/admin/meetups/:meetupId/details` | 모임 상세 + 참가자 | `getMeetupDetails` |
| PUT | `/api/admin/meetups/:id` | 모임 수정 | `updateMeetup` |
| DELETE | `/api/admin/meetups/:id` | 모임 삭제 | `deleteMeetup` |
| POST | `/api/admin/meetups/:id/:action` | 상태 변경 | `updateMeetupAction` |

### 17.5 신고/리뷰

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/reports` | 신고 목록 | `getReports` |
| PUT | `/api/admin/reports/:id` | 신고 처리 | `handleReport` |
| DELETE | `/api/admin/reviews/:reviewId` | 리뷰 삭제 | `deleteReview` |
| PATCH | `/api/admin/reviews/:reviewId` | 리뷰 소프트 삭제 | `softDeleteReview` |

### 17.6 공지사항

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/notices` | 공지 목록 | `getNotices` |
| POST | `/api/admin/notices` | 공지 작성 | `createNotice` |
| PUT | `/api/admin/notices/:id` | 공지 수정 | `updateNotice` |
| DELETE | `/api/admin/notices/:id` | 공지 삭제 | `deleteNotice` |
| PATCH | `/api/admin/notices/:id/pin` | 고정 변경 | `pinNotice` |

### 17.7 관리자 계정

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/accounts` | 계정 목록 | `getAccounts` |
| POST | `/api/admin/accounts` | 계정 생성 | `createAccount` |
| PUT | `/api/admin/accounts/:adminId` | 계정 수정 | `updateAccount` |
| PUT | `/api/admin/accounts/:adminId/password` | 비밀번호 변경 | `updateAccountPassword` |
| DELETE | `/api/admin/accounts/:adminId` | 계정 삭제 | `deleteAccount` |

### 17.8 차단 관리

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/blocked-users` | 차단 목록 | `getBlockedUsers` |
| GET | `/api/admin/blocking-stats` | 차단 통계 | `getBlockingStats` |
| POST | `/api/admin/bulk-unblock` | 대량 해제 | `bulkUnblock` |

### 17.9 설정

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/settings` | 시스템 설정 조회 | `getSettings` |
| PUT | `/api/admin/settings` | 시스템 설정 변경 | `updateSettings` |
| GET | `/api/admin/chatbot/settings` | 챗봇 설정 조회 | `getChatbotSettings` |
| PUT | `/api/admin/chatbot/settings/:id` | 챗봇 설정 수정 | `updateChatbotSettings` |

### 17.10 리포트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/admin/reports/:type` | 통계 리포트 | `getStatReports` |
| GET | `/api/admin/reports/:type/download` | 리포트 다운로드 | `downloadReports` |

## 18. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
