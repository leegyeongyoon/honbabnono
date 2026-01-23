# 출석 시스템 정책 (Attendance Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 출석 시스템은 모임 참가자들의 실제 참석 여부를 확인하고 기록하는 기능입니다. 다양한 체크인 방식을 제공하여 사용자 편의성과 신뢰성을 모두 확보합니다.

## 2. 체크인 방식

### 2.1 체크인 유형 요약
| 방식 | 코드 | 설명 | 거리제한 | 권한 |
|------|------|------|----------|------|
| GPS 체크인 | `gps` | GPS 위치 기반 자동 확인 | 100m | 참가자 |
| QR 코드 체크인 | `qr`, `qr_scan` | QR 스캔으로 출석 | - | 참가자 |
| 호스트 확인 | `host_confirm` | 호스트가 수동 확인 | - | 호스트 |
| 상호 확인 | `mutual_confirm` | 참가자 간 상호 확인 | - | 참가자 |
| 자가 보고 | `self_report` | 참가자 스스로 응답 | - | 참가자 |

### 2.2 우선순위
1. GPS/QR 체크인 (가장 신뢰도 높음)
2. 호스트 확인
3. 상호 확인
4. 자가 보고 (가장 신뢰도 낮음)

## 3. GPS 체크인

### 3.1 기본 조건
- **거리 제한**: 모임 장소에서 **100m 이내**
- **권한**: 참가 승인된 사용자만 가능
- **데이터**: 위도(latitude), 경도(longitude) 필수

### 3.2 처리 흐름
```javascript
// 1. 위치 정보 검증
if (!latitude || !longitude) {
  return error("위치 정보가 필요합니다")
}

// 2. 모임 정보 조회
SELECT id, latitude, longitude FROM meetups WHERE id = ?

// 3. 참가자 권한 확인
SELECT id FROM meetup_participants
WHERE meetup_id = ? AND user_id = ? AND status = '참가승인'

// 4. 거리 계산 (Haversine 공식)
distance = calculateDistance(userLat, userLng, meetupLat, meetupLng)

// 5. 거리 검증 (100m 초과 시 거부)
if (distance > 100) {
  return error("모임 장소에서 100m 이내에서만 체크인 가능")
}

// 6. 출석 기록 (UPSERT)
INSERT INTO attendances (meetup_id, user_id, attendance_type, location_latitude, location_longitude, status, confirmed_at)
VALUES (?, ?, 'gps', ?, ?, 'confirmed', NOW())
ON CONFLICT (meetup_id, user_id) DO UPDATE SET ...

// 7. 참가자 테이블 업데이트
UPDATE meetup_participants SET attended = true, attended_at = NOW()
WHERE meetup_id = ? AND user_id = ?
```

### 3.3 거리 계산 (Haversine 공식)
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 지구 반경 (m)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // 미터 단위 거리
}
```

### 3.4 응답 데이터
```javascript
{
  success: true,
  message: "체크인이 완료되었습니다!",
  data: {
    attendanceId: "uuid",
    distance: 45,       // 미터 단위
    checkedInAt: "2024-01-23T12:00:00Z"
  }
}
```

## 4. QR 코드 체크인

### 4.1 QR 코드 생성 (호스트 전용)

#### 권한
- **호스트만** QR 코드 생성 가능

#### QR 데이터 구조
```javascript
{
  meetupId: "uuid",
  hostId: "uuid",
  timestamp: 1706000000000,    // 생성 시각
  expiresAt: 1706000600000,    // 만료 시각 (10분 후)
  type: "checkin"
}
```

#### 생성 로직
```javascript
// 1. 호스트 권한 확인
SELECT id, host_id FROM meetups WHERE id = ?
if (meetup.host_id !== userId) {
  return error("호스트만 QR 코드를 생성할 수 있습니다")
}

// 2. QR 데이터 생성
const qrData = {
  meetupId, hostId: userId,
  timestamp: Date.now(),
  expiresAt: Date.now() + 10 * 60 * 1000, // 10분 후 만료
  type: 'checkin'
}

// 3. Base64 인코딩하여 반환
const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64')
```

#### 유효 시간
- **10분** 후 자동 만료

### 4.2 QR 코드 스캔 체크인

#### 처리 흐름
```javascript
// 1. QR 데이터 파싱
const qrData = JSON.parse(Buffer.from(qrCodeData, 'base64').toString())

// 2. 모임 ID 검증
if (qrData.meetupId !== meetupId) {
  return error("잘못된 QR 코드입니다")
}

// 3. 만료 시간 검증
if (Date.now() > qrData.expiresAt) {
  return error("QR 코드가 만료되었습니다")
}

// 4. 참가자 권한 확인
SELECT id FROM meetup_participants
WHERE meetup_id = ? AND user_id = ? AND status = '참가승인'

// 5. 출석 기록 (UPSERT)
INSERT INTO attendances (meetup_id, user_id, attendance_type, qr_code_data, status, confirmed_at)
VALUES (?, ?, 'qr', ?, 'confirmed', NOW())
ON CONFLICT (meetup_id, user_id) DO UPDATE SET ...

