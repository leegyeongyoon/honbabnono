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

// 내가 호스팅한 모임 목록 조회
app.get('/api/user/hosted-meetups', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    
    console.log('🏠 호스팅 모임 조회 요청:', { userId, page, limit });
    
    // 데이터베이스 연결 확인
    if (!User) {
      return res.status(503).json({ 
        success: false, 
        error: '데이터베이스 연결이 필요합니다.' 
      });
    }
    
    // 임시 데이터 반환 (실제 구현에서는 데이터베이스 쿼리 사용)
    const mockData = {
      meetups: [
        {
          id: 1,
          title: "홍대 맛집 투어",
          description: "홍대 근처 맛집을 함께 탐방해요!",
          location: "홍대입구역",
          date: "2025-11-01",
          time: "18:00",
          maxParticipants: 4,
          currentParticipants: 2,
          category: "맛집탐방",
          status: "active",
          createdAt: "2025-10-25T10:00:00Z"
        }
      ],
      pagination: {
        total: 1,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 1
      }
    };
    
    console.log('✅ 호스팅 모임 조회 성공');
    res.json({ 
      success: true, 
      data: mockData.meetups,
      pagination: mockData.pagination 
    });

  } catch (error) {
    console.error('❌ 호스팅 모임 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내활동 통계 조회
app.get('/api/user/activity-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📊 활동 통계 조회 요청:', { userId });
    
    // 데이터베이스 연결 확인
    if (!User) {
      return res.status(503).json({ 
        success: false, 
        error: '데이터베이스 연결이 필요합니다.' 
      });
    }
    
    // 임시 통계 데이터 반환 (실제 구현에서는 데이터베이스 쿼리 사용)
    const mockStats = {
      hostedMeetups: 3,
      joinedMeetups: 8,
      completedMeetups: 5,
      thisMonthMeetups: 2,
      totalPoints: 150,
      level: "활발한 혼밥러"
    };
    
    console.log('✅ 활동 통계 조회 성공:', mockStats);
    res.json({ 
      success: true, 
      data: mockStats 
    });

  } catch (error) {
    console.error('❌ 활동 통계 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 토큰 검증 및 자동 로그인 API
app.post('/api/auth/verify-token', async (req, res) => {
  console.log('🔍 토큰 검증 API 호출됨:', { 
    body: req.body,
    hasToken: !!req.body?.token,
    tokenLength: req.body?.token?.length 
  });
  
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: '토큰이 필요합니다.' 
      });
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'honbabnono_secret');
    console.log('✅ 토큰 검증 성공:', { userId: decoded.userId, email: decoded.email });

    // 데이터베이스에서 사용자 정보 조회
    let user = null;
    try {
      user = await User.findByPk(decoded.userId);
      if (!user) {
        console.log('❌ 사용자를 찾을 수 없음:', decoded.userId);
        return res.status(404).json({ 
          success: false, 
          error: '사용자를 찾을 수 없습니다.' 
        });
      }
    } catch (dbError) {
      console.log('⚠️ 데이터베이스 오류, 토큰 정보만 사용:', dbError.message);
      // 데이터베이스 연결 실패 시 토큰의 정보만 사용
      user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        provider: 'token'
      };
    }

    // 응답용 사용자 데이터
    const userForResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage || null,
      provider: user.provider
    };

    console.log('✅ 토큰 검증 완료:', userForResponse);
    res.json({ 
      success: true, 
      user: userForResponse,
      token: token
    });

  } catch (error) {
    console.error('❌ 토큰 검증 실패:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: '토큰이 만료되었습니다.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: '유효하지 않은 토큰입니다.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: '토큰 검증 중 오류가 발생했습니다.' 
    });
  }
});

