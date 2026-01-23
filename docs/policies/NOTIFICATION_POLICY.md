# 알림 시스템 정책 (Notification Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 알림 시스템은 사용자에게 모임, 채팅, 시스템 관련 정보를 전달하는 기능입니다. 푸시 알림과 인앱 알림을 모두 지원합니다.

## 2. 알림 유형

### 2.1 알림 타입 (type)

| 타입 | 설명 | 예시 |
|------|------|------|
| `meetup_reminder` | 모임 리마인더 | "내일 점심 모임이 있습니다" |
| `meetup_join` | 참가 신청 | "홍길동님이 참가를 신청했습니다" |
| `meetup_approved` | 참가 승인 | "참가가 승인되었습니다" |
| `meetup_rejected` | 참가 거절 | "참가가 거절되었습니다" |
| `meetup_cancelled` | 모임 취소 | "모임이 취소되었습니다" |
| `meetup_progress_check` | 진행 확인 요청 | "모임이 예정대로 진행되었나요?" |
| `chat_message` | 새 채팅 메시지 | "새 메시지가 도착했습니다" |
| `review_received` | 리뷰 수신 | "새 리뷰가 작성되었습니다" |
| `badge_earned` | 뱃지 획득 | "새 뱃지를 획득했습니다" |
| `points_earned` | 포인트 적립 | "1000포인트가 적립되었습니다" |
| `deposit_refund` | 약속금 환불 | "약속금이 환불되었습니다" |
| `noshow_penalty` | 노쇼 패널티 | "노쇼로 패널티가 부과되었습니다" |
| `system_announcement` | 시스템 공지 | "서비스 점검 안내" |

### 2.2 중요도별 분류

| 중요도 | 타입 |
|--------|------|
| 높음 | noshow_penalty, deposit_refund, meetup_cancelled |
| 중간 | meetup_approved, meetup_reminder, review_received |
| 낮음 | chat_message, badge_earned, points_earned |

## 3. 데이터 구조

### 3.1 notifications 테이블

```javascript
{
  id: uuid,
  user_id: uuid,
  type: string,
  title: string,
  content: string,           // 또는 message
  data: json,                // 추가 데이터 (meetupId, userId 등)
  is_read: boolean,
  read_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 3.2 notification_settings 테이블

```javascript
{
  id: uuid,
  user_id: uuid,
  push_enabled: boolean,     // 전체 푸시 on/off
  chat_enabled: boolean,     // 채팅 알림
  meetup_enabled: boolean,   // 모임 알림
  marketing_enabled: boolean, // 마케팅 알림
  created_at: timestamp,
  updated_at: timestamp
}
```

## 4. 알림 목록 조회

### 4.1 기능 (`getNotifications`)

```javascript
// 요청
GET /api/notifications?page=1&limit=20&type=meetup_reminder
```

### 4.2 쿼리 로직

```javascript
let whereClause = 'WHERE user_id = $1'
const params = [userId, limit, offset]

// 타입 필터링 (선택)
if (type) {
  whereClause += ' AND type = $4'
  params.push(type)
}

SELECT * FROM notifications
${whereClause}
ORDER BY created_at DESC
LIMIT $2 OFFSET $3
```

### 4.3 응답 형식

```javascript
{
  success: true,
  notifications: [
    {
      id: uuid,
      user_id: uuid,
      type: "meetup_reminder",
      title: "모임 알림",
      content: "내일 점심 모임이 있습니다",
      data: { meetupId: "..." },
      is_read: false,
      created_at: "2024-01-23T10:00:00Z"
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 50
  }
}
```

## 5. 읽지 않은 알림 수

### 5.1 기능 (`getUnreadCount`)

```javascript
SELECT COUNT(*) as count
FROM notifications
WHERE user_id = ? AND is_read = false

// 응답
{
  success: true,
  unreadCount: 5
}
```

### 5.2 활용

- 앱 배지 카운트
- 알림 아이콘 뱃지
- 알림 탭 인디케이터

## 6. 알림 읽음 처리

### 6.1 단일 알림 읽음 (`markAsRead`)

```javascript
UPDATE notifications
SET is_read = true, read_at = NOW()
WHERE id = notificationId AND user_id = userId
```

### 6.2 모든 알림 읽음 (`markAllAsRead`)

```javascript
UPDATE notifications
SET is_read = true, read_at = NOW()
WHERE user_id = userId AND is_read = false
```

## 7. 알림 삭제

### 7.1 기능 (`deleteNotification`)

```javascript
DELETE FROM notifications
WHERE id = notificationId AND user_id = userId
```

### 7.2 권한

- **본인 알림만** 삭제 가능
- `user_id` 조건으로 검증

## 8. 알림 설정

### 8.1 설정 항목

| 항목 | 필드명 | 기본값 | 설명 |
|------|--------|--------|------|
| 전체 푸시 | `push_enabled` | true | 모든 푸시 알림 on/off |
| 채팅 알림 | `chat_enabled` | true | 새 메시지 알림 |
| 모임 알림 | `meetup_enabled` | true | 모임 관련 알림 |
| 마케팅 알림 | `marketing_enabled` | false | 광고/이벤트 알림 |

### 8.2 설정 조회 (`getSettings`)

```javascript
SELECT * FROM notification_settings WHERE user_id = ?

// 설정이 없으면 기본값 반환
if (!result) {
  return {
    pushEnabled: true,
    chatEnabled: true,
    meetupEnabled: true,
    marketingEnabled: false
  }
}
```

### 8.3 설정 변경 (`updateSettings`)

UPSERT 방식으로 생성 또는 업데이트:

```javascript
INSERT INTO notification_settings (user_id, push_enabled, chat_enabled, meetup_enabled, marketing_enabled)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id)
DO UPDATE SET
  push_enabled = $2,
  chat_enabled = $3,
  meetup_enabled = $4,
  marketing_enabled = $5,
  updated_at = NOW()
