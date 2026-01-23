# 뱃지 시스템 정책 (Badge Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 뱃지 시스템은 사용자의 활동을 보상하고 성취감을 제공하는 업적 시스템입니다. 모임 참여, 리뷰 작성 등의 활동을 통해 뱃지를 획득할 수 있습니다.

## 2. 뱃지 구조

### 2.1 badges 테이블

```javascript
{
  id: uuid,
  name: string,              // 뱃지 이름
  description: string,       // 설명
  category: string,          // 카테고리 (meetup_count, review_count 등)
  required_count: integer,   // 획득 조건 (횟수)
  icon: string,              // 아이콘 URL 또는 이모지
  is_active: boolean,        // 활성 상태
  created_at: timestamp
}
```

### 2.2 user_badges 테이블

```javascript
{
  id: uuid,
  user_id: uuid,
  badge_id: uuid,
  earned_at: timestamp,      // 획득 시각
  is_featured: boolean       // 대표 뱃지 여부
}
```

## 3. 뱃지 카테고리

### 3.1 모임 참여 기반 (meetup_count)

| 뱃지명 | 조건 | 설명 |
|--------|------|------|
| 첫 만남 | 1회 | 첫 모임 참여 |
| 밥친구 | 5회 | 5번 모임 참여 |
| 단골손님 | 10회 | 10번 모임 참여 |
| 소셜킹 | 30회 | 30번 모임 참여 |
| 밥신 | 100회 | 100번 모임 참여 |

### 3.2 리뷰 작성 기반 (review_count)

| 뱃지명 | 조건 | 설명 |
|--------|------|------|
| 첫 리뷰 | 1회 | 첫 리뷰 작성 |
| 후기왕 | 10회 | 10개 리뷰 작성 |
| 리뷰 마스터 | 50회 | 50개 리뷰 작성 |

### 3.3 기타 카테고리 (확장 가능)

- `host_count`: 모임 주최 횟수
- `perfect_attendance`: 연속 출석
- `early_bird`: 얼리버드 참가
- `special`: 특별 이벤트

## 4. 뱃지 조회

### 4.1 전체 뱃지 목록 (`getAllBadges`)

```javascript
// 모든 뱃지 조회 (정렬: 카테고리 → 필요 횟수)
SELECT * FROM badges ORDER BY category, required_count

// 응답
{
  success: true,
  badges: [
    {
      id: uuid,
      name: "첫 만남",
      description: "첫 모임에 참여했어요!",
      category: "meetup_count",
      required_count: 1,
      icon: "🍚"
    }
  ]
}
```

### 4.2 획득 가능한 뱃지 (`getAvailableBadges`)

활성 상태인 뱃지만 조회:

```javascript
SELECT id, name, description, category, required_count, icon
FROM badges
WHERE is_active = true
ORDER BY category, required_count
```

### 4.3 내 뱃지 목록 (`getMyBadges`)

```javascript
SELECT
  b.*,
  ub.earned_at,
  ub.is_featured
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
WHERE ub.user_id = ?
ORDER BY ub.earned_at DESC

// 응답
{
  success: true,
  badges: [
    {
      id: uuid,
      name: "밥친구",
      category: "meetup_count",
      earned_at: "2024-01-20T10:00:00Z",
      is_featured: true
    }
  ]
}
```

## 5. 뱃지 진행률 조회

### 5.1 진행률 계산 (`getBadgeProgress`)

```javascript
// 1. 사용자의 모임 참가 수 조회
SELECT COUNT(*) as count FROM meetup_participants
WHERE user_id = ? AND status = '참가승인'

// 2. 리뷰 작성 수 조회
SELECT COUNT(*) as count FROM reviews
WHERE reviewer_id = ?

// 3. 모든 뱃지와 획득 여부 조회
SELECT
  b.*,
  CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as earned,
  ub.earned_at
FROM badges b
LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = ?
WHERE b.is_active = true
ORDER BY b.category, b.required_count
```

### 5.2 진행률 계산 로직

```javascript
const progress = badges.map(badge => {
  let currentProgress = 0;

  // 카테고리별 현재 진행 상황 계산
  if (badge.category === 'meetup_count') {
    currentProgress = meetupCount;
  } else if (badge.category === 'review_count') {
    currentProgress = reviewCount;
  }

  return {
    ...badge,
    currentProgress,
    progressPercent: badge.required_count > 0
      ? Math.min(100, Math.round((currentProgress / badge.required_count) * 100))
      : 0
  };
});
```

### 5.3 응답 예시

```javascript
{
  success: true,
  progress: [
    {
      id: uuid,
      name: "밥친구",
      category: "meetup_count",
      required_count: 5,
      currentProgress: 3,
      progressPercent: 60,
      earned: false
    },
    {
      id: uuid,
      name: "첫 만남",
      category: "meetup_count",
      required_count: 1,
      currentProgress: 3,
      progressPercent: 100,
      earned: true,
      earned_at: "2024-01-15T09:00:00Z"
    }
  ]
}
```

