# Project: 잇테이블 (EatTable) — 선주문/선결제형 외식 예약 플랫폼

## 서비스 정의
> 고객이 매장 방문 전에 좌석, 시간, 인원, 메뉴, 결제를 모두 확정하고,
> 매장은 고객의 도착 예정 상태를 보며 조리/상차림 타이밍을 조절해
> "예약한 시간에 빠르게 식사를 시작"하게 만드는 외식 플랫폼

### 포지셔닝
- 캐치테이블이 **자리를 예약**한다면, 잇테이블은 **메뉴와 식사 시작까지 예약**한다
- 테이블오더가 **매장 안 주문을 디지털화**했다면, 잇테이블은 그 주문을 **매장 방문 전으로 앞당긴다**

### 피벗 히스토리
- v1 (밥동무): 식사 모임 매칭 앱 → `v1.0-meetup-era` 태그로 보존
- v2 (현재): 선주문/선결제형 외식 예약 플랫폼 → `pivot/v2` 브랜치

## Tech Stack / Commands

### Install
```bash
npm install
cd ios && pod install  # iOS 전용
```

### Test
```bash
npm run test           # 전체 테스트
npm run test:api       # API 테스트 (tests/)
npm run test:coverage  # 커버리지 리포트
```

### Lint/Format
```bash
npm run lint           # ESLint 실행
```

### Build
```bash
npm run build:web      # Web 빌드
npm run ios:build      # iOS 빌드
npm run android:build  # Android 빌드
```

### Dev Server
```bash
npm run server         # 백엔드 API 서버 (port 3001)
npm run web            # 웹 개발 서버 (port 3000)
npm run dev            # web + server 동시 실행
```

### DB Migration
```bash
npm run migrate        # 미실행 마이그레이션 전체 실행
npm run migrate:status # 현재 마이그레이션 상태 확인
npm run migrate:dry    # 실행 대상만 미리보기 (변경 없음)
```

## Directory Structure
```
honbabnono/
├── src/                    # React Native + Web 소스 코드
│   ├── components/         # 재사용 컴포넌트
│   ├── screens/            # 화면 컴포넌트
│   ├── services/           # API 서비스
│   ├── store/              # 상태 관리 (Zustand)
│   ├── navigation/         # 네비게이션 설정
│   └── styles/             # 스타일/테마 (디자인 토큰)
├── server/                 # 백엔드 API 서버
│   ├── index.js            # 진입점
│   ├── modules/            # 기능별 모듈
│   ├── middleware/         # 미들웨어 (인증, 검증 등)
│   ├── config/             # 설정 (DB, S3, logger)
│   ├── migrations/         # DB 마이그레이션 (SQL + runner.js)
│   ├── scheduler/          # 스케줄러 작업
│   └── utils/              # 유틸리티 함수
├── admin/                  # 관리자 대시보드 (React)
├── merchant/               # 점주 대시보드 (Phase 2에서 생성 예정)
├── terraform/              # AWS 인프라 (IaC)
├── tests/                  # 테스트 파일
├── e2e/                    # Playwright E2E 테스트
├── docs/                   # 사업계획서, 피벗 계획 등
├── ios/                    # iOS 네이티브 코드
└── android/                # Android 네이티브 코드
```

## API Server Module Structure

### 현재 모듈 (v1 밥동무 — 점진적 전환 중)
```
server/modules/
├── auth/           # 인증 (로그인, 회원가입, 소셜로그인) [유지]
├── user/           # 사용자 (프로필, 설정, 포인트) [유지]
├── notifications/  # 알림 (푸시, 앱내 알림) [유지]
├── chat/           # 채팅 (실시간 메시지) [수정 예정: 매장-고객 문의]
├── points/         # 포인트 (충전, 사용, 내역) [수정 예정]
├── deposits/       # 약속금 → 선결제로 전환 예정
├── reviews/        # 리뷰 [수정 예정: 3축 평가]
├── admin/          # 관리자 (대시보드, 통계) [수정 예정]
├── support/        # 지원 (공지, FAQ) [유지]
├── advertisements/ # 광고 배너 [유지]
├── ai/             # AI (검색, 추천) [수정 예정]
├── meetups/        # 모임 — 폐기 예정 → restaurants + reservations + orders
├── badges/         # 뱃지 — 폐기 예정
└── search/         # 검색 [수정 예정]
```

### 신규 모듈 (v2 피벗)
```
server/modules/
├── restaurants/    # 매장 CRUD, 검색, 위치 기반 (Phase 1)
├── merchants/      # 점주 등록, 사업자 인증 (Phase 1)
├── menus/          # 메뉴 CRUD, 카테고리 (Phase 1)
├── reservations/   # 예약 상태 머신, 시간 슬롯 (Phase 1)
├── orders/         # 주문 생성, 조리 상태 (Phase 1)
└── settlements/    # 매장별 정산 (Phase 2)
```

각 모듈은 `controller.js`와 `routes.js`로 구성.

## Frontend Store Structure (전환 예정)
```
src/store/
├── userStore.ts            # [유지]
├── restaurantStore.ts      # [신규] 매장 목록, 상세, 찜
├── cartStore.ts            # [신규] 장바구니
├── reservationStore.ts     # [신규] 예약 상태
├── chatStore.ts            # [수정]
├── notificationStore.ts    # [유지]
├── searchStore.ts          # [수정]
├── paymentStore.ts         # [신규] (depositStore 대체)
└── meetupStore.ts          # [폐기 예정]
```

