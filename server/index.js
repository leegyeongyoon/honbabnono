const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// 미들웨어 설정
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://honbabnono.com',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 기본 라우터
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '혼밥시러 API 서버가 정상 동작 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// 카카오 로그인 라우트
app.post('/api/auth/kakao', (req, res) => {
  const { code } = req.body;
  
  console.log('카카오 로그인 요청:', {
    code,
    clientId: process.env.KAKAO_CLIENT_ID,
    redirectUri: process.env.KAKAO_REDIRECT_URI
  });
  
  // TODO: 카카오 OAuth2 토큰 교환 로직 구현
  // 1. code를 사용해 카카오에서 access_token 받기
  // 2. access_token으로 사용자 정보 조회
  // 3. JWT 토큰 생성 및 반환
  
  res.json({
    success: true,
    message: '카카오 로그인 처리 (구현 예정)',
    data: { 
      code,
      clientId: process.env.KAKAO_CLIENT_ID ? '설정됨' : '미설정',
      redirectUri: process.env.KAKAO_REDIRECT_URI
    }
  });
});

// 사용자 프로필 라우트
app.get('/api/user/profile', (req, res) => {
  // TODO: 사용자 인증 및 프로필 조회 로직
  res.json({
    id: 1,
    name: '테스트 사용자',
    email: 'test@honbabnono.com',
    profileImage: null
  });
});

// 밥 모임 관련 라우트
app.get('/api/meetups', (req, res) => {
  // TODO: 밥 모임 목록 조회 로직
  res.json({
    meetups: [
      {
        id: 1,
        title: '강남 맛집 탐방',
        location: '강남역',
        datetime: '2024-10-17T19:00:00Z',
        participants: 3,
        maxParticipants: 4
      },
      {
        id: 2,
        title: '홍대 야식 모임',
        location: '홍대입구역',
        datetime: '2024-10-18T21:00:00Z',
        participants: 2,
        maxParticipants: 6
      }
    ]
  });
});

app.post('/api/meetups', (req, res) => {
  const { title, location, datetime, maxParticipants } = req.body;
  
  // TODO: 밥 모임 생성 로직
  res.json({
    success: true,
    message: '밥 모임이 생성되었습니다.',
    data: {
      id: Date.now(),
      title,
      location,
      datetime,
      maxParticipants,
      participants: 1
    }
  });
});

// 404 에러 핸들러
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.path
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 혼밥시러 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;