# 노쇼 시스템 구현 정책 (No-Show System Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

이 문서는 혼밥시러 앱의 노쇼 시스템 **구현 상세**를 다룹니다. 노쇼 정책(환불율, 페널티 규칙)은 [NOSHOW_POLICY.md](./NOSHOW_POLICY.md)를 참조하세요.

## 2. 시스템 흐름

```
모임 종료 → 출석 확인 → 노쇼 신고 → 노쇼 확정 → 패널티 적용 → 배상금 분배
```

### 2.1 노쇼 확정 조건

노쇼로 확정되는 조건 (OR 조건):
1. GPS 미인증 + **호스트가 노쇼 신고**
2. GPS 미인증 + **다른 참가자 2명 이상 노쇼 신고**

## 3. 노쇼 신고

### 3.1 기능 (`reportNoShow`)

```javascript
// 요청
POST /api/deposits/:meetupId/report-noshow
{
  reportedUserId: uuid,
  isHost: boolean  // 호스트 여부
}
```

### 3.2 처리 로직

```javascript
// 1. 같은 모임 참가자인지 확인
SELECT mp.user_id, mp.status, m.host_id
FROM meetup_participants mp
JOIN meetups m ON mp.meetup_id = m.id
WHERE mp.meetup_id = $meetupId AND mp.user_id IN ($reporterId, $reportedUserId)

// 2명 미만이면 에러
if (participantCheck.rows.length < 2) {
  return error("같은 모임 참가자만 노쇼 신고할 수 있습니다.")
}

// 2. 노쇼 신고 기록 (user_reviews 테이블 활용)
INSERT INTO user_reviews (
  meetup_id, reviewer_id, reviewed_user_id, rating, reported_noshow, created_at
) VALUES ($1, $2, $3, 1, true, NOW())
ON CONFLICT (meetup_id, reviewer_id, reviewed_user_id) DO UPDATE SET
  reported_noshow = true, updated_at = NOW()
```

### 3.3 신고 데이터 구조

```javascript
// user_reviews 테이블의 노쇼 신고 필드
{
  meetup_id: uuid,
  reviewer_id: uuid,        // 신고자
  reviewed_user_id: uuid,   // 피신고자
  reported_noshow: true,    // 노쇼 신고 여부
  rating: 1                 // 노쇼 시 최저 평점
}
```

## 4. 노쇼 현황 조회

### 4.1 기능 (`getNoShowStatus`)

```javascript
// 요청
GET /api/deposits/:meetupId/noshow-status
```

### 4.2 쿼리 로직

```javascript
SELECT
  mp.user_id,
  u.name,
  mp.attended,                          // 출석 여부
  mp.no_show,                           // 노쇼 플래그
  mp.no_show_confirmed,                 // 노쇼 확정 여부
  COUNT(ur.id) FILTER (WHERE ur.reported_noshow = true) as noshow_reports,
  EXISTS(
    SELECT 1 FROM user_reviews ur2
    JOIN meetup_participants mp2 ON ur2.reviewer_id = mp2.user_id
    JOIN meetups m2 ON mp2.meetup_id = m2.id
    WHERE ur2.meetup_id = $meetupId
      AND ur2.reviewed_user_id = mp.user_id
      AND ur2.reported_noshow = true
      AND mp2.user_id = m2.host_id
  ) as host_reported  // 호스트 신고 여부
FROM meetup_participants mp
JOIN users u ON mp.user_id = u.id
LEFT JOIN user_reviews ur ON ur.meetup_id = mp.meetup_id AND ur.reviewed_user_id = mp.user_id
WHERE mp.meetup_id = $meetupId AND mp.status = '참가승인'
GROUP BY mp.user_id, u.name, mp.attended, mp.no_show, mp.no_show_confirmed
```

### 4.3 응답 형식

