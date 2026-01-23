# 사용자 관리 정책 (User Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 사용자 관리 시스템은 프로필 관리, 신뢰도 지수, 찜/최근 본 글, 차단 기능, 설정 관리 등 사용자와 관련된 모든 기능을 포함합니다.

## 2. 프로필 관리

### 2.1 내 정보 조회 (`getMe`)

로그인한 사용자의 기본 정보를 반환합니다.

```javascript
// 반환 데이터
{
  id: uuid,
  email: string,
  name: string,
  profileImage: string,
  provider: 'email' | 'kakao',
  isVerified: boolean,
  rating: number,
  createdAt: timestamp
}
```

### 2.2 프로필 조회 (`getProfile`)

상세 프로필 정보를 반환합니다 (추가 필드 포함).

```javascript
// 추가 반환 데이터
{
  phone: string,
  gender: string,
  babalScore: number,      // 밥알지수
  meetupsJoined: number,   // 참가한 모임 수
  meetupsHosted: number    // 주최한 모임 수
}
```

### 2.3 프로필 업데이트 (`updateProfile`)

```javascript
// 수정 가능 필드
{
  name: string,
  phone: string,
  gender: string,
  profileImage: string
}

// UPDATE 쿼리 (COALESCE로 null 보존)
UPDATE users SET
  name = COALESCE($1, name),
  phone = COALESCE($2, phone),
  gender = COALESCE($3, gender),
  profile_image = COALESCE($4, profile_image),
  updated_at = NOW()
WHERE id = userId
```

### 2.4 프로필 이미지 업로드 (`uploadProfileImage`)

- 멀티파트 폼 데이터로 이미지 파일 수신
- `/uploads/` 디렉토리에 저장
- DB에 이미지 URL 업데이트

### 2.5 비밀번호 변경 (`changePassword`)

#### 조건
- **이메일 로그인 사용자만** 가능
- 소셜 로그인(카카오) 사용자는 400 에러

#### 검증 흐름
```javascript
// 1. 소셜 로그인 사용자 체크
if (user.provider !== 'email') {
  return error("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다")
}

// 2. 현재 비밀번호 검증
const isValid = await bcrypt.compare(currentPassword, user.password)
if (!isValid) {
  return error("현재 비밀번호가 올바르지 않습니다")
}

// 3. 새 비밀번호 최소 길이 (6자)
if (newPassword.length < 6) {
  return error("새 비밀번호는 6자 이상이어야 합니다")
}

// 4. 해시 저장
const hashedPassword = await bcrypt.hash(newPassword, 10)
UPDATE users SET password = hashedPassword WHERE id = userId
```

### 2.6 계정 탈퇴 (`deleteAccount`)

```javascript
// 영구 삭제 (CASCADE로 관련 데이터 삭제)
DELETE FROM users WHERE id = userId
```

### 2.7 데이터 내보내기 (`exportData`)

GDPR 준수를 위한 개인정보 내보내기 기능.

```javascript
// 반환 데이터
{
  user: { ... },              // 사용자 정보
  hostedMeetups: [...],       // 주최한 모임
  participations: [...],      // 참가 기록
  exportedAt: timestamp
}
```

## 3. 밥알지수 (신뢰도 시스템)

### 3.1 개념

사용자의 활동과 신뢰도를 0-100점으로 표현하는 점수 시스템입니다.

### 3.2 계산 요소

```javascript
const stats = {
  joinedMeetups: number,      // 참가한 모임 수
  hostedMeetups: number,      // 주최한 모임 수
  completedMeetups: number,   // 완료한 모임 수
  reviewsWritten: number,     // 작성한 리뷰 수
  averageRating: number       // 받은 평균 평점
}
```

### 3.3 레벨 구간

| 점수 | 레벨명 | 이모지 | 설명 |
|------|--------|--------|------|
| 98.1+ | 밥神 (밥신) | 🍚×7 | 전설적인 유저 |
| 90.0-98.0 | 찰밥대장 | 🍚×6 | 거의 완벽한 활동 이력 |
| 80.0-89.9 | 밥도둑 밥상 | 🍚×5 | 상위권, 최고의 매너 |
| 70.0-79.9 | 고봉밥 | 🍚×4 | 후기 품질 높고 꾸준한 출석 |
| 60.0-69.9 | 따끈한 밥그릇 | 🍚×3 | 후기와 출석률 양호 |
| 40.0-59.9 | 밥 한 숟갈 | 🍚×1 | 일반 유저, 평균 활동 |
| 0-39.9 | 티스푼 | 🍚×2 | 신고/노쇼, 신뢰 낮음 |