// 사용자 프로필 조회
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('👤 사용자 프로필 조회 요청:', { userId });
    
    // 데이터베이스 연결 확인
    if (!User) {
      return res.status(503).json({ 
        success: false, 
        error: '데이터베이스 연결이 필요합니다.' 
      });
    }
    
    // 임시 프로필 데이터
    const mockProfile = {
      id: userId,
      email: req.user.email,
      name: req.user.name,
      profile_image: null,
      provider: 'kakao',
      provider_id: 'temp123',
      is_verified: true,
      rating: 4.5,
      meetups_hosted: 3,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-10-29T00:00:00Z'
    };
    
    console.log('✅ 사용자 프로필 조회 성공');
    res.json({ 
      success: true, 
      user: mockProfile 
    });

  } catch (error) {
    console.error('❌ 사용자 프로필 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 내가 참가한 모임 목록 조회
app.get('/api/user/joined-meetups', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    
    console.log('👥 참가 모임 조회 요청:', { userId, page, limit });
    
    // 임시 데이터
    const mockData = {
      data: [
        {
          id: "2",
          title: "강남 카페 투어",
          description: "강남역 주변 예쁜 카페들을 탐방해요",
          location: "강남역",
          date: "2025-11-05",
          time: "14:00",
          maxParticipants: 6,
          currentParticipants: 4,
          category: "카페탐방",
          status: "active",
          createdAt: "2025-10-20T10:00:00Z",
          participationStatus: "confirmed",
          joinedAt: "2025-10-21T10:00:00Z",
          hostName: "카페러버"
        }
      ],
      pagination: {
        total: 1,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 1
      }
    };
    
    console.log('✅ 참가 모임 조회 성공');
    res.json({ 
      success: true, 
      data: mockData.data,
      pagination: mockData.pagination
    });

  } catch (error) {
    console.error('❌ 참가 모임 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 사용자가 작성한 리뷰 목록 조회
app.get('/api/user/reviews', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.userId;
    
    console.log('📝 사용자 리뷰 조회 요청:', { userId, page, limit });
    
    // 임시 데이터
    const mockData = {
      data: [
        {
          id: "1",
          meetup_id: "1",
          rating: 5,
          comment: "정말 즐거운 시간이었습니다!",
          tags: ["맛있는", "친절한", "재미있는"],
          created_at: "2025-10-25T15:00:00Z",
          meetup_title: "홍대 맛집 투어",
          meetup_date: "2025-10-24",
          meetup_location: "홍대입구역",
          meetup_category: "맛집탐방"
        }
      ],
      pagination: {
        total: 1,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 1
      }
    };
    
    console.log('✅ 사용자 리뷰 조회 성공');
    res.json({ 
      success: true, 
      data: mockData.data,
      pagination: mockData.pagination
    });

  } catch (error) {
    console.error('❌ 사용자 리뷰 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 혼밥지수 조회
app.get('/api/user/rice-index', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🍚 혼밥지수 조회 요청:', { userId });
    
    // 임시 혼밥지수 데이터
    const mockRiceIndex = {
      currentIndex: 85,
      level: "혼밥 마스터",
      rank: 12,
      totalUsers: 1500,
      monthlyProgress: +8,
      achievements: [
        { id: 1, name: "첫 모임 참가", completed: true },
        { id: 2, name: "모임 호스팅", completed: true },
        { id: 3, name: "리뷰 5개 작성", completed: false }
      ]
    };
    
    console.log('✅ 혼밥지수 조회 성공:', mockRiceIndex);
    res.json({ 
      success: true, 
      riceIndex: mockRiceIndex.currentIndex,
      level: mockRiceIndex.level,
      data: mockRiceIndex 
    });

  } catch (error) {
    console.error('❌ 혼밥지수 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모임 리뷰 작성
app.post('/api/meetups/:meetupId/reviews', authenticateToken, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { rating, comment, tags } = req.body;
    const userId = req.user.userId;
    
    console.log('✍️ 리뷰 작성 요청:', { meetupId, userId, rating });
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: '평점은 1~5 사이의 값이어야 합니다.' 
      });
    }
    
    // 임시 리뷰 데이터
    const mockReview = {
      id: Date.now().toString(),
      meetup_id: meetupId,
      reviewer_id: userId,
      reviewer_name: req.user.name,
      rating: rating,
      comment: comment || '',
      tags: tags || [],
      created_at: new Date().toISOString(),
      reviewer_profile_image: null
    };
    
    console.log('✅ 리뷰 작성 성공');
    res.json({ 
      success: true, 
      data: mockReview 
    });

  } catch (error) {
    console.error('❌ 리뷰 작성 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모임의 리뷰 목록 조회
app.get('/api/meetups/:meetupId/reviews', async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    console.log('📝 모임 리뷰 목록 조회 요청:', { meetupId, page, limit });
    
    // 임시 리뷰 데이터
    const mockData = {
      reviews: [
        {
          id: "1",
          meetup_id: meetupId,
          reviewer_id: "user1",
          reviewer_name: "리뷰어1",
          rating: 5,
          comment: "정말 좋은 모임이었습니다!",
          tags: ["맛있는", "친절한"],
          created_at: "2025-10-25T15:00:00Z",
          reviewer_profile_image: null
        }
      ],
      stats: {
        averageRating: 4.8,
        totalReviews: 5
      },
      pagination: {
        total: 1,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 1
      }
    };
    
    console.log('✅ 모임 리뷰 목록 조회 성공');
    res.json({ 
      success: true, 
      data: mockData 
    });

  } catch (error) {
    console.error('❌ 모임 리뷰 목록 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 로그아웃 API
app.post('/api/auth/logout', (req, res) => {
  console.log('👋 로그아웃 요청');
  res.json({ 
    success: true,
    message: '로그아웃되었습니다' 
  });
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