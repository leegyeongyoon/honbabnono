const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');

// 환경변수 로드
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '/app/.env' : '../.env' });

// 데이터베이스 및 모델 가져오기
const { initDatabase, User } = require('./models');

// 라우터 가져오기
const userRoutes = require('./routes/users');
const meetupRoutes = require('./routes/meetups');
const testRoutes = require('./routes/test');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const PORT = 3001;

// WebSocket을 req 객체에 추가하는 미들웨어
app.use((req, res, next) => {
  req.io = io;
  next();
});

// 미들웨어
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// WebSocket 연결 처리
io.on('connection', (socket) => {
  console.log('🔌 새 클라이언트 연결:', socket.id);

  // 채팅방 입장
  socket.on('join_room', (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`👥 Socket ${socket.id} joined room_${roomId}`);
  });

  // 채팅방 퇴장
  socket.on('leave_room', (roomId) => {
    socket.leave(`room_${roomId}`);
    console.log(`👋 Socket ${socket.id} left room_${roomId}`);
  });

  // 실시간 메시지 전송
  socket.on('send_message', (data) => {
    console.log('📤 실시간 메시지:', data);
    socket.to(`room_${data.roomId}`).emit('new_message', data);
  });

  // 타이핑 상태 전송
  socket.on('typing', (data) => {
    socket.to(`room_${data.roomId}`).emit('user_typing', {
      userId: data.userId,
      userName: data.userName,
      isTyping: data.isTyping,
    });
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log('🔌 클라이언트 연결 해제:', socket.id);
  });
});

// 카카오 OAuth2 설정
const KAKAO_CONFIG = {
  clientId: process.env.KAKAO_CLIENT_ID,
  clientSecret: process.env.KAKAO_CLIENT_SECRET,
  redirectUri: process.env.KAKAO_REDIRECT_URI,
  authUrl: 'https://kauth.kakao.com/oauth/authorize',
  tokenUrl: 'https://kauth.kakao.com/oauth/token',
  userInfoUrl: 'https://kapi.kakao.com/v2/user/me'
};

// 프론트엔드 URL 설정
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log('🔗 FRONTEND_URL:', FRONTEND_URL);

// 카카오 로그인 시작 (리다이렉트)
app.get('/api/auth/kakao', (req, res) => {
  const kakaoAuthUrl = `${KAKAO_CONFIG.authUrl}?client_id=${KAKAO_CONFIG.clientId}&redirect_uri=${KAKAO_CONFIG.redirectUri}&response_type=code`;
  res.redirect(kakaoAuthUrl);
});