### 3.4 조회 응답

```javascript
{
  success: true,
  riceIndex: 75.5,
  level: {
    level: "고봉밥",
    emoji: "🍚🍚🍚🍚",
    description: "후기 품질도 높고 꾸준한 출석",
    color: "#4CAF50"
  },
  stats: { ... }
}
```

## 4. 찜 (Wishlist)

### 4.1 찜 목록 조회 (`getWishlists`)

```javascript
// 페이지네이션 지원
GET /api/user/wishlists?page=1&limit=10

// 응답
{
  success: true,
  data: [
    {
      wishlist_id: uuid,
      wishlisted_at: timestamp,
      id: meetup_uuid,           // 모임 ID
      title: string,
      location: string,
      date: date,
      time: time,
      status: string,
      is_ended: boolean,         // 종료 여부
      host_name: string
    }
  ],
  pagination: {
    page: 1, limit: 10, totalCount: 25, totalPages: 3
  }
}
```

### 4.2 찜 토글 (`toggleWishlist`)

```javascript
// 이미 찜한 경우 → 삭제
// 찜하지 않은 경우 → 추가

if (existingWishlist) {
  DELETE FROM user_favorites WHERE user_id = ? AND meetup_id = ?
  isWishlisted = false
} else {
  INSERT INTO user_favorites (user_id, meetup_id, created_at) VALUES (?, ?, NOW())
  isWishlisted = true
}

// 응답: { success: true, isWishlisted: boolean }
```

## 5. 최근 본 글

### 5.1 조회 (`getRecentViews`)

최근 조회한 모임 목록을 반환합니다.

```javascript
// 기본 limit: 20
// 정렬: viewed_at DESC (최신순)
SELECT * FROM user_recent_views WHERE user_id = ?
ORDER BY viewed_at DESC
```

### 5.2 개별 삭제 (`deleteRecentView`)

```javascript
DELETE FROM user_recent_views WHERE id = viewId AND user_id = userId
```

### 5.3 전체 삭제 (`deleteAllRecentViews`)

```javascript
DELETE FROM user_recent_views WHERE user_id = userId
// 응답: "최근 본 글 N건이 모두 삭제되었습니다."
```

## 6. 차단 관리

### 6.1 사용자 차단 (`blockUser`)

```javascript
// 검증
1. 자기 자신 차단 불가
2. 대상 사용자 존재 확인
3. 이미 차단된 사용자인지 확인

// 차단 기록
INSERT INTO user_blocked_users (user_id, blocked_user_id, reason)
VALUES (blockerId, blockedUserId, reason)
```

### 6.2 차단 해제 (`unblockUser`)

```javascript
DELETE FROM user_blocked_users
WHERE user_id = blockerId AND blocked_user_id = blockedUserId
```

### 6.3 차단 목록 조회 (`getBlockedUsers`)

```javascript
// 페이지네이션 지원
SELECT
  ub.id as block_id,
  ub.reason,
  ub.blocked_at,
  u.id, u.name, u.email, u.profile_image
FROM user_blocked_users ub
LEFT JOIN users u ON ub.blocked_user_id = u.id
WHERE ub.user_id = ?
ORDER BY ub.blocked_at DESC
```

### 6.4 차단 상태 확인 (`checkBlockedStatus`)

```javascript
// 특정 사용자가 차단되어 있는지 확인
SELECT id FROM user_blocked_users
WHERE user_id = checkerId AND blocked_user_id = targetUserId

// 응답: { isBlocked: boolean, blockId: uuid | null }
```

### 6.5 차단 효과

- 차단한 사용자가 호스트인 모임은 목록에서 제외
- 차단한 사용자의 채팅 메시지 필터링

## 7. 알림 설정

### 7.1 설정 항목

| 항목 | 필드명 | 기본값 | 설명 |
|------|--------|--------|------|
| 푸시 알림 | `push_notifications` | true | 전체 푸시 on/off |
| 이메일 알림 | `email_notifications` | true | 이메일 알림 |
| 모임 리마인더 | `meetup_reminders` | true | 모임 전 알림 |
| 채팅 알림 | `chat_notifications` | true | 새 메시지 알림 |
| 마케팅 알림 | `marketing_notifications` | false | 광고/이벤트 |

