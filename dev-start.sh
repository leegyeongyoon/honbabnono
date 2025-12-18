#!/bin/bash

# 개발 서버들만 시작하는 간단한 스크립트 
# iOS 앱은 별도로 실행해야 함

echo "🍚 혼밥시러 개발 서버 시작..."

# 함수: 프로세스 종료
cleanup() {
    echo ""
    echo "🛑 개발 서버들 종료 중..."
    jobs -p | xargs -r kill
    exit 0
}

# Ctrl+C 시 cleanup 함수 실행  
trap cleanup SIGINT

# 포트 정리
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
lsof -ti:3001 | xargs -r kill -9 2>/dev/null || true

echo "✅ 포트 정리 완료"

# 웹 서버 + 백엔드 서버 동시 시작
echo "🚀 개발 서버들 시작 중..."
echo "   - 백엔드: http://localhost:3001"  
echo "   - 웹서버: http://localhost:3000"
echo ""

npm run dev

echo ""
echo "🔄 iOS 앱을 실행하려면 새 터미널에서:"
echo "   npx react-native start --reset-cache"
echo "   npx react-native run-ios"
echo ""
echo "🛑 종료하려면 Ctrl+C를 누르세요"

wait