```javascript
{
  success: true,
  participants: [
    {
      userId: uuid,
      nickname: "홍길동",
      attended: false,           // GPS 출석 여부
      noShow: false,             // 노쇼 플래그
      noShowConfirmed: false,    // 노쇼 확정
      noShowReports: 2,          // 노쇼 신고 횟수
      hostReported: true         // 호스트 신고 여부
    }
  ]
}
```

## 5. 노쇼 처리 실행

### 5.1 기능 (`processNoShow`)

관리자 또는 스케줄러가 노쇼를 확정하고 패널티를 적용합니다.

```javascript
// 요청
POST /api/deposits/:meetupId/process-noshow
```

### 5.2 노쇼 대상 조회

```javascript
SELECT
  mp.user_id,
  mp.meetup_id,
  pd.id as deposit_id,
  pd.amount as deposit_amount,
  COUNT(ur.id) FILTER (WHERE ur.reported_noshow = true) as noshow_reports,
  EXISTS(...) as host_reported
FROM meetup_participants mp
JOIN promise_deposits pd ON pd.meetup_id = mp.meetup_id AND pd.user_id = mp.user_id
LEFT JOIN user_reviews ur ON ur.meetup_id = mp.meetup_id AND ur.reviewed_user_id = mp.user_id
WHERE mp.meetup_id = $meetupId
  AND mp.status = '참가승인'
  AND mp.attended = false      // 미출석
  AND pd.status = 'paid'       // 약속금 결제됨
GROUP BY mp.user_id, mp.meetup_id, pd.id, pd.amount
HAVING
  COUNT(ur.id) FILTER (WHERE ur.reported_noshow = true) >= 2  // 2명 이상 신고
  OR EXISTS(... host_reported ...)                             // 또는 호스트 신고
```

### 5.3 처리 흐름 (트랜잭션)

```javascript
// 트랜잭션 시작
BEGIN;

for (const noShow of noShowResult.rows) {
  // 1. 노쇼 확정
  UPDATE meetup_participants
  SET no_show = true, no_show_confirmed = true
  WHERE meetup_id = $meetupId AND user_id = $userId

  // 2. 약속금 몰수
  const forfeitedAmount = deposit_amount
  const victimCompensation = forfeitedAmount * 0.7  // 70%
  const platformFee = forfeitedAmount * 0.3         // 30%

  UPDATE promise_deposits
  SET status = 'forfeited',
      forfeited_amount = $forfeitedAmount,
      cancellation_type = 'noshow'
  WHERE id = $depositId

  // 3. 피해자 배상 (출석자에게 분배)
  const compensationPerPerson = victimCompensation / attendedUsers.length

  for (victimId of attendedUsers) {
    // 배상 기록
    INSERT INTO noshow_compensations (...)

    // 포인트 지급
    UPDATE user_points SET available_points += compensationPerPerson

    // 포인트 거래 내역
    INSERT INTO point_transactions (...)
  }

  // 4. 플랫폼 수익 기록
  INSERT INTO platform_revenues (
    meetup_id, user_id, amount, revenue_type, description
  ) VALUES ($meetupId, $userId, $platformFee, 'noshow_fee', '노쇼 수수료 (30%)')

  // 5. 밥알 점수 감소 (-15점)
  UPDATE users SET babal_score = GREATEST(0, babal_score - 15)
  WHERE id = $userId

  // 6. 취소 이력에 노쇼 기록
  INSERT INTO user_cancellation_history (
    user_id, meetup_id, cancellation_type, refund_rate, refund_amount, original_deposit, reason
  ) VALUES ($userId, $meetupId, 'noshow', 0, 0, $depositAmount, '노쇼 확정')

  // 7. 누적 노쇼 제재 체크
  await checkNoShowRestriction(client, userId)
}

COMMIT;
```

### 5.4 배상금 분배 공식

| 항목 | 비율 | 설명 |
|------|------|------|
| 피해자 배상 | 70% | 출석한 참가자에게 균등 분배 |
| 플랫폼 수수료 | 30% | 시스템 운영 비용 |

