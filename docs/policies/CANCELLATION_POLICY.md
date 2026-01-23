# 취소 정책 (Cancellation Policy)

> 혼밥시러 서비스의 모임 취소에 관한 정책 문서입니다.

## 1. 취소 유형

### 1.1 취소 분류

| 유형 | 설명 | 코드 |
|------|------|------|
| 자발적 취소 | 참가자가 직접 취소 (1시간 전) | `voluntary` |
| 직전 취소 (40분) | 모임 40분 전 취소 | `late_40min` |
| 직전 취소 (20분) | 모임 20분 전 취소 | `late_20min` |
| 직전 취소 (10분) | 모임 10분 전 취소 | `late_10min` |
| 노쇼 | 무단 불참 | `noshow` |
| 시스템 취소 | 정원 미달, 운영 사유 | `system` |
| 호스트 취소 | 호스트가 모임 취소 | `host_cancel` |

---

## 2. 참가자 취소

### 2.1 취소 가능 시점 및 환불

```
모임 시작 시간 기준
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
|        100% 환불         | 60% | 30% |  0%  |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                          -60m  -40m  -20m  -10m  시작
```

| 취소 시점 | 환불율 | 상태 |
|----------|--------|------|
| 1시간 이상 전 | 100% | 정상 취소 |
| 40분 ~ 60분 전 | 60% | 직전 취소 |
| 20분 ~ 40분 전 | 30% | 직전 취소 |
| 10분 ~ 20분 전 | 0% | 직전 취소 |
| 10분 이내 | 0% | 취소 불가 (노쇼 처리) |

### 2.2 취소 프로세스

```
1. 참가자가 취소 요청
   ↓
2. 현재 시간과 모임 시작 시간 비교
   ↓
3. 환불율 계산
   ↓
4. 약속금 환불 처리
   - 환불 금액 → 포인트 반환
   - 몰수 금액 → 플랫폼 수익
   ↓
5. 취소 이력 기록
   ↓
6. 취소 횟수 확인 → 제재 여부 판단
```

### 2.3 취소 제한

- **모집완료(확정) 상태**에서만 직전 취소 패널티 적용
- **모집중** 상태에서는 언제든 100% 환불

---

## 3. 호스트 취소

### 3.1 호스트의 모임 취소

| 상황 | 처리 |
|------|------|
| 모집중 상태에서 취소 | 모든 참가자 100% 환불 |
| 모집완료(확정) 후 취소 | 모든 참가자 100% 환불 + 추가 배상 |
| 모임 당일 취소 | 호스트 페널티 + 참가자 전액 환불 |

### 3.2 호스트 취소 패널티

| 취소 시점 | 호스트 페널티 |
|----------|--------------|
| 24시간 이상 전 | 경고 |
| 24시간 이내 | 밥알 점수 -10 |
| 당일 취소 | 밥알 점수 -20 + 일시 제한 |
| 3회 누적 | 호스트 자격 정지 (30일) |

---

## 4. 시스템 취소

### 4.1 자동 취소 조건

| 조건 | 처리 |
|------|------|
| 모임 시작 30분 전까지 최소 인원 미달 | 자동 취소 |
| 호스트 계정 정지 | 자동 취소 |
| 서비스 점검/장애 | 관리자 수동 취소 |

### 4.2 시스템 취소 시 환불

- **모든 참가자** 100% 전액 환불
- 페널티 없음
- 알림 발송

---

## 5. 노쇼 처리

### 5.1 노쇼 판정 기준

| 조건 | 노쇼 판정 |
|------|----------|
| GPS 인증 실패 (모임 종료 후) | 1차 노쇼 의심 |
| 후기에서 2명 이상 노쇼 신고 | 노쇼 확정 |
| 호스트가 노쇼 확인 | 노쇼 확정 |

### 5.2 노쇼 처리 프로세스

```
1. 모임 종료 (date + time + 2시간)
   ↓
2. GPS 인증 기록 확인
   - 인증 없음 → 노쇼 의심 플래그
   ↓
3. 후기 작성 기간 (24시간)
   - 다른 참가자들이 노쇼 여부 확인
   ↓
4. 노쇼 최종 판정
   - 2명 이상 노쇼 신고 시 확정
   ↓
5. 약속금 몰수 및 배상 처리
```

### 5.3 노쇼자 페널티

| 항목 | 페널티 |
|------|--------|
| 약속금 | 전액 몰수 |
| 밥알 점수 | -15점 |
| 누적 3회 | 서비스 이용 제한 (7일) |
| 누적 5회 | 서비스 이용 제한 (30일) |
| 누적 10회 | 영구 제한 |

---

## 6. 취소 이력 관리

### 6.1 취소 이력 추적

```sql
user_cancellation_history (
  user_id,
  meetup_id,
  cancellation_type,      -- 취소 유형
  minutes_before_meetup,  -- 몇 분 전 취소
  refund_rate,            -- 환불율
  refund_amount,          -- 환불 금액
  original_deposit,       -- 원래 약속금
  reason                  -- 취소 사유
)
```

### 6.2 잦은 취소 제재

| 기준 | 제재 |
|------|------|
| 30일 내 3회 이상 직전 취소 | 경고 알림 |
| 30일 내 5회 이상 직전 취소 | 참가 제한 (7일) |
| 60일 내 10회 이상 취소 | 참가 제한 (30일) |

### 6.3 제재 해제

- 제재 기간 종료 시 자동 해제
- 이의 신청 가능 (관리자 검토)

---

## 7. 환불 계산 로직

### 7.1 환불 금액 계산

```javascript
function calculateRefund(depositAmount, minutesBeforeMeetup, meetupStatus) {
  // 모집중 상태면 100% 환불
  if (meetupStatus === '모집중') {
    return { refundRate: 100, refundAmount: depositAmount };
  }

  // 확정 상태에서의 환불율 계산
  let refundRate;
  if (minutesBeforeMeetup >= 60) {
    refundRate = 100;  // 1시간 이상 전
  } else if (minutesBeforeMeetup >= 40) {
    refundRate = 60;   // 40분 ~ 60분 전
  } else if (minutesBeforeMeetup >= 20) {
    refundRate = 30;   // 20분 ~ 40분 전
  } else {
    refundRate = 0;    // 20분 이내
  }

  const refundAmount = Math.floor(depositAmount * refundRate / 100);
  return { refundRate, refundAmount };
}
```

### 7.2 몰수금 분배

```javascript
function distributeForfeiture(forfeitedAmount) {
  const victimCompensation = Math.floor(forfeitedAmount * 0.7);  // 70%
  const platformFee = forfeitedAmount - victimCompensation;      // 30%

  return { victimCompensation, platformFee };
}
```

---

## 8. API 엔드포인트

### 8.1 취소 관련 API

```
POST   /api/meetups/:id/cancel-participation  - 참가 취소
POST   /api/meetups/:id/cancel                - 모임 취소 (호스트)
GET    /api/users/me/cancellation-history     - 취소 이력 조회
GET    /api/deposits/refund-preview           - 환불 예상 금액 조회
```

### 8.2 제재 관련 API

```
GET    /api/users/me/restrictions             - 내 제재 현황
POST   /api/restrictions/appeal               - 제재 이의 신청
```

---

## 9. 정책 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-01-23 | 최초 작성 |

---

*본 정책은 서비스 운영 상황에 따라 변경될 수 있으며, 변경 시 사전 공지합니다.*
