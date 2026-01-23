# 고객 지원 정책 (Support Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 고객 지원 시스템은 FAQ, 문의하기, 공지사항, 법률 문서 등 사용자 지원 기능을 제공합니다.

## 2. FAQ

### 2.1 기능 (`getFaq`)

자주 묻는 질문을 카테고리별로 조회합니다.

### 2.2 쿼리

```javascript
// 카테고리 필터 (선택)
GET /api/support/faq?category=모임

SELECT id, category, question, answer, order_index, created_at, updated_at
FROM faq
WHERE is_active = true
  AND category = ?  // 선택적
ORDER BY category, order_index, created_at
```

### 2.3 카테고리 종류

| 카테고리 | 설명 |
|----------|------|
| 모임 | 모임 생성/참가 관련 |
| 포인트 | 포인트 충전/사용 |
| 결제 | 약속금/환불 |
| 계정 | 회원가입/로그인 |
| 기타 | 기타 문의 |

### 2.4 데이터 구조

```javascript
{
  id: uuid,
  category: string,
  question: string,
  answer: string,
  order_index: integer,   // 정렬 순서
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

## 3. 문의하기

### 3.1 문의 접수 (`createInquiry`)

```javascript
// 요청
POST /api/support/inquiry
{
  subject: "모임 참가가 안 돼요",    // 필수
  content: "참가 버튼을 눌러도...",   // 필수
  category: "모임"                   // 선택, 기본값: '일반'
}
```

### 3.2 처리 로직

```javascript
// 유효성 검사
if (!subject || !content) {
  return error("제목과 내용을 입력해주세요")
}

// 문의 저장
INSERT INTO support_inquiries (user_id, subject, content, category, status, created_at)
VALUES (?, ?, ?, ?, '접수', NOW())
RETURNING id, subject, category, status, created_at
```

### 3.3 문의 상태 (status)

| 상태 | 설명 |
|------|------|
| `접수` | 문의 접수됨, 처리 대기 |
| `처리중` | 관리자가 확인 중 |
| `답변완료` | 답변 완료 |
| `종료` | 처리 완료 |

### 3.4 내 문의 내역 조회 (`getMyInquiries`)

```javascript
GET /api/support/my-inquiries?page=1&limit=10

// 응답
{
  success: true,
  data: [
    {
      id: uuid,
      subject: "문의 제목",
      content: "문의 내용",
      category: "모임",
      status: "답변완료",
      created_at: timestamp,
      updated_at: timestamp
    }
  ],
  pagination: {
    total: 25,
    page: 1,
    limit: 10,
    totalPages: 3
  }
}
```

## 4. 공지사항

### 4.1 목록 조회 (`getNotices`)

```javascript
SELECT
  id, title, content,
  COALESCE(type, 'general') as type,
  created_at, updated_at,
  COALESCE(is_pinned, false) as is_pinned,
  COALESCE(views, 0) as views
FROM notices
WHERE is_active = true
ORDER BY is_pinned DESC, created_at DESC
```

### 4.2 공지 유형 (type)

| 유형 | 설명 |
|------|------|
| `general` | 일반 공지 |
| `event` | 이벤트/프로모션 |
| `maintenance` | 서비스 점검 |
| `update` | 업데이트 안내 |
| `policy` | 정책 변경 |

### 4.3 상세 조회 (`getNoticeById`)

상세 조회 시 조회수 자동 증가:

```javascript
// 1. 조회수 증가
UPDATE notices SET views = COALESCE(views, 0) + 1
WHERE id = ? AND is_active = true

// 2. 상세 정보 조회
SELECT * FROM notices WHERE id = ? AND is_active = true
```

### 4.4 데이터 구조

```javascript
{
  id: uuid,
  title: string,
  content: string,
  type: 'general' | 'event' | 'maintenance' | 'update' | 'policy',
  is_pinned: boolean,     // 상단 고정
  is_active: boolean,     // 활성 상태
  views: integer,         // 조회수
  created_at: timestamp,
  updated_at: timestamp
}
```

## 5. 법률 문서

### 5.1 이용약관 (`getTerms`)

```javascript
SELECT version, content, effective_date, created_at
FROM terms_of_service
WHERE is_current = true
ORDER BY created_at DESC
LIMIT 1

// 응답
{
  success: true,
  data: {
    version: "1.0.0",
    content: "제1조 (목적)...",
    effective_date: "2024-01-01",
    created_at: timestamp
  }
}
```

### 5.2 개인정보처리방침 (`getPrivacyPolicy`)

```javascript
SELECT version, content, effective_date, created_at
FROM privacy_policy
WHERE is_current = true
ORDER BY created_at DESC
LIMIT 1
```

### 5.3 버전 관리

법률 문서는 버전 관리됨:
- `is_current = true`: 현재 적용 중인 버전
- `effective_date`: 시행일
- 이전 버전 히스토리 보관

## 6. 앱 정보

### 6.1 조회 (`getAppInfo`)

```javascript
// 정적 데이터 반환
{
  success: true,
  data: {
    version: "1.0.0",
    buildNumber: "2024.11.28.001",
    lastUpdated: "2024-11-28",
    features: [
      "모임 생성 및 참가",
      "실시간 채팅",
      "리뷰 시스템",
      "포인트 시스템",
      "위치 기반 체크인"
    ]
  }
}
```

## 7. 데이터 테이블

### 7.1 faq 테이블

```javascript
{
  id: uuid,
  category: string,
  question: string,
  answer: string,
  order_index: integer,
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 7.2 support_inquiries 테이블

```javascript
{
  id: uuid,
  user_id: uuid,
  subject: string,
  content: text,
  category: string,
  status: string,       // '접수', '처리중', '답변완료', '종료'
  response: text,       // 관리자 답변
  responded_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 7.3 notices 테이블

```javascript
{
  id: uuid,
  title: string,
  content: text,
  type: string,
  is_pinned: boolean,
  is_active: boolean,
  views: integer,
  created_at: timestamp,
  updated_at: timestamp
}
```

### 7.4 terms_of_service / privacy_policy 테이블

```javascript
{
  id: uuid,
  version: string,
  content: text,
  effective_date: date,
  is_current: boolean,
  created_at: timestamp
}
```

## 8. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 제목/내용 누락 | 400 | "제목과 내용을 입력해주세요" |
| 공지사항 없음 | 404 | "공지사항을 찾을 수 없습니다" |
| 이용약관 없음 | 404 | "이용약관을 찾을 수 없습니다" |
| 개인정보처리방침 없음 | 404 | "개인정보처리방침을 찾을 수 없습니다" |
| 서버 오류 | 500 | "조회 중 오류가 발생했습니다" |

## 9. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| GET | `/api/support/faq` | FAQ 목록 | `getFaq` |
| POST | `/api/support/inquiry` | 문의 접수 | `createInquiry` |
| GET | `/api/support/my-inquiries` | 내 문의 내역 | `getMyInquiries` |
| GET | `/api/support/notices` | 공지사항 목록 | `getNotices` |
| GET | `/api/support/notices/:id` | 공지사항 상세 | `getNoticeById` |
| GET | `/api/support/terms` | 이용약관 | `getTerms` |
| GET | `/api/support/privacy` | 개인정보처리방침 | `getPrivacyPolicy` |
| GET | `/api/support/app-info` | 앱 정보 | `getAppInfo` |

## 10. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
