# 잇테이블 — 도메인별 데모 계정

> 데모/시연용 계정 정보. 시드 스크립트(`scripts/seed-demo.js`)로 생성된다.
> 프로덕션·테스트 DB에 동일하게 적용 가능.

## 계정 한눈에 보기

| 구분 | 접속 주소 | 아이디 | 비밀번호 |
|------|-----------|--------|----------|
| 👤 **고객** | https://eattable.kr | `demo.customer@eattable.kr` | `Demo1234!` |
| 🏪 **점주 (기존)** | https://merchant.eattable.kr | `demo.merchant@eattable.kr` | `Demo1234!` |
| 🆕 **점주 (신규)** | https://merchant.eattable.kr | `demo.merchant.new@eattable.kr` | `Demo1234!` |
| 🛠 **관리자** | https://admin.eattable.kr | `admin` | `admin123` |

> ⚠️ 비밀번호 대소문자 주의: `Demo1234!` — **D**(대문자) + `1234` + `!`(느낌표)

---

## 도메인별 상세

### 👤 고객 앱 — `eattable.kr`
- **로그인**: `demo.customer@eattable.kr` / `Demo1234!`
- **이름**: 데모 고객
- **용도**: 매장 검색 → 예약 → 선결제 → 채팅 → 리뷰 등 고객 풀플로우 시연
- 로그인 방식: 이메일

### 🏪 점주 대시보드 — `merchant.eattable.kr`
- **로그인 (기존 점주)**: `demo.merchant@eattable.kr` / `Demo1234!`
  - **이름**: 데모 점주
  - **연결 매장**: 잇테이블 데모 샤브샤브 (승인 완료)
  - **용도**: 예약 보드 · 주문 칸반 · 메뉴 관리 · 정산 · 리뷰 답글 · 문의 등 바로 사용 가능
- **로그인 (신규 점주)**: `demo.merchant.new@eattable.kr` / `Demo1234!`
  - **이름**: 신규 점주
  - **상태**: 매장 미연결 → 로그인 시 **사업자 등록 화면부터** 시작
  - **용도**: 점주 신규 등록 + 국세청 진위확인 플로우 시연
- 로그인 방식: 이메일 (`/api/auth/login`)

### 🛠 관리자 패널 — `admin.eattable.kr`
- **로그인**: `admin` / `admin123`
- **이메일**: admin@eattable.kr
- **역할**: super_admin
- **용도**: 점주 승인 · 매장/예약 모니터링 · 정산 지급 · 결제 환불 · 사용자 관리 등
- 로그인 방식: username (`/api/admin/login`)

---

## 데모 데이터 재시드

계정·데모 매장·메뉴·예약을 초기화하려면:

```bash
# 테스트 DB
NODE_ENV=test node scripts/seed-demo.js

# (프로덕션은 직접 실행하지 말 것 — 별도 절차 필요)
```

시드 시 생성되는 것:
- 위 4개 계정 (이미 있으면 스킵)
- 데모 매장 "잇테이블 데모 샤브샤브" + 메뉴/카테고리/옵션
- 데모 예약 3건
- 신규 점주는 사업자 등록 상태를 리셋해 등록 플로우부터 시연 가능

---

## 영상/시연 시나리오 흐름

1. **점주(신규)** 로그인 → 사업자 등록 → AI 메뉴 사진 업로드
2. **관리자** 로그인 → 점주 관리 → 신규 점주 승인
3. **고객** 로그인 → 매장 검색 → 예약/결제 → 채팅/리뷰
4. **점주(기존)** 로그인 → 예약 확인 → 주문 조리 상태 → 정산

---

## 참고

- 계정 정의 원본: [`scripts/seed-demo.js`](../scripts/seed-demo.js) (`ACCOUNTS` 상수)
- 비밀번호는 데모용 고정값 — **실서비스 계정과 무관**
- 프로덕션 도메인 라우팅: 고객 `eattable.kr`, 점주 `merchant.eattable.kr`, 관리자 `admin.eattable.kr` (Cloudflare → RPi nginx)