// 6. 참가자 테이블 업데이트
UPDATE meetup_participants SET attended = true, attended_at = NOW()
```

## 5. 호스트 출석 확인

### 5.1 권한
- **해당 모임의 호스트만** 참가자 출석 확인 가능

### 5.2 처리 흐름
```javascript
// 1. 호스트 권한 확인
SELECT host_id FROM meetups WHERE id = ?
if (meetup.host_id !== hostId) {
  return error("해당 모임의 호스트만 참석을 확인할 수 있습니다")
}

// 2. 대상 참가자 확인
SELECT id FROM meetup_participants
WHERE meetup_id = ? AND user_id = ? AND status = '참가승인'

// 3. 출석 기록 (UPSERT)
INSERT INTO attendances (meetup_id, user_id, attendance_type, status, confirmed_at)
VALUES (?, ?, 'host_confirm', 'confirmed', NOW())
ON CONFLICT (meetup_id, user_id) DO UPDATE SET ...

// 4. 참가자 테이블 업데이트
UPDATE meetup_participants SET attended = true, attended_at = NOW()
```

## 6. 상호 확인

### 6.1 개념
참가자들이 서로의 출석을 확인하는 방식. 두 사용자 모두 해당 모임의 승인된 참가자여야 합니다.

### 6.2 처리 흐름
```javascript
// 1. 두 사용자 모두 참가자인지 확인
SELECT user_id FROM meetup_participants
WHERE meetup_id = ? AND user_id IN (confirmerId, targetUserId) AND status = '참가승인'

if (result.length !== 2) {
  return error("두 사용자 모두 해당 모임의 승인된 참가자여야 합니다")
}

// 2. 대상 사용자 출석 기록
INSERT INTO attendances (meetup_id, user_id, attendance_type, status, confirmed_at)
VALUES (?, targetUserId, 'mutual_confirm', 'confirmed', NOW())
ON CONFLICT DO UPDATE ...

// 3. 참가자 테이블 업데이트
UPDATE meetup_participants SET attended = true, attended_at = NOW()
WHERE meetup_id = ? AND user_id = targetUserId
```

### 6.3 상호 확인 가능 참가자 조회
```javascript
// mutual_confirmations 테이블로 양방향 확인 상태 추적
SELECT
  u.id, u.name, u.profile_image,
  CASE WHEN mc1.id IS NOT NULL THEN true ELSE false END as confirmed_by_me,
  CASE WHEN mc2.id IS NOT NULL THEN true ELSE false END as confirmed_by_them,
  CASE WHEN mc1.id IS NOT NULL AND mc2.id IS NOT NULL THEN true ELSE false END as mutually_confirmed
FROM meetup_participants mp
JOIN users u ON mp.user_id = u.id
LEFT JOIN mutual_confirmations mc1 ON (confirmer_id = currentUser AND target_user_id = u.id)
LEFT JOIN mutual_confirmations mc2 ON (confirmer_id = u.id AND target_user_id = currentUser)
WHERE mp.meetup_id = ? AND mp.status = '참가승인' AND u.id != currentUser
```

## 7. 자가 보고 (진행 확인 응답)

### 7.1 호스트 진행 확인 요청
호스트가 참가자들에게 모임 진행 여부를 확인 요청합니다.

```javascript
// 1. 호스트 권한 확인
SELECT host_id FROM meetups WHERE id = ?
if (meetup.host_id !== userId) {
  return error("모임 호스트만 진행 확인을 요청할 수 있습니다")
}

// 2. 승인된 참가자 목록 조회
SELECT user_id FROM meetup_participants
WHERE meetup_id = ? AND status IN ('approved', '참가승인')

// 3. 각 참가자에게 알림 발송
INSERT INTO notifications (user_id, type, title, message, meetup_id, related_user_id, data)
VALUES (?, 'meetup_progress_check', '모임 진행 확인', '모임이 예정대로 진행되었나요?', ?, ?, ?)
```

### 7.2 참가자 진행 응답
```javascript
// 1. 참가자 권한 확인
SELECT id FROM meetup_participants
WHERE meetup_id = ? AND user_id = ? AND status IN ('approved', '참가승인')

// 2. 출석 기록 (자가 보고)
INSERT INTO attendances (meetup_id, user_id, attendance_type, status, notes)
VALUES (?, ?, 'self_report', attended ? 'confirmed' : 'denied', notes)
ON CONFLICT DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes
```

## 8. 위치 인증 (참고용)

### 8.1 목적
체크인 전 위치만 검증하고 기록하는 기능 (출석 처리 X)

### 8.2 처리 흐름
```javascript
// 1. 참가 승인 확인
SELECT m.*, mp.id as participant_id
FROM meetups m
JOIN meetup_participants mp ON m.id = mp.meetup_id
WHERE m.id = ? AND mp.user_id = ? AND mp.status = '참가승인'

// 2. 거리 계산
const distance = calculateDistance(userLat, userLng, meetupLat, meetupLng)
const isVerified = distance <= 100