```javascript
// 예: 3000원 몰수, 출석자 2명
forfeitedAmount = 3000
victimCompensation = 3000 * 0.7 = 2100
compensationPerPerson = 2100 / 2 = 1050  // 각 출석자에게 1050원
platformFee = 3000 * 0.3 = 900
```

## 6. 호스트 노쇼 패널티 적용

### 6.1 기능 (`applyNoShowPenalties`)

호스트가 직접 미출석자에게 패널티를 적용합니다.

```javascript
// 요청
POST /api/meetups/:id/apply-no-show-penalties
```

### 6.2 처리 로직

```javascript
// 1. 호스트 권한 확인
SELECT host_id, title, price FROM meetups WHERE id = $meetupId

if (meetup.host_id !== userId) {
  return error("해당 모임의 호스트만 노쇼 패널티를 적용할 수 있습니다.")
}

// 2. 미출석 참가자 조회 (호스트 제외)
SELECT mp.user_id, u.name, u.bab_al_score
FROM meetup_participants mp
JOIN users u ON mp.user_id = u.id
WHERE mp.meetup_id = $meetupId
  AND mp.status = '참가승인'
  AND mp.attended IS NOT TRUE
  AND mp.user_id != $hostId

// 3. 각 노쇼자에 대해 패널티 적용
for (noShow of noShowParticipants) {
  // 밥알 점수 차감
  UPDATE users SET bab_al_score = GREATEST(0, bab_al_score - 15)
  WHERE id = $userId

  // 노쇼 상태 업데이트
  UPDATE meetup_participants
  SET no_show = true, no_show_confirmed = true
  WHERE meetup_id = $meetupId AND user_id = $userId
}
```

## 7. 누적 노쇼 제재

### 7.1 제재 기준

| 누적 노쇼 | 제재 | 기간 |
|-----------|------|------|
| 3회 | 참가 제한 | 7일 |
| 5회 | 참가 제한 | 30일 |
| 10회 | 영구 제한 | 영구 (100년) |

### 7.2 구현 (`checkNoShowRestriction`)

```javascript
const checkNoShowRestriction = async (client, userId) => {
  // 누적 노쇼 횟수 조회
  SELECT COUNT(*) as noshow_count
  FROM user_cancellation_history
  WHERE user_id = $userId AND cancellation_type = 'noshow'

  const noShowCount = parseInt(result.rows[0].noshow_count)
  let restrictionDays = 0
  let restrictionType = 'participation'

  if (noShowCount >= 10) {
    restrictionDays = 36500  // 영구 (100년)
    restrictionType = 'permanent'
  } else if (noShowCount >= 5) {
    restrictionDays = 30
  } else if (noShowCount >= 3) {
    restrictionDays = 7
  }

  if (restrictionDays > 0) {
    INSERT INTO user_restrictions (
      user_id, restriction_type, reason, restricted_until
    ) VALUES (
      $userId, $restrictionType, '누적 노쇼 ${noShowCount}회',
      NOW() + make_interval(days => $restrictionDays)
    )
    ON CONFLICT (user_id, restriction_type) DO UPDATE SET
      restricted_until = NOW() + make_interval(days => $restrictionDays),
      reason = '누적 노쇼 ${noShowCount}회'
  }
}
```

## 8. 배상금 내역 조회

### 8.1 기능 (`getMyCompensations`)

```javascript
// 요청
GET /api/deposits/my-compensations
```

### 8.2 쿼리

```javascript
SELECT
  nc.*,
  m.title as meetup_title,
  m.date as meetup_date,
  u.name as noshow_user_nickname
FROM noshow_compensations nc
JOIN meetups m ON nc.meetup_id = m.id
JOIN users u ON nc.noshow_user_id = u.id
WHERE nc.victim_user_id = $userId
ORDER BY nc.created_at DESC
```

