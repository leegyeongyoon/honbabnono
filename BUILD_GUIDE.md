# 혼밥시러 앱 빌드 및 배포 가이드

## 📱 앱 정보
- **앱 이름**: 혼밥시러
- **패키지명**: com.honbabnono.app
- **버전**: 1.0.0

## 🔧 사전 준비사항

### iOS 빌드
1. **Xcode 설치** (Mac 필수)
2. **Apple Developer 계정** (배포용)
3. **CocoaPods 설치**
   ```bash
   sudo gem install cocoapods
   ```

### Android 빌드
1. **Android Studio 설치**
2. **JDK 11 이상 설치**
3. **Android SDK 설정**

## 📦 의존성 설치

```bash
# 프로젝트 루트에서
npm install

# iOS 의존성
cd ios && pod install && cd ..

# Android는 자동으로 gradle이 처리
```

## 🏗️ 빌드 명령어

### iOS 빌드

#### 개발 빌드
```bash
npm run ios
```

#### 프로덕션 빌드
```bash
npm run ios:build
```

#### 시뮬레이터에서 실행
```bash
npx react-native run-ios --simulator="iPhone 15"
```

### Android 빌드

#### 개발 빌드
```bash
npm run android
```

#### APK 생성 (프로덕션)
```bash
npm run android:build
# 생성 위치: android/app/build/outputs/apk/release/app-release.apk
```

#### AAB 생성 (Google Play 업로드용)
```bash
npm run android:bundle
# 생성 위치: android/app/build/outputs/bundle/release/app-release.aab
```

#### 디바이스에 설치
```bash
npm run android:install
```

## 🔐 서명 설정

### Android 서명
1. keystore 생성
   ```bash
   cd android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore honbabnono-release-key.keystore -alias honbabnono-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. `android/gradle.properties`에 추가
   ```
   MYAPP_RELEASE_STORE_FILE=honbabnono-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=honbabnono-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=your_password
   MYAPP_RELEASE_KEY_PASSWORD=your_password
   ```

### iOS 서명
1. Apple Developer Console에서 인증서 생성
2. Xcode에서 프로비저닝 프로파일 설정

## 📤 스토어 배포

### Google Play Store
1. Google Play Console 접속
2. 새 앱 생성
3. AAB 파일 업로드
4. 앱 정보 작성 및 제출

### Apple App Store
1. App Store Connect 접속
2. 새 앱 생성
3. Xcode Archive 업로드
4. TestFlight 테스트
5. 앱 심사 제출

## 🌐 웹 버전 빌드

```bash
# 개발 서버
npm run web

# 프로덕션 빌드
npm run build:web
```

## 🔍 트러블슈팅

### iOS 빌드 오류
- `pod install` 실행 확인
- Xcode 버전 업데이트
- 시뮬레이터 캐시 정리: `xcrun simctl erase all`

### Android 빌드 오류
- gradle 캐시 정리: `cd android && ./gradlew clean`
- SDK 버전 확인
- `android/local.properties` 파일 확인

## 📞 환경변수 설정

`.env.production` 파일 생성:
```env
REACT_APP_API_URL=https://api.honbabnono.com
REACT_APP_WS_URL=https://api.honbabnono.com
```

## 📱 테스트 디바이스

### iOS TestFlight
1. TestFlight 앱 설치
2. 초대 링크 통해 베타 테스트

### Android 내부 테스트
1. Google Play Console에서 내부 테스트 트랙 생성
2. 테스터 이메일 추가

## 🚀 CI/CD 설정 (선택사항)

### GitHub Actions 예시
```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run android:build
```

## 📝 체크리스트

배포 전 확인사항:
- [ ] 버전 번호 업데이트
- [ ] 환경변수 프로덕션 설정
- [ ] 아이콘 및 스플래시 스크린 확인
- [ ] 권한 설정 확인
- [ ] API 엔드포인트 확인
- [ ] 서명 설정 완료
- [ ] 스토어 스크린샷 준비
- [ ] 개인정보 처리방침 URL
- [ ] 이용약관 URL

## 🆘 지원

문제 발생 시:
- GitHub Issues: https://github.com/leegyeongyoon/honbabnono/issues
- 이메일: support@honbabnono.com