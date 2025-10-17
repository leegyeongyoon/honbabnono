# 혼밥시러 로컬 개발 환경 설정 가이드

## 🚀 빠른 시작

### 1. 패키지 설치
```bash
npm install
```

### 2. 백엔드 패키지 설치
```bash
cd backend && npm install && cd ..
```

### 3. 개발 서버 시작
```bash
npm run dev
```

또는 스크립트 사용:
```bash
./start-local.sh
```

## 📍 접속 주소

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:3001
- **헬스체크**: http://localhost:3001/api/health
- **카카오 로그인 테스트**: http://localhost:3001/api/auth/kakao/login

## 🔧 환경 설정

### .env 파일 설정
```env
# 카카오 OAuth2 설정
KAKAO_CLIENT_ID=5a202bd90ab8dff01348f24cb1c37f3f
KAKAO_CLIENT_SECRET=2szGmvgo9GOQXoZx7WszooMHctVWocKx
KAKAO_REDIRECT_URI=http://localhost:3001/api/auth/kakao/callback

# 서버 설정
PORT=3000
NODE_ENV=development
API_PORT=3001

# 웹 앱 설정
REACT_APP_API_URL=http://localhost:3001
REACT_APP_KAKAO_CLIENT_ID=5a202bd90ab8dff01348f24cb1c37f3f

# JWT 설정
JWT_SECRET=honbabnono_jwt_secret_key_2024
JWT_EXPIRES_IN=7d

# 프론트엔드 URL 설정
FRONTEND_URL=http://localhost:3000

# PostgreSQL 설정 (선택사항)
DB_HOST=honbabnono.c3iokeig2kd8.ap-northeast-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=honbabnono
DB_USER=postgres
DB_PASSWORD=honbabnono
```

## 🛠 개발 명령어

```bash
# 프론트엔드만 실행
npm run web

# 백엔드만 실행
npm run server

# 프론트엔드 + 백엔드 동시 실행
npm run dev

# 프로덕션 빌드
npm run build:web
```

## 🔑 카카오 로그인 테스트

1. 브라우저에서 http://localhost:3000 접속
2. 로그인 버튼 클릭
3. 카카오 로그인 진행
4. 로그인 성공 후 메인 페이지로 리다이렉트

## 🐛 문제 해결

### 포트 충돌 문제
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000
lsof -i :3001

# 프로세스 종료
kill -9 <PID>
```

### 데이터베이스 연결 실패
- PostgreSQL RDS 연결이 실패해도 기본 OAuth 기능은 작동합니다
- 로컬 PostgreSQL 설치 후 .env 파일 수정하면 전체 기능 사용 가능

### 카카오 로그인 오류
1. 카카오 개발자 콘솔에서 Redirect URI 확인
   - `http://localhost:3001/api/auth/kakao/callback` 추가 필요
2. KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET 확인

## 📱 기능 테스트

### 인증 기능
- [x] 카카오 로그인
- [x] JWT 토큰 생성
- [x] 사용자 프로필 조회

### 모임 기능 (데이터베이스 연결 시)
- [x] 모임 목록 조회
- [x] 모임 생성
- [x] 모임 검색 및 필터링

### 프론트엔드 기능
- [x] 모던한 로그인 화면
- [x] 인터랙티브 검색 화면
- [x] 반응형 디자인

## 🔄 개발 워크플로우

1. 기능 개발
2. 로컬에서 테스트 (`npm run dev`)
3. 커밋 및 푸시
4. 자동 배포 (GitHub Actions)

---

💡 **Tip**: 개발 중 핫 리로드가 활성화되어 있어 코드 변경 시 자동으로 새로고침됩니다.