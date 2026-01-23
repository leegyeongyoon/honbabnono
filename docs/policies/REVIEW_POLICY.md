# 리뷰 정책 (Review Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 리뷰 시스템은 모임 참가자들이 경험을 공유하고, 다른 사용자들의 신뢰도를 평가하는 기능입니다.

## 2. 리뷰 유형

### 2.1 모임 리뷰
- 모임 전체에 대한 평가
- `reviews` 또는 `meetup_reviews` 테이블

### 2.2 참가자 개별 평가
- 특정 참가자에 대한 평가
- `participant_ratings` 테이블
- 사용자 평점에 반영

## 3. 리뷰 작성 조건

### 3.1 필수 조건
1. **모임 완료**: 모임 날짜가 지나야 함
2. **참가 승인**: `meetup_participants.status = '참가승인'`
3. **중복 방지**: 동일 모임에 1회만 작성 가능

### 3.2 검증 로직
```javascript
// 1. 모임 완료 확인
if (new Date(meetup.date) > new Date()) {
  return error("완료된 모임에만 리뷰를 작성할 수 있습니다")
}

// 2. 참가 확인
SELECT id FROM meetup_participants
WHERE meetup_id = ? AND user_id = ? AND status = '참가승인'

// 3. 기존 리뷰 확인
SELECT id FROM reviews
WHERE meetup_id = ? AND reviewer_id = ?

if (existingReview) {
  return error("이미 리뷰를 작성하셨습니다")
}
```

## 4. 평점 시스템

### 4.1 평점 범위
- **1 ~ 5점** (정수)
- 평점 없는 리뷰 불가

### 4.2 호스트 평점 업데이트
리뷰 작성 시 호스트의 평균 평점 자동 갱신:
```javascript
// 해당 호스트가 주최한 모든 모임의 리뷰 평균
SELECT AVG(r.rating) as avg_rating
FROM reviews r
JOIN meetups m ON r.meetup_id = m.id
WHERE m.host_id = ?

UPDATE users SET rating = avg_rating WHERE id = host_id
```

## 5. 리뷰 데이터 구조

### 5.1 모임 리뷰
```javascript
{
  id: uuid,
  meetup_id: uuid,
  reviewer_id: uuid,         // 작성자
  reviewer_name: string,
  rating: number,            // 1-5
  comment: string,
  tags: json,                // 태그 배열
  created_at: timestamp,
  updated_at: timestamp
}
```

### 5.2 참가자 평가
```javascript
{
  id: uuid,
  meetup_id: uuid,
  reviewer_id: uuid,         // 평가자
  target_user_id: uuid,      // 평가 대상
  rating: number,
  comment: string,
  created_at: timestamp
}
```

## 6. 태그 시스템

### 6.1 리뷰 태그
사전 정의된 태그로 빠른 평가:
- `친절해요`
- `재미있어요`
- `시간 약속 잘 지켜요`
- `대화가 즐거웠어요`
- `음식이 맛있었어요`
- `장소가 좋았어요`

### 6.2 태그 분석
```javascript
// 사용자가 받은 태그 통계
SELECT
  UNNEST(string_to_array(tags::text, ',')) as tag,
  COUNT(*) as count
FROM reviews
WHERE reviewee_id = ?
GROUP BY tag
ORDER BY count DESC
```

## 7. 리뷰 수정/삭제

### 7.1 수정
- **작성자만** 가능
- `updated_at` 자동 갱신

### 7.2 삭제
- **작성자만** 가능
- 영구 삭제 (soft delete 아님)

## 8. 리뷰 조회

### 8.1 모임별 리뷰
```
GET /api/meetups/:meetupId/reviews?page=1&limit=10
Response:
{
  success: true,
  data: [...reviews],
  meta: {
    averageRating: 4.5,
    totalReviews: 23,
    page: 1,
    limit: 10,
    totalPages: 3
  }
}
```

### 8.2 사용자 리뷰 통계
```
GET /api/reviews/users/:userId/stats
Response:
{
  success: true,
  totalReviews: 15,
  averageRating: "4.3",
  tagAnalysis: [
    { tag: "친절해요", count: 12 },
    { tag: "재미있어요", count: 8 }
  ]
}
```

## 9. 리뷰 가능한 참가자 목록

### 9.1 조회 조건
- 출석 확인된 참가자만 (`attended = true`)
- 본인 제외
- 이미 평가한 참가자 표시

### 9.2 API
```
GET /api/meetups/:id/reviewable-participants
Response:
{
  success: true,
  meetup: { id, title, status },
  participants: [
    {
      id: "user-123",
      name: "홍길동",
      profileImage: "...",
      attended: true,
      alreadyReviewed: false,
      isHost: true
    }
  ]
}
```

## 10. 추천 리뷰 (피처링)

### 10.1 관리자 기능
특정 리뷰를 추천으로 표시:
```javascript
UPDATE meetup_reviews
SET is_featured = true
WHERE id = ?
```

### 10.2 활용
- 홈화면 노출
- 모임 상세 페이지 상단 표시

## 11. 신고 및 제재

### 11.1 부적절한 리뷰
- 욕설, 비방, 허위 내용
- 관리자 검토 후 삭제 가능

### 11.2 리뷰 정책 위반
- 반복 위반 시 리뷰 작성 권한 제한

## 12. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/meetups/:meetupId/reviews` | 모임 리뷰 목록 |
| POST | `/api/meetups/:id/reviews` | 리뷰 작성 |
| PUT | `/api/reviews/:id` | 리뷰 수정 |
| DELETE | `/api/reviews/:id` | 리뷰 삭제 |
| POST | `/api/reviews/rate-participant` | 참가자 평가 |
| GET | `/api/reviews/users/:userId/stats` | 사용자 리뷰 통계 |
| GET | `/api/meetups/:id/reviewable-participants` | 리뷰 가능 참가자 |
| PATCH | `/api/admin/reviews/:reviewId/feature` | 추천 리뷰 설정 |

## 13. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
