# 혼밥노노 앱 설정 가이드

## 🚀 프로젝트 구성

이 프로젝트는 React Native 앱과 Express.js 백엔드로 구성되어 있습니다.

### 디렉토리 구조
```
honbabnono/
├── src/                    # React Native 앱
│   ├── screens/
│   │   ├── LoginScreen.tsx      # 모바일 로그인 화면
│   │   └── LoginScreen.web.tsx  # 웹 로그인 화면
│   └── ...
├── backend/               # Express.js 백엔드
│   ├── src/
│   │   ├── routes/auth.ts      # 인증 라우트
│   │   ├── utils/kakao.ts      # 카카오 OAuth2 유틸
│   │   └── ...
│   └── .env.example
└── ...
```

## 📋 필수 설정

### 1. 카카오 개발자 계정 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 새 애플리케이션 생성
3. 다음 정보를 기록해두세요:
   - **앱 키**: JavaScript 키
   - **REST API 키**: 백엔드에서 사용
   - **Client Secret**: 보안을 위해 설정 권장

### 2. 카카오 앱 설정

#### 플랫폼 등록
1. 카카오 개발자 콘솔 > 앱 설정 > 플랫폼
2. **Web 플랫폼 추가**:
   - 사이트 도메인: `http://localhost:3000` (개발환경)
   - 사이트 도메인: `https://yourdomain.com` (운영환경)

#### Redirect URI 설정
1. 카카오 개발자 콘솔 > 제품 설정 > 카카오 로그인
2. **Redirect URI 등록**:
   - `http://localhost:3001/auth/kakao/callback` (개발환경)
   - `https://yourapi.com/auth/kakao/callback` (운영환경)

#### 동의항목 설정
1. 카카오 개발자 콘솔 > 제품 설정 > 카카오 로그인 > 동의항목
2. 다음 항목들을 설정:
   - **닉네임**: 필수 동의
   - **프로필 사진**: 선택 동의
   - **카카오계정(이메일)**: 선택 동의

### 3. 백엔드 환경 설정

#### 의존성 설치
```bash
cd backend
npm install
```

#### 환경 변수 설정
```bash
# .env.example을 .env로 복사
cp .env.example .env
```

#### .env 파일 수정
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# JWT Configuration - 반드시 변경하세요!
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=7d

# Kakao OAuth2 Configuration - 카카오 개발자 콘솔에서 가져온 값으로 설정
KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret  # 선택사항
KAKAO_REDIRECT_URI=http://localhost:3001/auth/kakao/callback
```

### 4. 프론트엔드 환경 설정

#### 의존성 설치
```bash
# 루트 디렉토리에서
npm install
```

#### 환경 변수 설정 (선택사항)
`.env` 파일 생성:
```bash
REACT_APP_API_URL=http://localhost:3001
```

## 🎯 실행 방법

### 백엔드 서버 실행
```bash
cd backend
npm run dev
```
서버가 http://localhost:3001 에서 실행됩니다.

### 프론트엔드 실행

#### 웹 개발 서버
```bash
npm run web
```
웹 앱이 http://localhost:3000 에서 실행됩니다.

#### React Native (모바일)
```bash
# iOS
npm run ios

# Android
npm run android
```

## 🔧 개발 과정에서 확인할 사항

### 1. 카카오 로그인 테스트
1. 웹 브라우저에서 http://localhost:3000 접속
2. 로그인 화면에서 "카카오로 로그인" 버튼 클릭
3. 카카오 로그인 페이지로 리다이렉트 확인
4. 로그인 후 원래 페이지로 돌아오는지 확인

### 2. API 엔드포인트 확인
- `GET /auth/kakao` - 카카오 로그인 시작
- `GET /auth/kakao/callback` - 카카오 로그인 콜백
- `POST /auth/kakao/callback` - 카카오 로그인 콜백 (API용)
- `POST /auth/login` - 일반 로그인
- `GET /auth/me` - 사용자 정보 조회
- `POST /auth/logout` - 로그아웃

### 3. 보안 고려사항
- JWT_SECRET은 충분히 복잡하고 긴 문자열로 설정
- 운영환경에서는 HTTPS 사용 필수
- 카카오 Client Secret 설정 권장
- CORS 설정 확인

## 🔒 운영환경 배포 시 추가 설정

### 1. 환경 변수 업데이트
```bash
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
KAKAO_REDIRECT_URI=https://yourapi.com/auth/kakao/callback
```

### 2. 카카오 개발자 콘솔 설정
- 운영 도메인을 플랫폼에 추가
- 운영 Redirect URI 추가

### 3. HTTPS 설정
- SSL 인증서 설정
- 보안 헤더 설정

## 🆘 문제 해결

### 카카오 로그인이 안 될 때
1. 카카오 개발자 콘솔에서 Redirect URI 확인
2. 환경 변수 설정 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 토큰 관련 문제
1. JWT_SECRET 설정 확인
2. 토큰 만료 시간 확인
3. 클라이언트에서 토큰 저장 방식 확인

### CORS 에러
1. 백엔드 CORS 설정 확인
2. FRONTEND_URL 환경 변수 확인

## 📞 지원

문제가 발생하면 다음을 확인해보세요:
1. 백엔드 서버 로그 (`console.log` 출력)
2. 브라우저 개발자 도구 콘솔
3. 네트워크 탭에서 API 요청/응답 확인