### 7.2 조회 (`getNotificationSettings`)

설정이 없으면 기본값으로 자동 생성:

```javascript
if (!settings) {
  INSERT INTO user_notification_settings (user_id, ...)
  VALUES (userId, true, true, true, true, false)
}
```

### 7.3 업데이트 (`updateNotificationSettings`)

전달된 필드만 선택적으로 업데이트:

```javascript
// 동적 UPDATE 쿼리 생성
const updateFields = []
if (push_notifications !== undefined) {
  updateFields.push('push_notifications = $N')
}
// ... 나머지 필드
```

## 8. 개인정보 설정

### 8.1 설정 항목

| 항목 | 필드명 | 기본값 | 설명 |
|------|--------|--------|------|
| 프로필 공개 | `show_profile` | true | 다른 사용자에게 프로필 공개 |
| 활동 공개 | `show_activities` | true | 활동 내역 공개 |
| 메시지 허용 | `allow_messages` | true | 1:1 메시지 수신 허용 |

### 8.2 업데이트 (UPSERT)

```javascript
INSERT INTO user_privacy_settings (user_id, show_profile, show_activities, allow_messages)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id) DO UPDATE SET
  show_profile = $2, show_activities = $3, allow_messages = $4, updated_at = NOW()
```

## 9. 초대 시스템

### 9.1 초대 코드 조회/생성 (`getInviteCode`)

```javascript
// 기존 코드가 없으면 자동 생성
if (!existingCode) {
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()
  // 예: "A8F3K2N1"
  INSERT INTO user_invite_codes (user_id, invite_code, created_at)
  VALUES (userId, inviteCode, NOW())
}
```

### 9.2 초대 코드 사용 (`useInviteCode`)

```javascript
// 검증
1. 코드 유효성 확인
2. 자기 자신의 코드 사용 불가
3. 이미 사용한 적 있는지 확인 (1회 제한)

// 사용 기록
INSERT INTO invite_code_usage (user_id, inviter_id, invite_code, created_at)
VALUES (userId, inviterId, inviteCode, NOW())
```

## 10. 활동 내역

### 10.1 참가한 모임 조회 (`getJoinedMeetups`)

```javascript
SELECT m.*, mp.status as participation_status, mp.created_at as joined_at
FROM meetup_participants mp
JOIN meetups m ON mp.meetup_id = m.id
WHERE mp.user_id = userId
ORDER BY mp.created_at DESC
```

### 10.2 주최한 모임 조회 (`getHostedMeetups`)

```javascript
SELECT * FROM meetups WHERE host_id = userId
ORDER BY created_at DESC
```

### 10.3 활동 통계 조회 (`getStats`, `getActivityStats`)

```javascript
{
  availablePoints: number,    // 사용 가능 포인트
  totalMeetups: number,       // 참가한 총 모임 수
  hostedMeetups: number,      // 주최한 모임 수
  reviewCount: number,        // 작성한 리뷰 수
  riceIndex: number           // 밥알지수 (간략 계산)
}
```

## 11. 포인트 관리 (사용자 모듈)

> 상세 정책은 POINTS_POLICY.md 참조

### 11.1 포인트 조회 (`getUserPoints`)

```javascript
// user_points 테이블 조회
{
  totalPoints: number,        // 총 적립 포인트
  availablePoints: number,    // 사용 가능 포인트
  usedPoints: number,         // 사용한 포인트
  expiredPoints: number       // 만료된 포인트
}
```

### 11.2 포인트 충전 (`chargePoints`, `chargeLegacyPoints`)

```javascript
// 검증
- 최소 충전: 1,000원
- 최대 충전: 1,000,000원 (개발자 계정: 100,000,000원)

// 개발자 계정 보너스
if (isDeveloperAccount) {
  bonusAmount = amount * 9   // 10배 지급
  finalAmount = amount + bonusAmount
}

// 트랜잭션으로 포인트 추가 및 내역 기록
```

### 11.3 포인트 사용 (`usePoints`, `spendPoints`)

```javascript
// 잔액 확인 후 차감
if (currentPoints < amount) {
  return error("보유 포인트가 부족합니다")
}

UPDATE user_points SET
  available_points = available_points - amount,
  used_points = used_points + amount
WHERE user_id = userId
```

## 12. 데이터 구조

### 12.1 users 테이블 주요 필드

