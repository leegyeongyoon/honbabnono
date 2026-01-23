# 채팅 시스템 정책 (Chat Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 채팅 시스템은 모임 참가자 간 실시간 소통을 지원합니다. 모임 단체 채팅과 1:1 개인 채팅을 모두 지원합니다.

## 2. 채팅 유형

### 2.1 모임 채팅 (meetup)

- 모임 참가자 전원이 참여하는 그룹 채팅
- 모임 생성 시 자동 생성
- 참가 승인된 사용자만 접근 가능

### 2.2 1:1 채팅 (direct)

- 두 사용자 간 개인 채팅
- 권한 체크 후 생성 가능
- 성별/설정에 따른 제한 있음

## 3. 데이터 구조

### 3.1 chat_rooms 테이블

```javascript
{
  id: uuid,
  type: 'meetup' | 'direct',
  meetupId: uuid,                // 모임 채팅 시
  title: string,
  description: string,
  lastMessage: string,           // 마지막 메시지 내용
  lastMessageTime: timestamp,    // 마지막 메시지 시간
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3.2 chat_participants 테이블

```javascript
{
  id: uuid,
  chatRoomId: uuid,
  userId: uuid,
  joinedAt: timestamp,
  lastReadAt: timestamp,         // 마지막 읽은 시간
  isActive: boolean
}
```

### 3.3 chat_messages 테이블

```javascript
{
  id: uuid,
  chatRoomId: uuid,
  senderId: uuid,
  senderName: string,
  message: string,
  messageType: 'text' | 'image' | 'file',
  isEdited: boolean,
  editedAt: timestamp,
  isDeleted: boolean,
  replyToId: uuid,               // 답장 대상 메시지
  fileUrl: string,
  fileName: string,
  fileSize: integer,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 4. 1:1 채팅 권한 체크

### 4.1 권한 조건 (`checkDirectChatPermission`)

다양한 조건에 따라 1:1 채팅 허용 여부를 결정합니다.

```javascript
// 필수 파라미터
{ currentUserId, targetUserId, meetupId? }
```

### 4.2 거부 사유 (reason)

| 코드 | 설명 |
|------|------|
| `SELF_CHAT_NOT_ALLOWED` | 자기 자신과 채팅 불가 |
| `USER_NOT_FOUND` | 사용자를 찾을 수 없음 |
| `TARGET_BLOCKED_ALL` | 상대방이 모든 채팅 차단 |
| `GENDER_RESTRICTED` | 동성만 채팅 허용 설정 |
| `MEETUP_NOT_FOUND` | 모임을 찾을 수 없음 |
| `MEETUP_DISABLED` | 모임에서 1:1 채팅 비활성화 |

### 4.3 사용자 채팅 설정 (`direct_chat_setting`)

| 설정값 | 설명 |
|--------|------|
| `ALLOW_ALL` | 모든 사용자 허용 |
| `SAME_GENDER` | 동성만 허용 |
| `BLOCKED` | 모든 1:1 채팅 차단 |

### 4.4 권한 체크 로직

```javascript
// 1. 자기 자신 체크
if (currentUserId === targetUserId) {
  return { allowed: false, reason: 'SELF_CHAT_NOT_ALLOWED' }
}

// 2. 두 사용자 존재 확인
const users = await getUsersBothIds(currentUserId, targetUserId)
if (users.length !== 2) {
  return { allowed: false, reason: 'USER_NOT_FOUND' }
}

// 3. 상대방 전체 차단 설정 확인
if (targetUser.direct_chat_setting === 'BLOCKED') {
  return { allowed: false, reason: 'TARGET_BLOCKED_ALL' }
}

// 4. 성별 제한 확인
const isSameGender = currentUser.gender === targetUser.gender

if (meetupId) {
  // 모임 내 채팅: 모임 설정 확인
  if (!meetup.allow_direct_chat) {
    return { allowed: false, reason: 'MEETUP_DISABLED' }
  }
  if (!isSameGender && targetUser.direct_chat_setting !== 'ALLOW_ALL') {
    return { allowed: false, reason: 'GENDER_RESTRICTED' }
  }
} else {
  // 일반 1:1 채팅: 사용자 설정만 확인
  if (targetUser.direct_chat_setting === 'SAME_GENDER' && !isSameGender) {
    return { allowed: false, reason: 'GENDER_RESTRICTED' }
  }
}

return { allowed: true }
```

## 5. 채팅방 목록 조회

### 5.1 기능 (`getChatRooms`)

사용자가 참여 중인 모든 채팅방 목록을 조회합니다.

### 5.2 쿼리 로직

```javascript
SELECT
  cr.*,
  cp.lastReadAt,
  cp.joinedAt,
  (
    SELECT COUNT(*)::int
    FROM chat_messages cm
    WHERE cm.chatRoomId = cr.id
      AND cm.senderId <> currentUserId
      AND cm.createdAt > COALESCE(cp.lastReadAt, cp.joinedAt, '1970-01-01')
  ) as unreadCount
FROM chat_rooms cr
JOIN chat_participants cp ON cr.id = cp.chatRoomId
WHERE cp.userId = currentUserId AND cr.isActive = true
ORDER BY COALESCE(cr.lastMessageTime, cr.createdAt) DESC
```

### 5.3 응답 형식

```javascript
{
  success: true,
  data: [
    {
      id: uuid,
      type: 'meetup',
      meetupId: uuid,
      title: "점심 모임 채팅방",
      lastMessage: "안녕하세요!",
      lastTime: "2024-01-23T12:00:00Z",
      unreadCount: 3,
      isActive: true,
      isOnline: true
    }
  ]
}
```

## 6. 읽지 않은 메시지 수

### 6.1 전체 읽지 않은 수 (`getUnreadCount`)

```javascript
SELECT COUNT(*) as total_unread
FROM chat_messages cm
JOIN chat_participants cp ON cm.chatRoomId = cp.chatRoomId
WHERE cp.userId = currentUserId
  AND cp.isActive = true
  AND cm.senderId <> currentUserId
  AND cm.createdAt > COALESCE(cp.lastReadAt, cp.joinedAt, '1970-01-01')
```

### 6.2 읽음 기준

- `lastReadAt`: 사용자가 채팅방을 마지막으로 읽은 시간
- `joinedAt`: 채팅방 참여 시간 (fallback)
- 본인이 보낸 메시지는 제외

## 7. 메시지 조회

### 7.1 기능 (`getMessages`)

특정 채팅방의 메시지를 조회합니다.

```javascript
// 파라미터
GET /api/chat/:id/messages?page=1&limit=50
```

### 7.2 차단 사용자 필터링

```javascript
// 차단한 사용자의 메시지는 제외
AND cm.senderId NOT IN (
  SELECT blocked_user_id
  FROM user_blocked_users
  WHERE user_id = currentUserId
)
```

### 7.3 응답 형식

```javascript
{
  success: true,
  chatRoom: {
    id: uuid,
    title: string,
    type: 'meetup' | 'direct',
    meetupId: uuid
  },
  messages: [
    {
      id: uuid,
      senderId: uuid,
      senderName: "홍길동",
      profileImage: "...",
      message: "안녕하세요!",
      messageType: 'text',
      timestamp: "2024-01-23T12:00:00Z",
      isMe: false,
      isRead: true,
      isEdited: false,
      replyToId: null
    }
  ],
  pagination: {
    page: 1,
    limit: 50,
    hasMore: true
  }
}
```

## 8. 메시지 전송

### 8.1 기능 (`sendMessage`)

```javascript
// 요청
POST /api/chat/:id/messages
{
  message: "안녕하세요!",
  messageType: "text"  // 'text' | 'image' | 'file'
}
```

### 8.2 처리 로직

```javascript
// 1. 메시지 저장
INSERT INTO chat_messages (
  id, chatRoomId, senderId, senderName, message, messageType, createdAt, updatedAt
) VALUES (gen_random_uuid(), roomId, userId, userName, message, messageType, NOW(), NOW())

// 2. 채팅방 마지막 메시지 업데이트
UPDATE chat_rooms SET
  lastMessage = message,
  lastMessageTime = NOW(),
  updatedAt = NOW()
WHERE id = roomId
```

## 9. 읽음 처리

### 9.1 단일 채팅방 읽음 (`markAsRead`)

```javascript
UPDATE chat_participants
SET lastReadAt = NOW()
WHERE chatRoomId = roomId AND userId = currentUserId
```

### 9.2 전체 채팅방 읽음 (`markAllAsRead`)

```javascript
UPDATE chat_participants
SET lastReadAt = NOW()
WHERE userId = currentUserId

// 응답: { updatedCount: N }
```

## 10. 채팅방 나가기

### 10.1 기능 (`leaveChatRoom`)

```javascript
DELETE FROM chat_participants
WHERE chatRoomId = roomId AND userId = currentUserId
```

### 10.2 주의사항

- 1:1 채팅: 나가면 채팅 기록에 접근 불가
- 모임 채팅: 모임 참가 취소 시 자동으로 나가기 처리

## 11. 모임별 채팅방 조회

### 11.1 기능 (`getChatRoomByMeetup`)

특정 모임의 채팅방 ID를 조회합니다.

```javascript
SELECT id, meetupId, title
FROM chat_rooms
WHERE meetupId = ? AND type = 'meetup' AND isActive = true
LIMIT 1

// 응답
{
  chatRoomId: uuid,
  meetupId: uuid,
  title: "점심 모임 채팅방"
}
```

## 12. 메시지 유형

### 12.1 텍스트 (text)

기본 텍스트 메시지

### 12.2 이미지 (image)

```javascript
{
  messageType: 'image',
  fileUrl: "https://...",
  fileName: "photo.jpg",
  fileSize: 1024000
}
```

### 12.3 파일 (file)

```javascript
{
  messageType: 'file',
  fileUrl: "https://...",
  fileName: "document.pdf",
  fileSize: 2048000
}
```

## 13. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 필수 파라미터 누락 | 400 | "필수 파라미터가 누락되었습니다" |
| 채팅방 없음 | 404 | "채팅방을 찾을 수 없습니다" |
| 모임 채팅방 없음 | 404 | "해당 모임의 채팅방을 찾을 수 없습니다" |
| 권한 체크 실패 | 500 | "권한 체크에 실패했습니다" |

## 14. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/chat/permission` | 1:1 채팅 권한 체크 | `checkDirectChatPermission` |
| GET | `/api/chat/rooms` | 채팅방 목록 조회 | `getChatRooms` |
| GET | `/api/chat/unread-count` | 읽지 않은 수 | `getUnreadCount` |
| GET | `/api/chat/meetup/:meetupId` | 모임 채팅방 조회 | `getChatRoomByMeetup` |
| GET | `/api/chat/:id/messages` | 메시지 조회 | `getMessages` |
| POST | `/api/chat/:id/messages` | 메시지 전송 | `sendMessage` |
| PUT | `/api/chat/:id/read` | 읽음 처리 | `markAsRead` |
| PUT | `/api/chat/read-all` | 전체 읽음 처리 | `markAllAsRead` |
| DELETE | `/api/chat/:id/leave` | 채팅방 나가기 | `leaveChatRoom` |

## 15. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