```

## 9. 알림 생성 (내부용)

### 9.1 함수 (`createNotification`)

다른 모듈에서 알림을 생성할 때 사용하는 내부 함수:

```javascript
exports.createNotification = async (userId, type, title, content, data = {}) => {
  await pool.query(`
    INSERT INTO notifications (user_id, type, title, content, data, is_read, created_at)
    VALUES ($1, $2, $3, $4, $5, false, NOW())
  `, [userId, type, title, content, JSON.stringify(data)])
}
```

### 9.2 사용 예시

```javascript
// 참가 승인 시
await createNotification(
  participantId,
  'meetup_approved',
  '참가 승인',
  `${meetupTitle} 모임 참가가 승인되었습니다.`,
  { meetupId: meetup.id }
)

// 노쇼 패널티 시
await createNotification(
  userId,
  'noshow_penalty',
  '노쇼 패널티 안내',
  '모임에 불참하여 약속금이 차감되었습니다.',
  { meetupId, penaltyAmount: 3000 }
)
```

## 10. 알림 전송 트리거

### 10.1 모임 관련

| 이벤트 | 알림 타입 | 수신자 |
|--------|----------|--------|
| 참가 신청 | meetup_join | 호스트 |
| 참가 승인 | meetup_approved | 참가자 |
| 참가 거절 | meetup_rejected | 참가자 |
| 모임 취소 | meetup_cancelled | 모든 참가자 |
| 모임 1시간 전 | meetup_reminder | 모든 참가자 |
| 진행 확인 요청 | meetup_progress_check | 모든 참가자 |

### 10.2 포인트/약속금 관련

| 이벤트 | 알림 타입 | 수신자 |
|--------|----------|--------|
| 포인트 적립 | points_earned | 본인 |
| 약속금 환불 | deposit_refund | 본인 |
| 노쇼 패널티 | noshow_penalty | 본인 |

### 10.3 기타

| 이벤트 | 알림 타입 | 수신자 |
|--------|----------|--------|
| 새 채팅 메시지 | chat_message | 채팅방 참가자 |
| 리뷰 작성 | review_received | 호스트/참가자 |
| 뱃지 획득 | badge_earned | 본인 |

## 11. 테스트 알림

### 11.1 기능 (`createTestNotification`)

개발/테스트 목적으로 알림을 생성합니다.

```javascript
INSERT INTO notifications (
  user_id, type, title, message, data, created_at, updated_at
) VALUES (
  userId, 'system_announcement',
  '🎉 테스트 알림',
  '알림 시스템이 정상적으로 작동하고 있습니다!',
  '{"testData":"This is a test notification"}',
  NOW(), NOW()
)
```

## 12. 푸시 알림 설정 체크

알림 전송 전 사용자 설정 확인:

```javascript
async function shouldSendPush(userId, type) {
  const settings = await getNotificationSettings(userId)

  // 전체 푸시 비활성화
  if (!settings.push_enabled) return false

  // 타입별 설정 체크
  if (type.startsWith('chat_') && !settings.chat_enabled) return false
  if (type.startsWith('meetup_') && !settings.meetup_enabled) return false
  if (type === 'marketing' && !settings.marketing_enabled) return false

  return true
}
```

## 13. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 서버 오류 | 500 | "서버 오류가 발생했습니다" |
| 알림 없음 | - | 빈 배열 반환 (에러 아님) |

## 14. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/notifications` | 알림 목록 조회 | `getNotifications` |
| GET | `/api/notifications/unread-count` | 읽지 않은 수 | `getUnreadCount` |
| PUT | `/api/notifications/:id/read` | 읽음 처리 | `markAsRead` |
| PATCH | `/api/notifications/:notificationId/read` | 읽음 처리 (PATCH) | `markAsReadPatch` |
| PUT | `/api/notifications/read-all` | 모두 읽음 | `markAllAsRead` |
| DELETE | `/api/notifications/:id` | 알림 삭제 | `deleteNotification` |
| GET | `/api/notifications/settings` | 설정 조회 | `getSettings` |
| PUT | `/api/notifications/settings` | 설정 변경 | `updateSettings` |
| POST | `/api/notifications/test` | 테스트 알림 생성 | `createTestNotification` |

## 15. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
