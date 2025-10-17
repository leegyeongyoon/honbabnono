#!/bin/bash

echo "🍚 혼밥시러 로컬 개발 환경 시작"
echo "================================"

# 환경 변수 확인
echo "📋 환경 설정 확인..."
if [ ! -f .env ]; then
    echo "❌ .env 파일이 없습니다!"
    exit 1
fi

# Node.js 버전 확인
node_version=$(node -v)
echo "✅ Node.js 버전: $node_version"

# 패키지 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📦 패키지 설치 중..."
    npm install
fi

# 백엔드 패키지 설치 확인
if [ ! -d "backend/node_modules" ]; then
    echo "📦 백엔드 패키지 설치 중..."
    cd backend && npm install && cd ..
fi

echo ""
echo "🚀 서버 시작..."
echo "- 프론트엔드: http://localhost:3000"
echo "- 백엔드 API: http://localhost:3001"
echo ""
echo "💡 카카오 로그인 테스트: http://localhost:3001/api/auth/kakao/login"
echo ""

# 개발 서버 시작 (프론트엔드 + 백엔드 동시 실행)
npm run dev