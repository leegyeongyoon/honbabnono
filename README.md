# 잇테이블 (EatTable) — 선주문/선결제형 외식 예약 플랫폼

> **"자리가 아니라, 식사 시작을 예약하다"**

고객이 매장 방문 전에 좌석, 시간, 인원, 메뉴, 결제를 모두 확정하고, 매장은 고객의 도착 예정 상태를 보며 조리/상차림 타이밍을 조절해 "예약한 시간에 빠르게 식사를 시작"하게 만드는 외식 플랫폼입니다.

- 기획/사업 문서: [`docs/README-BUSINESS.md`](docs/README-BUSINESS.md)
- 피벗 계획 상세: [`docs/PIVOT-PLAN.md`](docs/PIVOT-PLAN.md)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **모바일** | React Native 0.71, TypeScript |
| **웹** | React 18, Webpack, TypeScript |
| **상태 관리** | Zustand |
| **백엔드** | Node.js, Express, Socket.IO |
| **DB** | PostgreSQL (AWS RDS) |
| **인증** | JWT (Access + Refresh Token), 카카오 소셜로그인 |
| **결제** | PortOne (카드/간편결제) |
| **인프라** | AWS (ECS, RDS, S3, CloudFront), Terraform |
| **CI/CD** | GitHub Actions |
| **테스트** | Jest (Unit/Integration), Playwright (E2E) |

---

## 프로젝트 구조

```
honbabnono/
├── src/                        # React Native + Web 프론트엔드
│   ├── components/             # 공용 컴포넌트
│   │   ├── shared/             # Universal 화면 (웹/네이티브 공유)
│   │   └── meetup-cards/       # 카드 컴포넌트 모음
│   ├── screens/                # 화면 (*.web.tsx = 웹 전용)
│   ├── services/               # API 서비스 레이어
│   ├── store/                  # Zustand 스토어
│   ├── styles/                 # 디자인 토큰 (colors, typography, spacing)
│   ├── navigation/             # React Navigation 설정
│   ├── constants/              # 상수 정의
│   └── utils/                  # 유틸리티
├── server/                     # Express 백엔드
│   ├── index.js                # 서버 진입점
│   ├── modules/                # 기능별 모듈 (controller.js + routes.js)
│   ├── middleware/             # 인증, 검증, Rate Limiter
│   ├── config/                 # DB, S3, PortOne, Logger 설정
│   ├── migrations/             # DB 마이그레이션 SQL + runner.js
│   ├── scheduler/              # cron 스케줄러
│   └── utils/                  # 서버 유틸리티
├── admin/                      # 관리자 대시보드 (React SPA)
├── merchant/                   # 점주 대시보드 (Phase 2 예정)
├── tests/                      # Jest 테스트
├── e2e/                        # Playwright E2E 테스트
├── docs/                       # 기획서, 사업계획서, 정책 문서
├── terraform/                  # AWS IaC
├── ios/                        # iOS 네이티브
└── android/                    # Android 네이티브
```

### 프론트엔드 패턴

- **Universal 패턴**: `src/components/shared/UniversalXxxScreen.tsx` — 웹/네이티브 공유 로직
- **웹 진입점**: `WebApp.tsx` → `RouterApp.tsx`
- **네이티브 진입점**: `src/navigation/RootNavigator.tsx`
- **디자인 토큰**: `src/styles/colors.ts`, `typography.ts`, `spacing.ts`

### 백엔드 모듈

```
server/modules/
├── auth/              # 인증 (로그인, 회원가입, 카카오)
├── user/              # 사용자 (프로필, 설정)
├── notifications/     # 알림 (FCM 푸시, 앱내)
├── chat/              # 채팅 (Socket.IO)
├── points/            # 포인트 (충전, 사용)
├── deposits/          # 결제 (PortOne 연동)
├── reviews/           # 리뷰
├── admin/             # 관리자 대시보드 API
├── support/           # 공지, FAQ
├── advertisements/    # 광고 배너
├── ai/                # AI 검색/추천
├── search/            # 검색
├── meetups/           # [v1 레거시] 모임 — Phase 1에서 대체 예정
└── badges/            # [v1 레거시] 뱃지 — 폐기 예정
```

**v2 신규 모듈 (Phase 1~2에서 추가):**
`restaurants`, `merchants`, `menus`, `reservations`, `orders`, `settlements`

---

## 개발 환경 설정

### 요구사항

- Node.js 16+
- PostgreSQL 14+
- React Native CLI (모바일 개발 시)

### 환경변수

`.env.development` 파일 생성:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=honbabnono
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
KAKAO_CLIENT_ID=your_kakao_key
KAKAO_JS_KEY=your_kakao_js_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket
PORTONE_STORE_ID=your_store_id
PORTONE_CHANNEL_KEY=your_channel_key
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 웹 + API 동시 실행 (개발)
npm run dev

# 개별 실행
npm run web            # 웹 개발 서버 (port 3000)
npm run server         # API 서버 (port 3001)

# iOS (네이티브)
cd ios && pod install
npm run ios
```

---

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 웹 + API 동시 실행 |
| `npm run web` | 웹 개발 서버 (port 3000) |
| `npm run server` | API 서버 (port 3001) |
| `npm run build:web` | 프로덕션 웹 빌드 |
| `npm run test` | 전체 테스트 |
| `npm run test:api` | API 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 |
| `npm run lint` | ESLint |
| `npm run migrate` | DB 마이그레이션 실행 |
| `npm run migrate:status` | 마이그레이션 상태 확인 |
| `npm run migrate:dry` | 마이그레이션 미리보기 |

---

## DB 마이그레이션

마이그레이션 파일은 `server/migrations/` 디렉토리에 SQL 파일로 관리됩니다.

```bash
# 상태 확인
npm run migrate:status

# 미실행 마이그레이션 전체 실행
npm run migrate

# 실행 대상만 미리보기 (변경 없음)
npm run migrate:dry
```

**파일명 규칙:**
- v1 (밥동무): `001` ~ `011`
- v2 (피벗): `100` 번대부터

---

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 배포 |
| `pivot/v2` | 선주문형 피벗 개발 (현재 작업 브랜치) |
| `v1.0-meetup-era` (태그) | v1 밥동무 코드 스냅샷 |

---

## 커밋 컨벤션

```
feat: 매장 검색 API 추가
fix: 결제 환불 금액 계산 오류 수정
refactor: deposits 모듈을 payments로 전환
chore: 마이그레이션 러너 도입
```

`feat:`, `fix:`, `refactor:`, `chore:`, `docs:` + **한글 설명**

---

## 접속 정보 (개발 환경)

| 서비스 | URL |
|--------|-----|
| 웹 앱 | http://localhost:3000 |
| API 서버 | http://localhost:3001 |
| 관리자 대시보드 | http://localhost:3002 |

---

## 트러블슈팅

### 포트 충돌
```bash
lsof -ti:3001 | xargs kill -9
```

### iOS pod 에러
```bash
cd ios && pod install --repo-update
```

### 모듈 못 찾는 에러
```bash
rm -rf node_modules && npm install
```

---

## 관련 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 기획/사업 소개 | [`docs/README-BUSINESS.md`](docs/README-BUSINESS.md) | 서비스 정의, 시장, 수익모델, KPI, 로드맵 |
| 피벗 개발 계획 | [`docs/PIVOT-PLAN.md`](docs/PIVOT-PLAN.md) | Phase별 구현 체크리스트, 아키텍처, DB 모델 |
| 비즈니스 정책 | [`docs/policies/`](docs/policies/) | 결제, 환불, 노쇼 정책 |