// 카카오 OAuth2 콜백 처리
app.get('/api/auth/kakao/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('카카오 로그인 에러:', error);
    return res.redirect(`${FRONTEND_URL}?error=kakao_login_failed`);
  }

  if (!code) {
    console.error('Authorization code가 없습니다');
    return res.redirect(`${FRONTEND_URL}?error=no_code`);
  }

  try {
    // 1. 액세스 토큰 요청
    const tokenResponse = await axios.post(KAKAO_CONFIG.tokenUrl, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: KAKAO_CONFIG.clientId,
        client_secret: KAKAO_CONFIG.clientSecret,
        redirect_uri: KAKAO_CONFIG.redirectUri,
        code: code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token } = tokenResponse.data;

    // 2. 사용자 정보 요청
    const userResponse = await axios.get(KAKAO_CONFIG.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const kakaoUser = userResponse.data;

    // 3. 사용자 정보 추출
    const kakaoUserInfo = {
      providerId: kakaoUser.id.toString(),
      email: kakaoUser.kakao_account?.email,
      name: kakaoUser.kakao_account?.profile?.nickname || '혼밥러',
      profileImage: kakaoUser.kakao_account?.profile?.profile_image_url,
      provider: 'kakao'
    };

    // 4. 데이터베이스에서 사용자 찾기 또는 생성
    console.log('🔍 사용자 검색 중:', kakaoUserInfo);
    
    let user = await User.findOne({
      where: { 
        provider: 'kakao',
        providerId: kakaoUserInfo.providerId
      }
    });

    console.log('📖 기존 사용자 조회 결과:', user ? '있음' : '없음');

    if (!user) {
      console.log('🆕 새 사용자 생성 시작...');
      // 새 사용자 생성
      user = await User.create({
        email: kakaoUserInfo.email || null, // 이메일이 없으면 null
        name: kakaoUserInfo.name,
        profileImage: kakaoUserInfo.profileImage,
        provider: 'kakao',
        providerId: kakaoUserInfo.providerId,
        isVerified: true // Kakao를 통한 로그인은 검증된 것으로 처리
      });
      console.log('✅ 새 사용자 생성 완료:', user.id);
    } else {
      console.log('✅ 기존 사용자 로그인:', user.id);
    }

    // 5. JWT 토큰 생성 (데이터베이스 UUID 사용)
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'honbabnono_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 6. 프론트엔드로 리다이렉트 (토큰과 함께)
    const userForFrontend = {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      provider: user.provider
    };
    
    const redirectUrl = `${FRONTEND_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(userForFrontend))}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('카카오 로그인 처리 에러:', error);
    res.redirect(`${FRONTEND_URL}?error=auth_failed`);
  }
});

// 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '토큰이 필요합니다' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'honbabnono_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }
    req.user = user;
    next();
  });
};

// 사용자 정보 조회 API
app.get('/api/user/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 로그아웃 API
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: '로그아웃되었습니다' });
});

// 일반 로그인 API (이메일/패스워드)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
  }

  try {
    // 데이터베이스에서 사용자 찾기
    const user = await User.findOne({
      where: { 
        email: email,
        provider: 'email'
      }
    });

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 비밀번호 확인 (실제로는 bcrypt 등으로 해시 비교해야 함)
    if (user.password !== password) {
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다' });
    }

    // JWT 토큰 생성 (데이터베이스 UUID 사용)
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'honbabnono_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 응답용 사용자 데이터
    const userForResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      provider: user.provider
    };

    console.log(`✅ 일반 로그인 성공: ${user.name} (${user.id})`);
    res.json({ token, user: userForResponse });

  } catch (error) {
    console.error('일반 로그인 처리 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 헬스체크
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: '혼밥시러 백엔드 서버가 정상 동작 중입니다',
    timestamp: new Date().toISOString()
  });
});

// API 라우터 설정
app.use('/api/users', userRoutes);
app.use('/api/meetups', meetupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/test', testRoutes);

// 데이터베이스 초기화 및 서버 시작
initDatabase().then((success) => {
  server.listen(PORT, () => {
    console.log(`🍚 혼밥시러 백엔드 서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`💬 WebSocket 채팅 서버 실행 중`);
    console.log(`🔑 카카오 OAuth2 설정:`);
    console.log(`   - Client ID: ${KAKAO_CONFIG.clientId ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`   - Redirect URI: ${KAKAO_CONFIG.redirectUri}`);
    console.log(`💾 데이터베이스: ${success ? '✅ 연결됨' : '❌ 연결 실패 (기본 기능만 사용 가능)'}`);
    console.log(`📊 API 엔드포인트:`);
    console.log(`   - POST /api/users/register - 회원가입`);
    console.log(`   - POST /api/users/login - 로그인`);
    console.log(`   - GET /api/users/profile - 프로필 조회`);
    console.log(`   - GET /api/meetups - 모임 목록`);
    console.log(`   - POST /api/meetups - 모임 생성`);
    console.log(`   - GET /api/meetups/:id - 모임 상세`);
    console.log(`   - GET /api/chat/rooms - 채팅방 목록`);
    console.log(`   - POST /api/chat/rooms/:id/messages - 메시지 전송`);
  });
}).catch((error) => {
  console.error('❌ 서버 시작 중 오류 발생:', error);

  // 데이터베이스 없이라도 서버 시작
  server.listen(PORT, () => {
    console.log(`🍚 혼밥시러 백엔드 서버가 포트 ${PORT}에서 실행 중입니다 (제한 모드)`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`💬 WebSocket 채팅 서버 실행 중`);
    console.log(`⚠️  PostgreSQL 연결 실패 - 기본 OAuth 기능만 사용 가능`);
  });
});