```javascript
{
  id: uuid,
  email: string,
  name: string,
  password: string,           // 이메일 로그인만
  profile_image: string,
  provider: 'email' | 'kakao',
  is_verified: boolean,
  rating: decimal,
  phone: string,
  gender: string,
  babal_score: decimal,       // 밥알지수
  meetups_joined: integer,
  meetups_hosted: integer,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 12.2 관련 테이블

| 테이블 | 설명 |
|--------|------|
| `user_points` | 포인트 잔액 |
| `user_notification_settings` | 알림 설정 |
| `user_privacy_settings` | 개인정보 설정 |
| `user_blocked_users` | 차단 목록 |
| `user_invite_codes` | 초대 코드 |
| `user_favorites` / `meetup_wishlists` | 찜 목록 |
| `user_recent_views` | 최근 본 글 |

## 13. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 사용자 없음 | 404 | "사용자를 찾을 수 없습니다" |
| 자기 자신 차단 | 400 | "자기 자신을 차단할 수 없습니다" |
| 이미 차단됨 | 400 | "이미 차단된 사용자입니다" |
| 소셜 로그인 비밀번호 변경 | 400 | "소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다" |
| 현재 비밀번호 불일치 | 400 | "현재 비밀번호가 올바르지 않습니다" |
| 비밀번호 길이 부족 | 400 | "새 비밀번호는 6자 이상이어야 합니다" |
| 자기 초대 코드 | 400 | "자신의 초대 코드는 사용할 수 없습니다" |
| 초대 코드 중복 사용 | 400 | "이미 초대 코드를 사용했습니다" |

## 14. 관련 API 엔드포인트

### 14.1 프로필 관리
| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/user/me` | 내 정보 조회 | `getMe` |
| GET | `/api/user/profile` | 프로필 조회 | `getProfile` |
| PUT | `/api/user/profile` | 프로필 수정 | `updateProfile` |
| POST | `/api/user/profile-image` | 프로필 이미지 업로드 | `uploadProfileImage` |
| DELETE | `/api/user/account` | 계정 탈퇴 | `deleteAccount` |
| PUT | `/api/user/password` | 비밀번호 변경 | `changePassword` |
| GET | `/api/user/export` | 데이터 내보내기 | `exportData` |

### 14.2 통계/지수
| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/user/stats` | 사용자 통계 | `getStats` |
| GET | `/api/user/rice-index` | 밥알지수 조회 | `getRiceIndex` |
| GET | `/api/user/activity-stats` | 활동 통계 | `getActivityStats` |

### 14.3 찜/최근 본 글
| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/user/wishlists` | 찜 목록 조회 | `getWishlists` |
| POST | `/api/user/wishlist/:meetupId` | 찜 토글 | `toggleWishlist` |
| GET | `/api/user/recent-views` | 최근 본 글 조회 | `getRecentViews` |
| DELETE | `/api/user/recent-views/:viewId` | 개별 삭제 | `deleteRecentView` |
| DELETE | `/api/user/recent-views` | 전체 삭제 | `deleteAllRecentViews` |

### 14.4 차단 관리
| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| POST | `/api/user/block/:userId` | 사용자 차단 | `blockUser` |
| DELETE | `/api/user/block/:userId` | 차단 해제 | `unblockUser` |
| GET | `/api/user/blocked` | 차단 목록 조회 | `getBlockedUsers` |
| GET | `/api/user/block-status/:userId` | 차단 상태 확인 | `checkBlockedStatus` |

### 14.5 설정
| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/user/notification-settings` | 알림 설정 조회 | `getNotificationSettings` |
| PUT | `/api/user/notification-settings` | 알림 설정 변경 | `updateNotificationSettings` |
| GET | `/api/user/privacy-settings` | 개인정보 설정 조회 | `getPrivacySettings` |
| PUT | `/api/user/privacy-settings` | 개인정보 설정 변경 | `updatePrivacySettings` |

### 14.6 초대/활동
| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/user/invite-code` | 초대 코드 조회 | `getInviteCode` |
| POST | `/api/user/invite-code/use` | 초대 코드 사용 | `useInviteCode` |
| GET | `/api/user/activities` | 활동 내역 조회 | `getActivities` |
| GET | `/api/user/hosted-meetups` | 주최한 모임 | `getHostedMeetups` |
| GET | `/api/user/joined-meetups` | 참가한 모임 | `getJoinedMeetups` |

## 15. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
