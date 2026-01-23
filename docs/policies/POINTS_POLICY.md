# 포인트 시스템 정책 (Points Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 포인트 시스템은 사용자의 활동을 보상하고 약속금 결제 등에 활용할 수 있는 인앱 화폐입니다.

## 2. 포인트 구조

### 2.1 포인트 유형
```
user_points 테이블:
- available_points: 사용 가능한 포인트 잔액
- total_earned: 총 적립 포인트
- total_used: 총 사용 포인트
```

### 2.2 포인트 거래 유형
| 유형 | 설명 | 방향 |
|------|------|------|
| `earn` | 포인트 적립 | + (증가) |
| `use` | 포인트 사용 | - (감소) |
| `deposit` | 약속금 결제 | - (감소) |
| `refund` | 약속금 환불 | + (증가) |
| `penalty` | 노쇼 패널티 | - (감소) |

## 3. 포인트 적립

### 3.1 적립 방법
1. **충전**: 직접 포인트 구매
2. **활동 보상**: 모임 참여, 리뷰 작성 등
3. **프로모션**: 이벤트 참여, 신규 가입 보너스

### 3.2 적립 로직
```javascript
// 트랜잭션 처리
BEGIN TRANSACTION

// 1. 포인트 증가 (UPSERT)
INSERT INTO user_points (user_id, available_points, total_earned)
VALUES (userId, amount, amount)
ON CONFLICT (user_id)
DO UPDATE SET
  available_points = user_points.available_points + amount,
  total_earned = user_points.total_earned + amount

// 2. 거래 내역 기록
INSERT INTO point_transactions (user_id, type, amount, reason, reference_id)
VALUES (userId, 'earn', amount, reason, referenceId)

COMMIT
```

## 4. 포인트 사용

### 4.1 사용 조건
- **잔액 확인**: 사용 전 반드시 available_points >= 사용량 확인
- **부족 시**: 400 에러 반환 ("포인트 잔액이 부족합니다.")

### 4.2 사용 로직
```javascript
// 1. 잔액 확인
SELECT available_points FROM user_points WHERE user_id = ?

// 2. 잔액 부족 시 → 거래 취소 (ROLLBACK)

// 3. 포인트 차감
UPDATE user_points
SET available_points = available_points - amount,
    total_used = total_used + amount
WHERE user_id = ?

// 4. 거래 내역 기록
INSERT INTO point_transactions (user_id, type, amount, reason)
VALUES (userId, 'use', amount, reason)
```

## 5. 약속금 결제/환불

### 5.1 약속금 결제
약속금 모듈(`/deposits`)과 연동하여 포인트로 약속금 결제 가능

**결제 흐름:**
1. 포인트 잔액 확인
2. 포인트 차감
3. `meetup_deposits` 테이블에 기록
4. 결제 완료

### 5.2 약속금 환불
- **조건**: `meetup_deposits.status = 'paid'`인 경우만 환불 가능
- **환불 시**: 포인트 복구 + 상태를 'refunded'로 변경

## 6. 포인트 조회

### 6.1 잔액 조회 API
```
GET /api/points
Response:
{
  success: true,
  points: {
    available: 10000,    // 사용 가능
    totalEarned: 50000,  // 총 적립
    totalUsed: 40000     // 총 사용
  }
}
```

### 6.2 거래 내역 조회 API
```
GET /api/points/history?page=1&limit=20&type=earn
Response:
{
  success: true,
  history: [...],
  pagination: { page, limit, total }
}
```

## 7. 신규 사용자 처리

사용자가 처음 포인트를 조회할 때 레코드가 없으면:
```javascript
// 자동 생성
INSERT INTO user_points (user_id, available_points, total_earned, total_used)
VALUES (userId, 0, 0, 0)

// 초기값 반환
{ available: 0, totalEarned: 0, totalUsed: 0 }
```

## 8. 트랜잭션 안전성

모든 포인트 관련 작업은 **트랜잭션으로 처리**:
- `BEGIN` → 작업 → `COMMIT` 또는 `ROLLBACK`
- 중간 실패 시 모든 변경 사항 롤백
- DB 커넥션 풀 사용 (`pool.connect()`)

## 9. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 잔액 부족 | 400 | "포인트 잔액이 부족합니다." |
| 환불할 약속금 없음 | 400 | "환불할 약속금이 없습니다." |
| 서버 오류 | 500 | "서버 오류가 발생했습니다" |

## 10. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/points` | 포인트 잔액 조회 |
| GET | `/api/points/history` | 포인트 내역 조회 |
| POST | `/api/points/earn` | 포인트 적립 |
| POST | `/api/points/use` | 포인트 사용 |
| POST | `/api/points/deposit` | 약속금 결제 |
| POST | `/api/points/refund` | 약속금 환불 |

## 11. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