### 8.3 응답 형식

```javascript
{
  success: true,
  compensations: [
    {
      id: uuid,
      meetupId: uuid,
      meetupTitle: "강남 점심 모임",
      meetupDate: "2024-01-23",
      noshowUserNickname: "노쇼유저",
      depositAmount: 3000,
      compensationAmount: 1050,
      status: "paid",
      paidAt: "2024-01-23T14:00:00Z"
    }
  ]
}
```

## 9. 노쇼 이의 신청

### 9.1 기능 (`appealNoShow`)

```javascript
// 요청
POST /api/deposits/appeal-noshow
{
  meetupId: uuid,
  reason: "이의 사유",
  evidence: "증거 설명 또는 URL"
}
```

### 9.2 처리 로직

```javascript
// 1. 노쇼 확정 여부 확인
SELECT * FROM meetup_participants
WHERE meetup_id = $meetupId AND user_id = $userId AND no_show_confirmed = true

if (rows.length === 0) {
  return error("노쇼 이의 신청 대상이 아닙니다.")
}

// 2. 이의 신청 기록 (support_tickets 테이블 활용)
INSERT INTO support_tickets (
  user_id, type, title, content, status, priority
) VALUES (
  $userId, 'noshow_appeal',
  '노쇼 이의 신청 - 모임 ${meetupId}',
  JSON.stringify({ meetupId, reason, evidence }),
  'pending', 'high'
)
```

### 9.3 이의 처리 흐름

1. 사용자가 이의 신청 제출
2. 관리자가 support_tickets에서 검토
3. 승인 시 노쇼 취소 및 배상금 회수 처리 (수동)

## 10. 취소 이력 조회

### 10.1 기능 (`getMyCancellationHistory`)

```javascript
// 요청
GET /api/deposits/my-cancellation-history
```

### 10.2 쿼리

```javascript
SELECT
  uch.*,
  m.title as meetup_title,
  m.date as meetup_date
FROM user_cancellation_history uch
JOIN meetups m ON uch.meetup_id = m.id
WHERE uch.user_id = $userId
ORDER BY uch.created_at DESC
```

### 10.3 응답 형식

```javascript
{
  success: true,
  history: [
    {
      id: uuid,
      meetupId: uuid,
      meetupTitle: "모임 제목",
      meetupDate: "2024-01-23",
      cancellationType: "noshow",      // 'voluntary', 'late_40min', 'late_20min', 'late_10min', 'noshow'
      minutesBeforeMeetup: null,       // 노쇼는 null
      refundRate: 0,
      refundAmount: 0,
      originalDeposit: 3000,
      reason: "노쇼 확정",
      createdAt: "2024-01-23T15:00:00Z"
    }
  ]
}
```

## 11. 제재 현황 조회

### 11.1 기능 (`getMyRestrictions`)

```javascript
// 요청
GET /api/deposits/my-restrictions
```

### 11.2 쿼리

```javascript
SELECT * FROM user_restrictions
WHERE user_id = $userId AND restricted_until > NOW()
ORDER BY restricted_until DESC
```

### 11.3 응답 형식

```javascript
{
  success: true,
  restrictions: [
    {
      id: uuid,
      restrictionType: "participation",  // 'participation', 'permanent'
      reason: "누적 노쇼 3회",
      restrictedUntil: "2024-01-30T00:00:00Z",
      createdAt: "2024-01-23T15:00:00Z"
    }
  ],
  isRestricted: true
}
```

## 12. 데이터 구조

### 12.1 noshow_compensations 테이블

```javascript
{
  id: uuid,
  meetup_id: uuid,
  noshow_user_id: uuid,         // 노쇼자
  victim_user_id: uuid,         // 피해자 (배상 받는 사람)
  deposit_amount: integer,      // 원 약속금
  compensation_amount: integer, // 배상금액
  platform_fee: integer,        // 플랫폼 수수료
  status: string,               // 'pending', 'paid'
  paid_at: timestamp,
  created_at: timestamp
}
```

