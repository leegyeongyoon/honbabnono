#!/bin/bash

# 혼밥시러 iOS 앱 실행 스크립트
# 사용법: ./run-ios.sh

echo "🍚 혼밥시러 iOS 앱 시작..."
echo ""

# 함수: 프로세스 종료
cleanup() {
    echo ""
    echo "🛑 모든 서비스 종료 중..."
    jobs -p | xargs -r kill
    exit 0
}

# Ctrl+C 시 cleanup 함수 실행
trap cleanup SIGINT

# 포트 사용 중인지 확인 후 종료
echo "🔍 기존 프로세스 확인 중..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
lsof -ti:3001 | xargs -r kill -9 2>/dev/null || true
lsof -ti:8081 | xargs -r kill -9 2>/dev/null || true

echo "✅ 포트 정리 완료"
echo ""

# 1. 백엔드 서버 시작
echo "🚀 백엔드 서버 시작 (포트: 3001)..."
npm run server &
SERVER_PID=$!
sleep 2

# 2. 웹 서버 시작  
echo "🌐 웹 서버 시작 (포트: 3000)..."
GENERATE_SOURCEMAP=false PORT=3000 npm run web &
WEB_PID=$!
sleep 3

# 3. Metro 번들러 시작
echo "📱 Metro 번들러 시작 (포트: 8081)..."
npx react-native start --reset-cache &
METRO_PID=$!
sleep 5

# 4. iOS 시뮬레이터에서 앱 실행
echo "📲 iOS 시뮬레이터에서 앱 실행..."
echo ""
echo "⚠️  주의: Xcode 15.4와 iOS 시뮬레이터가 설치되어 있어야 합니다"
echo ""

npx react-native run-ios

echo ""
echo "✅ 모든 서비스가 실행 중입니다!"
echo ""
echo "📊 서비스 상태:"
echo "   - 백엔드 API: http://localhost:3001"
echo "   - 웹 서버:   http://localhost:3000" 
echo "   - Metro:     http://localhost:8081"
echo ""
echo "🔄 Metro에서 'R' 키를 눌러서 앱을 새로고침할 수 있습니다"
echo "🛑 종료하려면 Ctrl+C를 누르세요"
echo ""

# 백그라운드 프로세스들이 종료될 때까지 대기
wait