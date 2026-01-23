# 모임 정책 (Meetup Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 모임(Meetup)은 사용자들이 함께 식사를 할 수 있도록 연결해주는 핵심 기능입니다.

## 2. 모임 상태

### 2.1 상태 종류
| 상태 | 설명 |
|------|------|
| `모집중` | 참가자 모집 중 |
| `모집완료` | 정원 충족 또는 호스트가 확정 |
| `종료` | 모임 완료 |
| `취소` | 모임 취소됨 |

### 2.2 상태 전이
```
모집중 → 모집완료 (호스트 확정 또는 정원 충족)
모집중 → 취소 (호스트 취소)
모집완료 → 종료 (모임 시간 경과)
모집완료 → 취소 (호스트 취소 - 약속금 전액 환불)
```

## 3. 모임 생성

### 3.1 필수 정보
```javascript
{
  title: string,           // 모임 제목
  description: string,     // 설명
  category: string,        // 카테고리 (한식, 중식, 일식 등)
  location: string,        // 장소명
  address: string,         // 주소
  latitude: number,        // 위도
  longitude: number,       // 경도
  date: date,              // 모임 날짜
  time: time,              // 모임 시간
  maxParticipants: number  // 최대 인원 (기본값: 4)
}
```

### 3.2 선택 정보
- `priceRange`: 가격대
- `ageRange`: 연령대 선호
- `genderPreference`: 성별 선호
- `image`: 모임 이미지

### 3.3 생성 로직
1. 모임 정보 DB 저장
2. **호스트 자동 참가자 등록** (status: '참가승인')
3. `current_participants = 1`로 초기화

## 4. 모임 참가

### 4.1 참가 조건
- 모임 상태가 '모집중'
- 현재 참가자 수 < 최대 인원
- 이미 참가 신청하지 않은 경우

### 4.2 참가 상태
| 상태 | 설명 |
|------|------|
| `참가대기` | 참가 신청 완료, 호스트 승인 대기 |
| `참가승인` | 호스트가 승인 완료 |
| `참가거절` | 호스트가 거절 |

### 4.3 참가 흐름
```
참가 신청 → 참가대기 → (호스트 승인) → 참가승인
                    → (호스트 거절) → 참가거절
```

## 5. 참가 승인/거절 (호스트)

### 5.1 권한
- **호스트만** 참가 상태 변경 가능

### 5.2 승인 시 동작
```javascript
// 참가 상태 업데이트
UPDATE meetup_participants SET status = '참가승인'

// 참가자 수 증가
UPDATE meetups SET current_participants = current_participants + 1
```

## 6. 참가 취소

### 6.1 일반 취소
- 참가자가 직접 취소 가능
- `meetup_participants` 레코드 삭제
- `current_participants` 감소

### 6.2 취소 정책 연동
- 취소 시점에 따른 환불율은 `CANCELLATION_POLICY.md` 참조
- `/api/deposits/cancel-participation/:meetupId` API 사용

## 7. 모임 확정/취소 (호스트)

### 7.1 모임 확정
```javascript
// action = 'confirm'
UPDATE meetups SET status = '모집완료'
```

### 7.2 모임 취소
```javascript
// action = 'cancel'
UPDATE meetups SET status = '취소'

// 모든 참가자에게 약속금 전액 환불
FOR EACH participant:
  - 포인트 환불
  - promise_deposits.status = 'refunded'
  - 환불 거래 내역 기록
```

## 8. 출석 확인 (Attendance)

### 8.1 체크인 방식
| 방식 | 설명 | 거리 제한 |
|------|------|----------|
| `gps` | GPS 기반 위치 확인 | 100m 이내 |
| `qr` | QR 코드 스캔 | - |
| `host_confirm` | 호스트 수동 확인 | - |
| `mutual_confirm` | 참가자 간 상호 확인 | - |
| `self_report` | 자가 보고 | - |

### 8.2 GPS 체크인 로직
```javascript
// 1. 거리 계산 (Haversine 공식)
distance = calculateDistance(userLat, userLng, meetupLat, meetupLng)

// 2. 100m 초과 시 거부
if (distance > 100) {
  return error("모임 장소에서 100m 이내에서만 체크인 가능")
}

// 3. 출석 기록
INSERT INTO attendances (meetup_id, user_id, attendance_type, status)
VALUES (meetupId, userId, 'gps', 'confirmed')

// 4. 참가자 출석 상태 업데이트
UPDATE meetup_participants SET attended = true, attended_at = NOW()
```

### 8.3 QR 코드
- 호스트만 생성 가능
- 유효 시간: 10분
- 데이터: `{ meetupId, hostId, timestamp, expiresAt, type: 'checkin' }`

## 9. 위치 기반 필터링

### 9.1 홈화면 모임 조회
```
GET /api/meetups/home?latitude=37.5665&longitude=126.9780&radius=3000
```
- 기본 반경: 3km (3000m)
- 거리순 정렬
- 최대 20개 반환

### 9.2 거리 계산
Haversine 공식 사용:
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 지구 반경 (m)
  // ... Haversine 계산
  return distance; // 미터 단위
}
```

## 10. 차단 사용자 필터링

- 차단한 사용자가 호스트인 모임은 조회 결과에서 제외
- `user_blocked_users` 테이블 참조

## 11. 모임 수정/삭제

### 11.1 수정 권한
- **호스트만** 가능

### 11.2 삭제
- 참가자가 있는 경우 취소 처리 권장
- 삭제 시 관련 데이터 cascade 필요

## 12. 찜 기능 (Wishlist)

### 12.1 찜 추가
```javascript
INSERT INTO meetup_wishlists (user_id, meetup_id)
// 중복 시 무시 (이미 찜한 경우)
```

### 12.2 찜 삭제
```javascript
DELETE FROM meetup_wishlists WHERE user_id = ? AND meetup_id = ?
```

## 13. 최근 본 글

- 조회 시 자동 기록
- `user_recent_views` 테이블 사용
- 중복 시 `viewed_at` 업데이트

## 14. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/meetups` | 모임 목록 조회 |
| GET | `/api/meetups/home` | 홈화면 모임 (위치 기반) |
| GET | `/api/meetups/active` | 활성 모임 목록 |
| GET | `/api/meetups/nearby` | 주변 모임 검색 |
| GET | `/api/meetups/my` | 내 모임 목록 |
| POST | `/api/meetups` | 모임 생성 |
| GET | `/api/meetups/:id` | 모임 상세 |
| PUT | `/api/meetups/:id` | 모임 수정 |
| DELETE | `/api/meetups/:id` | 모임 삭제 |
| POST | `/api/meetups/:id/join` | 모임 참가 |
| POST | `/api/meetups/:id/leave` | 참가 취소 |
| GET | `/api/meetups/:id/participants` | 참가자 목록 |
| PUT | `/api/meetups/:id/participants/:participantId` | 참가 상태 변경 |
| POST | `/api/meetups/:id/confirm` | 모임 확정/취소 |
| POST | `/api/meetups/:id/gps-checkin` | GPS 체크인 |
| POST | `/api/meetups/:id/qr-checkin` | QR 체크인 |
| GET | `/api/meetups/:id/qr-code` | QR 코드 생성 |

## 15. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