### 12.2 user_cancellation_history 테이블

```javascript
{
  id: uuid,
  user_id: uuid,
  meetup_id: uuid,
  cancellation_type: string,    // 'voluntary', 'late_40min', 'late_20min', 'late_10min', 'noshow'
  minutes_before_meetup: integer,
  refund_rate: integer,         // 0-100
  refund_amount: integer,
  original_deposit: integer,
  reason: string,
  created_at: timestamp
}
```

### 12.3 user_restrictions 테이블

```javascript
{
  id: uuid,
  user_id: uuid,
  restriction_type: string,     // 'participation', 'permanent'
  reason: string,
  restricted_until: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 12.4 platform_revenues 테이블

```javascript
{
  id: uuid,
  meetup_id: uuid,
  user_id: uuid,                // 원인 제공자
  amount: integer,
  revenue_type: string,         // 'cancellation_fee', 'noshow_fee'
  description: string,
  created_at: timestamp
}
```

## 13. 취소 환불 정책 연동

### 13.1 시간대별 환불율 (`calculateRefundRate`)

| 시간 | 환불율 | 취소 유형 |
|------|--------|-----------|
| 모집중 상태 | 100% | voluntary |
| 1시간 이상 전 | 100% | voluntary |
| 40분~1시간 전 | 60% | late_40min |
| 20분~40분 전 | 30% | late_20min |
| 10분~20분 전 | 0% | late_10min |
| 10분 이내 | 취소 불가 | noshow |

### 13.2 잦은 취소 제재 (`checkAndApplyRestriction`)

```javascript
// 30일 내 직전 취소 횟수 조회
SELECT COUNT(*) as cancel_count
FROM user_cancellation_history
WHERE user_id = $userId
  AND cancellation_type IN ('late_40min', 'late_20min', 'late_10min')
  AND created_at > NOW() - INTERVAL '30 days'

if (cancelCount >= 5) {
  // 7일 이용 제한
  INSERT INTO user_restrictions (
    user_id, restriction_type, reason, restricted_until
  ) VALUES ($userId, 'participation', '잦은 직전 취소 (30일 내 ${cancelCount}회)', NOW() + INTERVAL '7 days')
}
```

## 14. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 같은 모임 참가자 아님 | 400 | "같은 모임 참가자만 노쇼 신고할 수 있습니다" |
| 권한 없음 | 403 | "노쇼 현황을 조회할 권한이 없습니다" |
| 호스트 권한 없음 | 403 | "해당 모임의 호스트만 노쇼 패널티를 적용할 수 있습니다" |
| 이의 대상 아님 | 400 | "노쇼 이의 신청 대상이 아닙니다" |
| 이용 제한 중 | 403 | "현재 이용 제한 중입니다" |
| 서버 오류 | 500 | "처리 중 오류가 발생했습니다" |

## 15. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| POST | `/api/deposits/:meetupId/report-noshow` | 노쇼 신고 | `reportNoShow` |
| GET | `/api/deposits/:meetupId/noshow-status` | 노쇼 현황 조회 | `getNoShowStatus` |
| POST | `/api/deposits/:meetupId/process-noshow` | 노쇼 처리 실행 | `processNoShow` |
| POST | `/api/meetups/:id/apply-no-show-penalties` | 호스트 노쇼 패널티 적용 | `applyNoShowPenalties` |
| GET | `/api/deposits/my-compensations` | 내 배상금 내역 | `getMyCompensations` |
| POST | `/api/deposits/appeal-noshow` | 노쇼 이의 신청 | `appealNoShow` |
| GET | `/api/deposits/my-cancellation-history` | 내 취소 이력 | `getMyCancellationHistory` |
| GET | `/api/deposits/my-restrictions` | 내 제재 현황 | `getMyRestrictions` |

## 16. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