// 3. 위치 인증 기록 (location_verifications 테이블)
INSERT INTO location_verifications (
  id, meetup_id, user_id, latitude, longitude, accuracy, distance, verified, created_at
) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, NOW())
```

## 9. 출석 상태 조회 (호스트용)

### 9.1 기능
호스트가 모든 참가자의 출석 현황을 조회합니다.

### 9.2 응답 데이터
```javascript
{
  success: true,
  meetup: { id, title, date, time },
  participants: [
    {
      id: "user-uuid",
      name: "홍길동",
      profileImage: "...",
      participationStatus: "참가승인",
      joinedAt: "2024-01-20T10:00:00Z",
      attended: true,
      attendance: {
        id: "attendance-uuid",
        confirmedAt: "2024-01-23T12:00:00Z",
        method: "gps"
      }
    }
  ],
  stats: {
    total: 4,
    attended: 3,
    notAttended: 1
  }
}
```

## 10. 리뷰 가능 참가자 조회

### 10.1 조건
- **출석 확인된 참가자만** (`attended = true`)
- **본인 제외**
- 호스트도 리뷰 대상에 포함 (호스트가 아닌 경우)

### 10.2 쿼리
```sql
SELECT
  u.id, u.name, u.profile_image,
  mp.attended, mp.attended_at,
  CASE WHEN r.id IS NOT NULL THEN true ELSE false END as already_reviewed
FROM meetup_participants mp
JOIN users u ON mp.user_id = u.id
LEFT JOIN reviews r ON r.meetup_id = ? AND r.reviewer_id = currentUser AND r.reviewee_id = u.id
WHERE mp.meetup_id = ?
AND mp.status = '참가승인'
AND mp.attended = true
AND mp.user_id != currentUser
```

## 11. 데이터 구조

### 11.1 attendances 테이블
```javascript
{
  id: uuid,
  meetup_id: uuid,
  user_id: uuid,
  attendance_type: enum('gps', 'qr', 'qr_scan', 'host_confirm', 'mutual_confirm', 'self_report'),
  location_latitude: decimal,    // GPS 체크인 시
  location_longitude: decimal,   // GPS 체크인 시
  qr_code_data: text,            // QR 체크인 시
  status: enum('pending', 'confirmed', 'denied'),
  notes: text,                   // 자가 보고 시 메모
  confirmed_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 11.2 meetup_participants 출석 필드
```javascript
{
  // ... 기존 필드 ...
  attended: boolean,           // 출석 여부
  attended_at: timestamp       // 출석 확인 시각
}
```

### 11.3 location_verifications 테이블
```javascript
{
  id: uuid,
  meetup_id: uuid,
  user_id: uuid,
  latitude: decimal,
  longitude: decimal,
  accuracy: decimal,
  distance: integer,           // 미터 단위
  verified: boolean,
  created_at: timestamp
}
```

## 12. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 위치 정보 누락 | 400 | "위치 정보가 필요합니다" |
| 거리 초과 | 400 | "모임 장소에서 100m 이내에서만 체크인 가능" |
| QR 코드 만료 | 400 | "QR 코드가 만료되었습니다" |
| 잘못된 QR 코드 | 400 | "잘못된 QR 코드입니다" |
| 비참가자 | 403 | "모임 참가자만 체크인할 수 있습니다" |
| 호스트 아님 | 403 | "해당 모임의 호스트만 참석을 확인할 수 있습니다" |
| 모임 없음 | 404 | "모임을 찾을 수 없습니다" |

## 13. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| POST | `/api/meetups/:id/gps-checkin` | GPS 체크인 | `gpsCheckin` |
| GET | `/api/meetups/:id/qr-code` | QR 코드 생성 (호스트용) | `generateQRCode`, `getQRCode` |
| POST | `/api/meetups/:id/qr-checkin` | QR 코드 체크인 | `qrCheckin` |
| POST | `/api/meetups/:id/qr-scan-checkin` | QR 스캔 체크인 | `qrScanCheckin` |
| POST | `/api/meetups/:id/host-confirm` | 호스트 출석 확인 | `hostConfirmAttendance` |
| POST | `/api/meetups/:id/mutual-confirm` | 상호 확인 | `mutualConfirmAttendance` |
| GET | `/api/meetups/:id/attendance-participants` | 출석 상태 조회 (호스트용) | `getAttendanceParticipants` |
| GET | `/api/meetups/:id/confirmable-participants` | 상호 확인 가능 참가자 | `getConfirmableParticipants` |
| POST | `/api/meetups/:id/verify-location` | 위치 인증 | `verifyLocation` |
| POST | `/api/meetups/:id/progress-check` | 진행 확인 요청 (호스트용) | `progressCheck` |
| POST | `/api/meetups/:id/progress-response` | 진행 응답 (참가자용) | `progressResponse` |
| GET | `/api/meetups/:id/reviewable-participants` | 리뷰 가능 참가자 | `getReviewableParticipants` |

## 14. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
