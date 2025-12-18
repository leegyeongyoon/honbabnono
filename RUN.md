# 🍚 혼밥시러 iOS 앱 실행 가이드

## 🚀 빠른 시작

### 방법 1: 원 클릭 실행 (추천)
```bash
./run-ios.sh
```
- 모든 서버 + iOS 앱을 한 번에 실행
- 자동으로 포트 정리 및 순차 실행
- Ctrl+C로 모든 서비스 종료

### 방법 2: npm 스크립트 사용
```bash
# 모든 개발 서버 + iOS 앱 실행
npm run ios:dev

# 또는 개발 서버만 시작
npm run dev:all
```

### 방법 3: 개발 서버만 먼저 시작
```bash
./dev-start.sh
```
그 다음 새 터미널에서:
```bash
npx react-native start --reset-cache
npx react-native run-ios
```

## 📋 수동 실행 순서

1. **백엔드 API 서버** (포트: 3001)
   ```bash
   npm run server
   ```

2. **웹 개발 서버** (포트: 3000)  
   ```bash
   GENERATE_SOURCEMAP=false PORT=3000 npm run web
   ```

3. **Metro 번들러** (포트: 8081)
   ```bash
   npx react-native start --reset-cache
   ```

4. **iOS 앱 실행**
   ```bash
   npx react-native run-ios
   ```

## 🔧 개발 도구

### 새로 추가된 npm 스크립트:
- `npm run dev` - 웹 + 백엔드 서버 동시 시작
- `npm run dev:all` - 웹 + 백엔드 + Metro 동시 시작  
- `npm run ios:dev` - 모든 서버 + iOS 앱 동시 시작
- `npm run metro` - Metro 번들러 (캐시 초기화)

### 유용한 명령어:
- **Metro에서 새로고침**: `R` 키 
- **Metro 로그 초기화**: `Cmd+K` (macOS)
- **iOS 시뮬레이터 새로고침**: `Cmd+R`
- **전체 앱 재시작**: iOS 시뮬레이터에서 앱 종료 → 재실행

## ⚠️ 필수 요구사항

- **Node.js 20+**
- **Xcode 15.4** (iOS 개발)
- **iOS Simulator** (iPhone 15+ 권장)
- **React Native CLI**
- **CocoaPods** (iOS 의존성 관리)

## 🌐 서비스 URL

- **iOS 앱**: iPhone Simulator  
- **웹 앱**: http://localhost:3000
- **백엔드 API**: http://localhost:3001  
- **Metro 번들러**: http://localhost:8081

## 🐛 문제 해결

### 포트 충돌
```bash
# 포트 3000, 3001, 8081 사용 중인 프로세스 종료
lsof -ti:3000,3001,8081 | xargs kill -9
```

### Metro 캐시 문제
```bash
npx react-native start --reset-cache
# 또는
npm run metro
```

### iOS 빌드 실패
```bash
cd ios && rm -rf Pods Podfile.lock
pod install
cd .. && npx react-native run-ios
```

### 의존성 문제
```bash
npm install --legacy-peer-deps
cd ios && pod install
```

## 📱 앱 아키텍처

- **하이브리드 앱**: React Native WebView + 네이티브 기능
- **웹뷰 URL**: localhost:3000 (개발) / honbabnono.com (프로덕션)
- **네이티브 브리지**: GPS, 저장소, 햅틱 피드백 지원
- **레이아웃 고정**: 확대/축소 방지, 고정 뷰포트

## 🔄 배포

### iOS 빌드
```bash
npm run ios:build
```

### 웹 배포
```bash 
npm run build:web
```

---

💡 **팁**: `./run-ios.sh` 스크립트를 사용하면 가장 편리합니다!