## 6. 뱃지 획득

### 6.1 수동 획득 (`earnBadge`)

특정 조건 충족 시 수동으로 뱃지를 부여하는 경우:

```javascript
// 1. 이미 획득 여부 확인
SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?

if (existing) {
  return error("이미 획득한 뱃지입니다")
}

// 2. 뱃지 획득 기록
INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES (?, ?, NOW())

// 3. 뱃지 정보 반환
SELECT * FROM badges WHERE id = ?
```

### 6.2 자동 획득 (`checkBadgeEligibility`)

활동 완료 시 자동으로 뱃지 획득 조건을 체크하는 내부 함수:

```javascript
// 1. 현재 참여 모임 수 조회
SELECT COUNT(*) as count FROM meetup_participants
WHERE user_id = ? AND status = '참가승인'

// 2. 획득 가능한 뱃지 조회
SELECT b.* FROM badges b
WHERE b.category = 'meetup_count'
  AND b.required_count <= meetupCount
  AND b.id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = ?)

// 3. 자동 획득 (중복 방지)
for (badge of eligibleBadges) {
  INSERT INTO user_badges (user_id, badge_id, earned_at)
  VALUES (?, badge.id, NOW())
  ON CONFLICT DO NOTHING
}
```

### 6.3 획득 트리거 시점

뱃지 획득 조건은 다음 시점에 체크됩니다:

| 이벤트 | 체크되는 카테고리 |
|--------|------------------|
| 모임 참가 승인 | meetup_count |
| 리뷰 작성 | review_count |
| 모임 주최 | host_count |

## 7. 대표 뱃지 설정

### 7.1 개념

사용자가 획득한 뱃지 중 하나를 **대표 뱃지**로 설정하여 프로필에 표시할 수 있습니다.

### 7.2 설정 로직 (`setFeaturedBadge`)

```javascript
// 1. 기존 대표 뱃지 모두 해제
UPDATE user_badges SET is_featured = false WHERE user_id = ?

// 2. 새 대표 뱃지 설정
UPDATE user_badges SET is_featured = true
WHERE user_id = ? AND badge_id = ?
RETURNING *

// 3. 뱃지 없으면 404
if (result.rows.length === 0) {
  return error("뱃지를 찾을 수 없습니다")
}
```

### 7.3 제약 조건

- **1개만** 대표 뱃지로 설정 가능
- **획득한 뱃지**만 대표로 설정 가능

## 8. 뱃지 표시

### 8.1 프로필 뱃지

사용자 프로필에서 대표 뱃지 표시:

```javascript
// 대표 뱃지 조회
SELECT b.* FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
WHERE ub.user_id = ? AND ub.is_featured = true
```

### 8.2 뱃지 컬렉션

마이페이지에서 전체 뱃지 표시:
- 획득한 뱃지: 컬러로 표시
- 미획득 뱃지: 흑백 + 잠금 아이콘
- 진행률 바 표시

## 9. 데이터 구조 상세

### 9.1 뱃지 아이콘

아이콘은 다음 형식 지원:
- 이모지: "🍚", "⭐" 등
- URL: "https://cdn.example.com/badges/first_meal.png"
- 아이콘 코드: "badge_first_meal"

### 9.2 뱃지 활성/비활성

```javascript
// 비활성 뱃지는 목록에서 제외
// 이벤트 종료 등으로 비활성화 가능
UPDATE badges SET is_active = false WHERE id = ?
```

## 10. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 이미 획득 | 400 | "이미 획득한 뱃지입니다" |
| 뱃지 없음 | 404 | "뱃지를 찾을 수 없습니다" |
| 미획득 뱃지 대표 설정 | 404 | "뱃지를 찾을 수 없습니다" |

## 11. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/badges` | 전체 뱃지 목록 | `getAllBadges` |
| GET | `/api/badges/available` | 획득 가능한 뱃지 | `getAvailableBadges` |
| GET | `/api/badges/progress` | 뱃지 진행률 | `getBadgeProgress` |
| GET | `/api/badges/my` | 내 뱃지 목록 | `getMyBadges` |
| POST | `/api/badges/:badgeId/earn` | 뱃지 획득 | `earnBadge` |
| PUT | `/api/badges/:badgeId/featured` | 대표 뱃지 설정 | `setFeaturedBadge` |

## 12. 확장 계획

### 12.1 추가 카테고리

- 연속 출석 뱃지 (7일, 30일)
- 특정 카테고리 모임 뱃지 (한식 마스터, 양식 마스터)
- 시간대별 뱃지 (얼리버드, 올빼미)
- 계절/이벤트 한정 뱃지

### 12.2 뱃지 보상

뱃지 획득 시 포인트 보상 연동:

```javascript
// 뱃지 획득 시 포인트 지급 (예정)
if (badge.reward_points > 0) {
  addPoints(userId, badge.reward_points, `${badge.name} 뱃지 획득 보상`)
}
```

## 13. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