## 구현 로드맵 (Phase 0~7)

| Phase | 내용 | 기간 |
|-------|------|------|
| **0 (현재)** | 브랜치 생성, 마이그레이션 러너, CLAUDE.md | 1주 |
| 1 | DB 새 테이블 + 핵심 백엔드 6개 모듈 | 3주 |
| 2 | 점주 대시보드 (merchant/) | 2주 |
| 3 | 고객 프론트엔드 핵심 화면 + Store | 3주 |
| 4 | 실시간 시스템 (Socket.IO, QR, 도착 알림) | 2주 |
| 5 | 리뷰 + 검색 + AI 전환 | 1주 |
| 6 | Admin 업데이트 | 1주 |
| 7 | 레거시 정리 + E2E + 배포 | 2주 |

> 상세 체크리스트: `docs/PIVOT-PLAN.md` 참조

## Repo Rules (Must)

### 변경 전
- 규모가 큰 작업은 반드시 `/plan` 으로 계획 수립
- 기존 코드를 읽고 패턴 파악 후 작업

### 테스트
- 모든 변경은 테스트 통과가 기준
- API 변경 시 `npm run test:api` 필수
- 새 기능 추가 시 최소한의 테스트 작성

### DB 마이그레이션
- 새 테이블/컬럼 추가 시 `server/migrations/` 에 SQL 파일 생성
- 파일명 규칙: `NNN_설명.sql` (예: `100_create_restaurants.sql`)
- v2 피벗 마이그레이션은 100번대부터 시작 (기존 v1은 001~011)
- **기존 테이블 DROP 금지** — 새 테이블만 추가, deprecated 컬럼은 주석 처리

### 커밋
- 커밋 전 코드 리뷰 필수
- 커밋 메시지 컨벤션: `feat:`, `fix:`, `refactor:`, `chore:` + 한글 설명
- 예: `feat: 매장 검색 API 추가`

### 시크릿 관리
- **시크릿/토큰/키 하드코딩 절대 금지**
- 환경변수는 `.env.*` 파일 사용
- `.env` 파일은 절대 커밋하지 않음

### 문서화
- 변경이 크면 관련 문서 업데이트

## Sensitive Areas (특히 조심)

### 🔴 Critical - 변경 시 반드시 확인 필요
| 영역 | 경로 | 위험도 | 설명 |
|------|------|--------|------|
| Terraform | `terraform/` | 🔴 | AWS 인프라 - 프로덕션 리소스 변경 가능 |
| 환경변수 | `.env*` | 🔴 | DB 비밀번호, API 키 포함 |
| DB 스키마 | `database_schema*.sql` | 🔴 | 데이터베이스 구조 변경 |
| DB 마이그레이션 | `server/migrations/*.sql` | 🔴 | 프로덕션 DB 구조 변경 |
| 결제 모듈 | `server/modules/deposits/`, `server/config/portone.js` | 🔴 | 결제/환불 로직 |

### 🟡 High - 주의 필요
| 영역 | 경로 | 위험도 | 설명 |
|------|------|--------|------|
| 인증 미들웨어 | `server/middleware/auth.js` | 🟡 | JWT 토큰 검증 로직 |
| DB 설정 | `server/config/database.js` | 🟡 | 데이터베이스 연결 |
| iOS 설정 | `ios/` | 🟡 | 네이티브 설정, Info.plist |
| Android 설정 | `android/` | 🟡 | 네이티브 설정, gradle |

### 🟢 Normal
| 영역 | 경로 | 설명 |
|------|------|------|
| 프론트엔드 | `src/components/`, `src/screens/` | UI 컴포넌트 |
| API 라우트 | `server/modules/*/routes.js` | API 엔드포인트 |
| 스타일 | `src/styles/` | 스타일/테마 |

## How to Work (Recommended Flow)

### Feature (새 기능)
```
/plan → 구현 → 테스트 작성 → /code-review → 커밋
```

### Hotfix (긴급 버그 수정)
```
버그 재현 → 최소 수정 → 테스트 → /code-review → 커밋
```

### Refactor (리팩토링)
```
/plan → 리팩토링 → 기존 테스트 통과 확인 → /code-review → 커밋
```

## Environment Variables

필수 환경변수 (`.env.development` 참고):
- `DATABASE_URL` - PostgreSQL 연결 문자열
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - DB 개별 설정
- `JWT_SECRET` - JWT 토큰 서명 키
- `KAKAO_CLIENT_ID` - 카카오 API 키
- `AWS_*` - S3 업로드용 AWS 자격증명
- `PORTONE_*` - PortOne 결제 연동

## Common Issues

### 서버 시작 안 됨
```bash
lsof -ti:3001 | xargs kill -9
npm run server
```

### iOS 빌드 에러
```bash
cd ios && pod install --repo-update
```

### 모듈 못 찾는 에러
```bash
rm -rf node_modules && npm install
```

### 마이그레이션 실패
```bash
npm run migrate:status   # 상태 확인
npm run migrate:dry      # 대상 확인
npm run migrate          # 실행
```
