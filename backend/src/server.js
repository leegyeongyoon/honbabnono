const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 환경변수 로드
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '/app/.env' : '../.env' });

// 데이터베이스 및 모델 가져오기
const { 
  initDatabase, 
  User, 
  Meetup, 
  MeetupParticipant, 
  MeetupPreferenceFilter,
  MeetupParticipantPreference,
  sequelize 
} = require('./models');

// 라우터 가져오기
const userRoutes = require('./routes/users');
console.log('📁 userRoutes loaded:', typeof userRoutes);
const meetupRoutes = require('./routes/meetups');
const testRoutes = require('./routes/test');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const advertisementRoutes = require('./routes/advertisements');
const adminRoutes = require('./routes/admin');
const researchRoutes = require('./routes/research');
const reviewRoutes = require('./routes/reviews');

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

// 전역으로 io 객체 설정 (NotificationService에서 사용)
global.io = io;

// 미들웨어
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// uploads 디렉토리 생성
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 정적 파일 서빙 (업로드된 이미지)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Multer 설정 (프로필 이미지 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// WebSocket 연결 처리
io.on('connection', (socket) => {
  console.log('🔌 새 클라이언트 연결:', socket.id);

  // 사용자 인증 및 개인 room 입장
  socket.on('authenticate', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} authenticated and joined personal room`);
  });

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
      { id: user.id, userId: user.id, email: user.email, name: user.name },
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
    const userId = req.user.id || req.user.userId;
    
    console.log('🏠 [API] 호스팅 모임 조회 요청:', { userId, page, limit, offset });
    
    // 실제 데이터베이스 쿼리로 호스팅 모임 조회
    const meetups = await sequelize.query(`
      SELECT 
        id, title, description, location, address, 
        latitude, longitude, date, time, 
        max_participants, current_participants, 
        category, price_range, age_range, gender_preference,
        dining_preferences, promise_deposit_amount, promise_deposit_required,
        status, image, created_at, updated_at
      FROM meetups 
      WHERE host_id = :userId 
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { 
        userId, 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      },
      type: sequelize.QueryTypes.SELECT
    });

    // 총 개수 조회
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM meetups WHERE host_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const totalPages = Math.ceil(countResult.total / limit);
    
    console.log('✅ [API] 호스팅 모임 조회 성공:', meetups.length, '개');
    console.log('📊 [API] 쿼리 결과 샘플:', meetups.slice(0, 2));
    console.log('📈 [API] 총 개수:', countResult.total);
    
    const responseData = { 
      success: true, 
      data: meetups,
      pagination: {
        total: parseInt(countResult.total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: totalPages
      }
    };
    
    console.log('📤 [API] 응답 데이터:', responseData);
    res.json(responseData);

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
    const userId = req.user.id || req.user.userId;
    
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
    console.log('🔍 JWT decoded:', decoded);
    const userId = decoded.id || decoded.userId; // 토큰에서 id 또는 userId 필드 사용
    console.log('🔍 Extracted userId:', userId);

    // 데이터베이스에서 사용자 정보 조회
    let user = null;
    try {
      user = await User.findByPk(userId);
      if (!user) {
        console.log('❌ 사용자를 찾을 수 없음:', userId);
        return res.status(404).json({ 
          success: false, 
          error: '사용자를 찾을 수 없습니다.' 
        });
      }
    } catch (dbError) {
      console.log('⚠️ 데이터베이스 오류, 토큰 정보만 사용:', dbError.message);
      // 데이터베이스 연결 실패 시 토큰의 정보만 사용
      user = {
        id: userId,
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

// 간단한 프로필 조회 API (userRoutes와 중복되지 않도록 다른 경로 사용)
app.get('/api/user/profile-direct', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId; // JWT 토큰에서 id 또는 userId 필드 사용
    console.log('👤 [DIRECT] 사용자 프로필 조회 요청:', { userId });

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    // 프로필 이미지 URL 처리 (상대 경로를 절대 URL로 변환)
    let userResponse = user.toJSON();
    if (userResponse.profileImage && !userResponse.profileImage.startsWith('http')) {
      userResponse.profileImage = `${req.protocol}://${req.get('host')}${userResponse.profileImage}`;
    }

    console.log('✅ [DIRECT] 사용자 프로필 조회 성공');
    console.log('🖼️ [DIRECT] profileImage 값:', userResponse.profileImage);

    res.json({ user: userResponse });
  } catch (error) {
    console.error('❌ [DIRECT] 프로필 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 프로필 이미지 업로드 API
app.post('/api/user/profile/upload-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    console.log('📸 프로필 이미지 업로드 요청:', { userId, file: req.file ? req.file.filename : 'none' });
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '업로드할 이미지 파일이 없습니다.'
      });
    }
    
    // 파일 정보
    const imageUrl = `/uploads/${req.file.filename}`;
    const fullImageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
    
    // 데이터베이스에 프로필 이미지 URL 업데이트 (Sequelize ORM 사용)
    const [affectedRows] = await User.update(
      { 
        profile_image: imageUrl,
        updated_at: new Date()
      },
      { 
        where: { id: userId }
      }
    );
    
    if (affectedRows === 0) {
      // 업데이트 실패 시 업로드된 파일 삭제
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }
    
    console.log('✅ 프로필 이미지 업로드 성공:', { 
      filename: req.file.filename,
      size: req.file.size,
      url: fullImageUrl,
      userId: userId
    });
    
    res.json({
      success: true,
      message: '프로필 이미지가 성공적으로 업로드되었습니다.',
      imageUrl: fullImageUrl,
      filename: req.file.filename
    });
    
  } catch (error) {
    console.error('❌ 프로필 이미지 업로드 실패:', error);
    
    // 업로드된 파일이 있다면 삭제
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('파일 삭제 실패:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message === '이미지 파일만 업로드 가능합니다.' ? error.message : '서버 오류가 발생했습니다.'
    });
  }
});

// 내가 참가한 모임 목록 조회
app.get('/api/user/joined-meetups', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id || req.user.userId;
    
    console.log('👥 [API] 참가 모임 조회 요청:', { userId, page, limit, offset });
    
    // 실제 데이터베이스 쿼리로 참가한 모임 조회 (JOIN 사용)
    const meetups = await sequelize.query(`
      SELECT 
        m.id, m.title, m.description, m.location, m.address, 
        m.latitude, m.longitude, m.date, m.time, 
        m.max_participants, m.current_participants, 
        m.category, m.price_range, m.age_range, m.gender_preference,
        m.dining_preferences, m.promise_deposit_amount, m.promise_deposit_required,
        m.status, m.image, m.created_at, m.updated_at,
        mp.status as participation_status,
        mp.joined_at,
        u.name as host_name
      FROM meetups m
      INNER JOIN meetup_participants mp ON m.id = mp.meetup_id
      INNER JOIN users u ON m.host_id = u.id
      WHERE mp.user_id = :userId 
      ORDER BY mp.joined_at DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { 
        userId, 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('📝 참가한 모임 쿼리 결과:', meetups.length, '개');

    // 총 개수 조회
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total 
      FROM meetup_participants mp 
      WHERE mp.user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    const totalPages = Math.ceil(countResult.total / limit);
    
    console.log('✅ [API] 참가 모임 조회 성공:', meetups.length, '개');
    console.log('📊 [API] 쿼리 결과 샘플:', meetups.slice(0, 2));
    console.log('📈 [API] 총 개수:', countResult.total);
    
    const responseData = { 
      success: true, 
      data: meetups,
      pagination: {
        total: parseInt(countResult.total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: totalPages
      }
    };
    
    console.log('📤 [API] 응답 데이터:', responseData);
    res.json(responseData);

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
    const userId = req.user.id || req.user.userId;
    
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

// 밥알지수 계산 함수
const calculateRiceIndex = (userStats) => {
  // 신규 유저 기본 밥알: 40.0개 (일반 유저)
  let baseScore = 40.0;
  
  // 사용자 활동 통계에서 실제 값들 가져오기
  const {
    joinedMeetups = 0,
    hostedMeetups = 0,
    completedMeetups = 0,
    reviewsWritten = 0,
    averageRating = 0,
    positiveReviews = 0,
    negativeReviews = 0,
    noShows = 0,
    reports = 0,
    consecutiveAttendance = 0,
    qualityReviews = 0 // 30자 이상 후기
  } = userStats;

  // 점수 계산
  let score = baseScore;
  
  // 상승 요소
  if (score < 40.0) {
    // 티스푼 구간: 후기만 있어도 상승
    score += reviewsWritten * 1.5;
  } else if (score < 60.0) {
    // 밥 한 숟갈 구간: 후기 + 매너/태도 보장
    score += positiveReviews * 1.0;
    score += joinedMeetups * 0.5;
    score += hostedMeetups * 1.0;
  } else if (score < 70.0) {
    // 따끈한 밥그릇 구간: 후기 + 3회 연속 출석
    score += (consecutiveAttendance >= 3 ? reviewsWritten * 0.5 : 0);
    score += completedMeetups * 0.3;
  } else if (score < 80.0) {
    // 고봉밥 구간: 후기 + 품질 후기 (30자 이상)
    score += qualityReviews * 0.3;
    score += (averageRating >= 4.0 ? (averageRating - 4.0) * 2 : 0);
  } else if (score < 90.0) {
    // 밥도둑 밥상 구간: 후기 + 5회 연속 + 무사고
    score += (consecutiveAttendance >= 5 && noShows === 0 && reports === 0) ? reviewsWritten * 0.1 : 0;
  } else {
    // 찰밥대장/밥神 구간: 후기 + 10회 연속 무사고
    score += (consecutiveAttendance >= 10 && noShows === 0 && reports === 0) ? reviewsWritten * 0.05 : 0;
  }
  
  // 감점 요소 (정확한 스펙 반영)
  score -= negativeReviews * 2.0; // 비매너 평가 후기 (1~2점대) -2.0밥알
  score -= noShows * 5.0; // 노쇼 1회 -5.0밥알
  score -= reports * 5.0; // 신고 정당한 경우 -5.0밥알
  // 추가: 후기 조작/스팸성 후기 -3.0밥알 (별도 필드 필요시)
  
  // 점수 범위 제한 (0.0 ~ 100.0)
  score = Math.max(0.0, Math.min(100.0, score));
  
  return Math.round(score * 10) / 10; // 소수점 첫째자리까지
};

// 밥알지수 레벨 및 밥알 개수 계산 함수 (0.0-100.0 밥알 범위)
const getRiceLevel = (score) => {
  if (score < 40.0) return { level: "티스푼", riceEmoji: "🍚🍚", description: "반복된 신고/노쇼, 신뢰 낮음", color: "#FF5722" };
  if (score < 60.0) return { level: "밥 한 숟갈", riceEmoji: "🍚", description: "일반 유저, 평균적인 활동", color: "#9E9E9E" };
  if (score < 70.0) return { level: "따끈한 밥그릇", riceEmoji: "🍚🍚🍚", description: "후기와 출석률 모두 양호", color: "#FF9800" };
  if (score < 80.0) return { level: "고봉밥", riceEmoji: "🍚🍚🍚🍚", description: "후기 품질도 높고 꾸준한 출석", color: "#4CAF50" };
  if (score < 90.0) return { level: "밥도둑 밥상", riceEmoji: "🍚🍚🍚🍚🍚", description: "상위권, 최고의 매너 보유", color: "#2196F3" };
  if (score < 98.1) return { level: "찰밥대장", riceEmoji: "🍚🍚🍚🍚🍚🍚", description: "거의 완벽한 활동 이력", color: "#9C27B0" };
  return { level: "밥神 (밥신)", riceEmoji: "🍚🍚🍚🍚🍚🍚🍚", description: "전설적인 유저", color: "#FFD700" };
};

// 유저 분포 계산 함수 (정확한 스펙 반영)
const getUserRank = (score, totalUsers = 1500) => {
  const distributions = [
    { min: 0.0, max: 39.9, percentage: 15 },    // 티스푼 15%
    { min: 40.0, max: 59.9, percentage: 50 },   // 밥 한 숟갈 50% (대부분의 일반 유저)
    { min: 60.0, max: 69.9, percentage: 20 },   // 따끈한 밥그릇 20%
    { min: 70.0, max: 79.9, percentage: 10 },   // 고봉밥 10%
    { min: 80.0, max: 89.9, percentage: 4.5 },  // 밥도둑 밥상 4.5%
    { min: 90.0, max: 100.0, percentage: 0.5 }  // 찰밥대장 + 밥神 0.5%
  ];
  
  let cumulativePercentage = 0;
  for (const dist of distributions) {
    if (score >= dist.min && score <= dist.max) {
      // 해당 구간 내에서의 상대적 위치 계산
      const positionInRange = (score - dist.min) / (dist.max - dist.min);
      const rankPercentile = cumulativePercentage + (dist.percentage * (1 - positionInRange));
      return Math.ceil((rankPercentile / 100) * totalUsers);
    }
    cumulativePercentage += dist.percentage;
  }
  
  return totalUsers; // 기본값
};

// 혼밥지수 조회 (데이터베이스 기반)
app.get('/api/user/rice-index', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId; // JWT 토큰에서 id 또는 userId 필드 사용
    console.log('🍚 밥알지수 계산 요청:', { userId });
    
    // 1. 사용자 기본 정보 조회 (현재 밥알지수 포함)
    const user = await User.findByPk(userId, {
      attributes: ['babal_score', 'meetups_joined', 'meetups_hosted', 'rating', 'created_at']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }
    
    const currentBabalScore = user.babal_score || 40;
    console.log('🔍 사용자 DB 밥알지수:', currentBabalScore);
    
    // 2. 모임 참여 통계 조회 (Sequelize ORM 사용)
    const [participantStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_joined,
        COUNT(CASE WHEN status = '참가승인' THEN 1 END) as completed_meetups,
        COUNT(CASE WHEN status = '참가취소' THEN 1 END) as no_shows
      FROM meetup_participants 
      WHERE user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    // 3. 리뷰 통계 조회 (reviews 테이블이 있다면)
    let reviewStats = { reviews_written: 0, positive_reviews: 0, negative_reviews: 0, quality_reviews: 0, average_rating: 0 };
    try {
      const [result] = await sequelize.query(`
        SELECT 
          COUNT(*) as reviews_written,
          COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
          COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews,
          COUNT(CASE WHEN is_quality_review = true THEN 1 END) as quality_reviews,
          AVG(rating) as average_rating
        FROM reviews 
        WHERE reviewer_id = :userId
      `, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      });
      reviewStats = result;
    } catch (error) {
      console.log('⚠️ reviews 테이블이 없어서 기본값 사용');
    }
    
    // 4. 신고 횟수 조회 (reports 테이블이 있다면)
    let reportStats = { report_count: 0 };
    try {
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as report_count
        FROM reports 
        WHERE reported_id = :userId AND status = 'resolved'
      `, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      });
      reportStats = result;
    } catch (error) {
      console.log('⚠️ reports 테이블이 없어서 기본값 사용');
    }
    
    // 5. 활동 통계 종합
    const stats = {
      joinedMeetups: parseInt(participantStats?.total_joined || 0),
      hostedMeetups: parseInt(user.meetups_hosted || 0),
      completedMeetups: parseInt(participantStats?.completed_meetups || 0),
      reviewsWritten: parseInt(reviewStats?.reviews_written || 0),
      positiveReviews: parseInt(reviewStats?.positive_reviews || 0),
      negativeReviews: parseInt(reviewStats?.negative_reviews || 0),
      qualityReviews: parseInt(reviewStats?.quality_reviews || 0),
      noShows: parseInt(participantStats?.no_shows || 0),
      reports: parseInt(reportStats?.report_count || 0),
      averageRating: parseFloat(reviewStats?.average_rating || 0),
      consecutiveAttendance: 0 // TODO: 연속 출석 계산 로직 추가
    };
    
    console.log('✅ 밥알지수 계산 완료:', { 
      userId, 
      stats, 
      calculatedIndex: currentBabalScore,
      level: getRiceLevel(currentBabalScore)
    });
    
    // 6. 레벨 정보 및 순위 계산
    const levelInfo = getRiceLevel(currentBabalScore);
    const totalUsers = 1500; // TODO: 실제 사용자 수 조회
    const rank = getUserRank(currentBabalScore, totalUsers);
    
    // 7. 이번 달 진행률 (밥알지수 히스토리에서 계산)
    let monthlyProgress = 0;
    try {
      const [result] = await sequelize.query(`
        SELECT 
          COALESCE(SUM(change_amount), 0) as monthly_change
        FROM babal_score_history 
        WHERE user_id = :userId 
          AND created_at >= date_trunc('month', CURRENT_DATE)
      `, {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      });
      monthlyProgress = parseInt(result?.monthly_change || 0);
    } catch (error) {
      console.log('⚠️ babal_score_history 테이블이 없어서 기본값 사용');
    }
    
    // 8. 다음 레벨까지 필요한 점수
    const nextLevelThresholds = [40, 60, 70, 80, 90, 98.1, 100];
    const nextThreshold = nextLevelThresholds.find(threshold => threshold > currentBabalScore) || 100;
    const progressToNext = Math.max(0, nextThreshold - currentBabalScore);
    
    // 9. 응답 데이터 구성
    const responseData = {
      success: true,
      riceIndex: currentBabalScore,
      level: {
        level: levelInfo.level,
        emoji: levelInfo.riceEmoji,
        description: levelInfo.description,
        color: levelInfo.color
      },
      stats: stats
    };
    
    console.log('📤 밥알지수 API 응답 전송:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('❌ 밥알지수 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모임 리뷰 작성 - reviewRoutes에서 처리하므로 주석 처리
// (실제 구현은 /routes/reviews.js에서 reviewController.createReview 사용)

// 모임의 리뷰 목록 조회 - reviewRoutes에서 처리하므로 주석 처리
// (실제 구현은 /routes/reviews.js에서 reviewController.getMeetupReviews 사용)

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

// API 헬스체크 (React Native에서 API 호스트 자동 감지용)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: '혼밥시러 API 서버가 정상 동작 중입니다',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =====================================
// 💬 식사 성향 필터 API
// =====================================

// 모임 필터 설정 생성/수정 (모임장용)
app.post('/api/meetups/:meetupId/preference-filter', authenticateToken, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user.id || req.user.userId;
    
    console.log('🎯 모임 필터 설정 요청:', { meetupId, userId });
    
    // 모임 존재 확인 및 호스트 권한 확인
    const meetup = await Meetup.findByPk(meetupId);
    if (!meetup) {
      return res.status(404).json({
        success: false,
        error: '모임을 찾을 수 없습니다'
      });
    }
    
    if (meetup.hostId !== userId) {
      return res.status(403).json({
        success: false,
        error: '모임 호스트만 필터를 설정할 수 있습니다'
      });
    }
    
    const filterData = req.body;
    
    // 기존 필터 확인
    let preferenceFilter = await MeetupPreferenceFilter.findOne({
      where: { meetupId }
    });
    
    if (preferenceFilter) {
      // 기존 필터 업데이트
      await preferenceFilter.update(filterData);
      console.log('✅ 기존 필터 업데이트 완료');
    } else {
      // 새 필터 생성
      preferenceFilter = await MeetupPreferenceFilter.create({
        meetupId,
        ...filterData
      });
      console.log('✅ 새 필터 생성 완료');
    }
    
    res.json({
      success: true,
      data: preferenceFilter
    });
    
  } catch (error) {
    console.error('❌ 모임 필터 설정 실패:', error);
    res.status(500).json({
      success: false,
      error: '필터 설정 중 오류가 발생했습니다'
    });
  }
});

// 모임 필터 조회
app.get('/api/meetups/:meetupId/preference-filter', async (req, res) => {
  try {
    const { meetupId } = req.params;
    
    console.log('🔍 모임 필터 조회 요청:', { meetupId });
    
    const preferenceFilter = await MeetupPreferenceFilter.findOne({
      where: { meetupId }
    });
    
    res.json({
      success: true,
      data: preferenceFilter
    });
    
  } catch (error) {
    console.error('❌ 모임 필터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '필터 조회 중 오류가 발생했습니다'
    });
  }
});

// 참가자 성향 답변 생성/수정 (참가자용)
app.post('/api/meetups/:meetupId/my-preferences', authenticateToken, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user.id || req.user.userId;
    
    console.log('🙋 참가자 성향 답변 요청:', { meetupId, userId });
    
    // 모임 존재 확인
    const meetup = await Meetup.findByPk(meetupId);
    if (!meetup) {
      return res.status(404).json({
        success: false,
        error: '모임을 찾을 수 없습니다'
      });
    }
    
    // 참가자 확인
    const participant = await MeetupParticipant.findOne({
      where: { meetupId, userId, status: '참가승인' }
    });
    
    if (!participant) {
      return res.status(403).json({
        success: false,
        error: '모임에 참가한 사용자만 성향을 설정할 수 있습니다'
      });
    }
    
    const preferenceData = req.body;
    
    // 기존 답변 확인
    let participantPreference = await MeetupParticipantPreference.findOne({
      where: { meetupId, userId }
    });
    
    if (participantPreference) {
      // 기존 답변 업데이트
      await participantPreference.update({
        ...preferenceData,
        answeredAt: new Date()
      });
      console.log('✅ 기존 성향 답변 업데이트 완료');
    } else {
      // 새 답변 생성
      participantPreference = await MeetupParticipantPreference.create({
        meetupId,
        userId,
        ...preferenceData
      });
      console.log('✅ 새 성향 답변 생성 완료');
    }
    
    res.json({
      success: true,
      data: participantPreference
    });
    
  } catch (error) {
    console.error('❌ 참가자 성향 답변 실패:', error);
    res.status(500).json({
      success: false,
      error: '성향 답변 중 오류가 발생했습니다'
    });
  }
});

// 참가자 성향 답변 조회
app.get('/api/meetups/:meetupId/my-preferences', authenticateToken, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user.id || req.user.userId;
    
    console.log('🔍 참가자 성향 답변 조회 요청:', { meetupId, userId });
    
    const participantPreference = await MeetupParticipantPreference.findOne({
      where: { meetupId, userId }
    });
    
    res.json({
      success: true,
      data: participantPreference
    });
    
  } catch (error) {
    console.error('❌ 참가자 성향 답변 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '성향 답변 조회 중 오류가 발생했습니다'
    });
  }
});

// 모임의 모든 참가자 성향 요약 조회 (모임장용)
app.get('/api/meetups/:meetupId/participants-preferences', authenticateToken, async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user.id || req.user.userId;
    
    console.log('📊 모임 참가자 성향 요약 조회 요청:', { meetupId, userId });
    
    // 모임 존재 확인 및 호스트 권한 확인
    const meetup = await Meetup.findByPk(meetupId);
    if (!meetup) {
      return res.status(404).json({
        success: false,
        error: '모임을 찾을 수 없습니다'
      });
    }
    
    if (meetup.hostId !== userId) {
      return res.status(403).json({
        success: false,
        error: '모임 호스트만 참가자 성향을 조회할 수 있습니다'
      });
    }
    
    // 참가자 성향 답변 조회
    const participantPreferences = await MeetupParticipantPreference.findAll({
      where: { meetupId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'profileImage']
      }],
      order: [['answeredAt', 'DESC']]
    });
    
    // 통계 계산
    const totalParticipants = await MeetupParticipant.count({
      where: { meetupId, status: '참가승인' }
    });
    
    const stats = {
      totalParticipants,
      answeredParticipants: participantPreferences.length,
      answerRate: totalParticipants > 0 ? Math.round((participantPreferences.length / totalParticipants) * 100) : 0,
      
      // 성향 분포
      eatingSpeed: {
        fast: participantPreferences.filter(p => p.eatingSpeed === 'fast').length,
        slow: participantPreferences.filter(p => p.eatingSpeed === 'slow').length,
        no_preference: participantPreferences.filter(p => p.eatingSpeed === 'no_preference').length
      },
      talkativeness: {
        talkative: participantPreferences.filter(p => p.talkativeness === 'talkative').length,
        listener: participantPreferences.filter(p => p.talkativeness === 'listener').length,
        moderate: participantPreferences.filter(p => p.talkativeness === 'moderate').length
      },
      avgIntrovertLevel: participantPreferences.length > 0 ? 
        Math.round(participantPreferences.reduce((sum, p) => sum + (p.introvertLevel || 0), 0) / participantPreferences.length) : 0,
      avgExtrovertLevel: participantPreferences.length > 0 ? 
        Math.round(participantPreferences.reduce((sum, p) => sum + (p.extrovertLevel || 0), 0) / participantPreferences.length) : 0
    };
    
    res.json({
      success: true,
      data: {
        preferences: participantPreferences,
        stats
      }
    });
    
  } catch (error) {
    console.error('❌ 모임 참가자 성향 요약 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '참가자 성향 조회 중 오류가 발생했습니다'
    });
  }
});

// 사용자 통계 조회 API (이전 버전과의 호환성을 위해 직접 정의)
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId; // JWT 토큰에서 id 또는 userId 필드 사용
    
    // user_points 테이블에서 포인트 조회 (개발환경과 동일한 방식)
    const [pointsResult] = await sequelize.query(`
      SELECT COALESCE(available_points, 0) as available_points
      FROM user_points 
      WHERE user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    // 사용자 정보 조회 (밥알지수 등)
    const user = await User.findByPk(userId, {
      attributes: ['meetupsHosted', 'meetupsJoined', 'babAlScore']
    });

    // 참가 모임 통계 조회
    const [participantStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_joined,
        COUNT(CASE WHEN status = '참가승인' THEN 1 END) as completed_meetups,
        COUNT(CASE WHEN status = '참가취소' THEN 1 END) as no_shows
      FROM meetup_participants 
      WHERE user_id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    // 개발환경과 동일한 API 구조로 응답
    const stats = {
      availablePoints: pointsResult?.available_points || 0,
      totalMeetups: parseInt(participantStats?.total_joined || 0),
      hostedMeetups: user?.meetupsHosted || 0,
      reviewCount: 0,
      riceIndex: user?.babAlScore || 50
    };
    
    console.log('✅ 사용자 통계 조회 성공:', stats);
    res.json({ stats });
  } catch (error) {
    console.error('❌ 사용자 통계 조회 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// =====================================
// 🤖 AI 검색 API
// =====================================

// AI 기반 모임 검색
app.post('/api/search/ai', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '검색어를 입력해주세요'
      });
    }

    console.log('🤖 AI 검색 요청:', query);
    const queryLower = query.toLowerCase();

    // ========== 1. 의도 분석 ==========
    // 카테고리 매핑 (더 상세하게)
    const categoryKeywords = {
      '한식': ['한식', '한국', '밥', '찌개', '국', '김치', '비빔밥', '불고기', '삼겹살', '고기', '구이', '국밥', '백반', '정식', '갈비', '냉면', '삼계탕'],
      '일식': ['일식', '일본', '초밥', '라멘', '우동', '돈카츠', '사시미', '회', '오마카세', '스시', '이자카야', '규동', '덮밥'],
      '중식': ['중식', '중국', '짜장', '짬뽕', '탕수육', '마라', '훠궈', '양꼬치', '딤섬', '만두'],
      '양식': ['양식', '파스타', '피자', '스테이크', '햄버거', '브런치', '샐러드', '이탈리안', '프렌치', '버거'],
      '카페': ['카페', '커피', '디저트', '케이크', '빵', '베이커리', '브런치', '차', '음료', '티', '마카롱'],
      '술집': ['술', '맥주', '소주', '막걸리', '와인', '포차', '호프', '펍', '바', '이자카야', '칵테일', '위스키', '안주']
    };

    // 시간대 키워드
    const timeKeywords = {
      morning: ['아침', '브런치', '모닝', '오전'],
      lunch: ['점심', '런치', '낮'],
      dinner: ['저녁', '디너', '퇴근'],
      late_night: ['야식', '밤', '심야', '새벽']
    };

    // 지역 키워드
    const locationKeywords = ['강남', '홍대', '신촌', '이태원', '명동', '종로', '강북', '영등포', '신림', '건대', '성수', '압구정', '청담', '역삼', '삼성', '잠실', '송파', '마포', '용산', '서초', '주변', '근처', '동네'];

    // 가격 키워드
    const priceKeywords = {
      cheap: ['저렴', '싼', '가성비', '1만원', '만원이하', '저가'],
      moderate: ['적당', '보통', '2만원', '3만원'],
      expensive: ['비싼', '고급', '럭셔리', '프리미엄', '오마카세', '파인다이닝']
    };

    // 분위기/목적 키워드
    const moodKeywords = {
      casual: ['편한', '캐주얼', '가볍게', '간단히'],
      social: ['친목', '모임', '함께', '같이', '친구'],
      date: ['데이트', '분위기', '로맨틱'],
      solo: ['혼자', '혼밥', '솔로']
    };

    // ========== 2. 키워드 추출 ==========
    let detectedCategory = null;
    let detectedCategoryKeyword = null;
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          detectedCategory = category;
          detectedCategoryKeyword = keyword;
          break;
        }
      }
      if (detectedCategory) break;
    }

    let detectedTime = null;
    let detectedTimeKeyword = null;
    for (const [time, keywords] of Object.entries(timeKeywords)) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          detectedTime = time;
          detectedTimeKeyword = keyword;
          break;
        }
      }
      if (detectedTime) break;
    }

    let detectedLocation = null;
    for (const loc of locationKeywords) {
      if (queryLower.includes(loc)) {
        detectedLocation = loc;
        break;
      }
    }

    let detectedPrice = null;
    for (const [price, keywords] of Object.entries(priceKeywords)) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          detectedPrice = price;
          break;
        }
      }
      if (detectedPrice) break;
    }

    let detectedMood = null;
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          detectedMood = mood;
          break;
        }
      }
      if (detectedMood) break;
    }

    // ========== 3. AI 분석 텍스트 생성 ==========
    const analysisPoints = [];

    if (detectedCategory) {
      analysisPoints.push(`🍽️ "${detectedCategoryKeyword}" 키워드를 통해 **${detectedCategory}** 카테고리 모임을 찾고 계시네요.`);
    }

    if (detectedTime) {
      const timeDescriptions = {
        morning: '아침/브런치 시간대',
        lunch: '점심 시간대',
        dinner: '저녁 시간대',
        late_night: '야식/심야 시간대'
      };
      analysisPoints.push(`⏰ ${timeDescriptions[detectedTime]}에 함께할 모임을 원하시는군요.`);
    }

    if (detectedLocation) {
      analysisPoints.push(`📍 "${detectedLocation}" 지역 근처의 모임을 검색합니다.`);
    }

    if (detectedPrice) {
      const priceDescriptions = {
        cheap: '가성비 좋은',
        moderate: '적당한 가격대의',
        expensive: '고급스러운'
      };
      analysisPoints.push(`💰 ${priceDescriptions[detectedPrice]} 모임을 선호하시네요.`);
    }

    if (detectedMood) {
      const moodDescriptions = {
        casual: '편안하고 캐주얼한',
        social: '친목을 다질 수 있는',
        date: '분위기 좋은',
        solo: '혼밥러를 위한'
      };
      analysisPoints.push(`✨ ${moodDescriptions[detectedMood]} 분위기의 모임을 찾아드릴게요.`);
    }

    // 분석 결과 요약
    let intentSummary = '';
    if (analysisPoints.length > 0) {
      intentSummary = `🤖 **AI 분석 결과**\n\n${analysisPoints.join('\n\n')}\n\n아래에서 추천 모임을 확인해보세요!`;
    } else {
      intentSummary = `🤖 **"${query}"** 키워드로 모임을 검색합니다.\n\n다양한 모임 중에서 관심 있는 모임을 찾아보세요!`;
    }

    // ========== 4. DB 검색 ==========
    let whereClause = "status = '모집중'";
    const replacements = {};

    if (detectedCategory) {
      whereClause += " AND category = :category";
      replacements.category = detectedCategory;
    }

    // 키워드 검색 (제목, 설명, 위치에서)
    const searchKeywords = query.split(/\s+/).filter(k => k.length > 1);
    if (searchKeywords.length > 0 && !detectedCategory) {
      const keywordConditions = searchKeywords.map((kw, idx) => {
        replacements[`kw${idx}`] = `%${kw}%`;
        return `(title ILIKE :kw${idx} OR description ILIKE :kw${idx} OR location ILIKE :kw${idx})`;
      });
      whereClause += ` AND (${keywordConditions.join(' OR ')})`;
    }

    // 지역 검색
    if (detectedLocation && detectedLocation !== '주변' && detectedLocation !== '근처' && detectedLocation !== '동네') {
      whereClause += ` AND (location ILIKE :location OR address ILIKE :location)`;
      replacements.location = `%${detectedLocation}%`;
    }

    console.log('🔍 검색 조건:', { whereClause, detectedCategory, detectedTime, detectedLocation });

    // 모임 검색
    const meetups = await sequelize.query(`
      SELECT
        m.id, m.title, m.description, m.location, m.address,
        m.date, m.time, m.category, m.max_participants, m.current_participants,
        m.price_range, m.image, m.status,
        u.name as host_name, u.profile_image as host_profile_image
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE ${whereClause}
      ORDER BY m.date ASC, m.time ASC
      LIMIT 10
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    console.log('✅ AI 검색 결과:', meetups.length, '개');

    // ========== 5. 대안 제안 생성 ==========
    const alternatives = {
      reason: meetups.length === 0 ? '검색 조건에 맞는 모임이 없습니다.' : null,
      suggestions: []
    };

    if (meetups.length === 0) {
      if (detectedCategory) {
        alternatives.suggestions.push(`"${detectedCategory}" 카테고리 모임 전체 보기`);
      }
      alternatives.suggestions.push('새로운 모임 만들기');
      alternatives.suggestions.push('다른 지역에서 검색해보기');
      alternatives.suggestions.push('검색 키워드 변경해보기');
    } else if (meetups.length < 3) {
      alternatives.suggestions.push('더 많은 모임 보기');
      if (detectedCategory) {
        alternatives.suggestions.push(`다른 ${detectedCategory} 모임 둘러보기`);
      }
    }

    // ========== 6. 각 모임별 추천 이유 및 점수 생성 ==========
    const generateMeetupReasons = (meetup) => {
      const reasons = [];

      // 매칭 항목별 점수 (총 100점 만점 구성)
      // - 카테고리: 30점 (핵심 조건)
      // - 키워드: 20점
      // - 지역: 20점
      // - 시간대: 15점
      // - 가격: 10점
      // - 분위기: 5점
      // + 보너스 최대 10점

      let score = 0;
      let matchedCriteria = 0;
      let totalCriteria = 0;

      const titleLower = (meetup.title || '').toLowerCase();
      const descLower = (meetup.description || '').toLowerCase();
      const locationLower = (meetup.location || '').toLowerCase();
      const categoryLower = (meetup.category || '').toLowerCase();

      // 카테고리 매칭 (30점)
      if (detectedCategory) {
        totalCriteria++;
        if (categoryLower.includes(detectedCategory.toLowerCase())) {
          reasons.push(`🍽️ "${detectedCategory}" 카테고리와 정확히 일치해요`);
          score += 30;
          matchedCriteria++;
        }
      }

      // 키워드 매칭 (20점)
      if (detectedCategoryKeyword) {
        totalCriteria++;
        if (titleLower.includes(detectedCategoryKeyword.toLowerCase())) {
          reasons.push(`✨ 제목에 "${detectedCategoryKeyword}" 키워드가 포함되어 있어요`);
          score += 20;
          matchedCriteria++;
        } else if (descLower.includes(detectedCategoryKeyword.toLowerCase())) {
          reasons.push(`📝 설명에서 "${detectedCategoryKeyword}" 관련 내용을 발견했어요`);
          score += 15;
          matchedCriteria++;
        }
      }

      // 지역 매칭 (20점)
      if (detectedLocation) {
        totalCriteria++;
        if (locationLower.includes(detectedLocation.toLowerCase())) {
          reasons.push(`📍 원하시는 "${detectedLocation}" 지역 모임이에요`);
          score += 20;
          matchedCriteria++;
        }
      }

      // 시간대 매칭 (15점)
      if (detectedTime && meetup.time) {
        totalCriteria++;
        const hour = parseInt(meetup.time.split(':')[0]);
        let timeMatched = false;
        if (detectedTime === 'morning' && hour >= 6 && hour < 11) {
          reasons.push(`☀️ 아침 시간대에 딱 맞는 모임이에요`);
          timeMatched = true;
        } else if (detectedTime === 'lunch' && hour >= 11 && hour < 14) {
          reasons.push(`🌤️ 점심 시간대에 완벽한 모임이에요`);
          timeMatched = true;
        } else if (detectedTime === 'dinner' && hour >= 17 && hour < 21) {
          reasons.push(`🌙 저녁 시간대에 어울리는 모임이에요`);
          timeMatched = true;
        } else if (detectedTime === 'late_night' && (hour >= 21 || hour < 2)) {
          reasons.push(`🌃 야식/심야 시간대 모임이에요`);
          timeMatched = true;
        }
        if (timeMatched) {
          score += 15;
          matchedCriteria++;
        }
      }

      // 가격 매칭 (10점)
      if (detectedPrice && meetup.price_range) {
        totalCriteria++;
        const priceText = meetup.price_range.toLowerCase();
        let priceMatched = false;
        if (detectedPrice === 'cheap' && (priceText.includes('1만') || priceText.includes('무료') || priceText.includes('이하'))) {
          reasons.push(`💰 가성비 좋은 가격대예요`);
          priceMatched = true;
        } else if (detectedPrice === 'moderate' && (priceText.includes('2만') || priceText.includes('3만'))) {
          reasons.push(`💵 적당한 가격대의 모임이에요`);
          priceMatched = true;
        } else if (detectedPrice === 'expensive' && (priceText.includes('5만') || priceText.includes('10만'))) {
          reasons.push(`💎 프리미엄 가격대의 고급 모임이에요`);
          priceMatched = true;
        }
        if (priceMatched) {
          score += 10;
          matchedCriteria++;
        }
      }

      // 분위기 매칭 (5점)
      if (detectedMood) {
        totalCriteria++;
        const moodReasons = {
          casual: '👋 편안하고 부담없는 분위기의 모임이에요',
          social: '🤝 새로운 친구를 사귈 수 있는 친목 모임이에요',
          date: '💕 분위기 있는 장소에서 진행되는 모임이에요',
          solo: '🧘 혼밥러도 편하게 참여할 수 있어요'
        };
        if (moodReasons[detectedMood]) {
          reasons.push(moodReasons[detectedMood]);
          score += 5;
          matchedCriteria++;
        }
      }

      // 조건이 없는 경우 기본 점수 부여
      if (totalCriteria === 0) {
        score = 70; // 기본 검색 시 기본 점수
        reasons.push(`🎯 검색 조건과 관련된 모임이에요`);
      }

      // 보너스 점수 (최대 10점 추가)
      // 인원 관련 보너스
      if (meetup.max_participants) {
        if (meetup.max_participants <= 4) {
          reasons.push(`👥 소규모 모임이라 더 친밀한 대화가 가능해요`);
          score += 3;
        } else if (meetup.max_participants >= 8) {
          reasons.push(`🎉 다양한 사람들을 만날 수 있는 대규모 모임이에요`);
          score += 2;
        }
      }

      // 모집 현황 보너스
      if (meetup.current_participants && meetup.max_participants) {
        const remaining = meetup.max_participants - meetup.current_participants;
        if (remaining === 1) {
          reasons.push(`🔥 마지막 1자리! 서둘러 신청하세요`);
          score += 5;
        } else if (remaining <= 3) {
          reasons.push(`⏰ ${remaining}자리 남았어요, 마감 임박!`);
          score += 3;
        }
      }

      // 완벽 매칭 보너스 (모든 조건 충족 시)
      if (totalCriteria > 0 && matchedCriteria === totalCriteria) {
        reasons.unshift(`🏆 검색 조건 ${matchedCriteria}개 모두 충족! 완벽한 매칭!`);
        // 100점이 되도록 보정
        if (score < 100) {
          score = 100;
        }
      }

      // 기본 이유가 없으면 추가
      if (reasons.length === 0) {
        reasons.push(`🎯 검색 조건과 관련된 모임이에요`);
      }

      // 점수 정규화 (0-100)
      score = Math.min(100, Math.max(0, score));

      return { reasons, score };
    };

    const noMatchReason = meetups.length === 0
      ? `😢 아쉽게도 "${query}"에 맞는 모임을 찾지 못했어요.\n\n다른 키워드로 검색하시거나, 직접 모임을 만들어보시는 건 어떨까요?`
      : null;

    const results = [{
      isNoMatch: meetups.length === 0,
      userContext: query,
      wantedCategory: detectedCategory || '',
      noMatchReason,
      intentSummary,
      searchType: detectedCategory ? 'category' : 'keyword',
      userNeeds: {
        immediate: detectedTime === 'lunch' || detectedTime === 'dinner',
        priceConscious: detectedPrice === 'cheap',
        locationSpecific: !!detectedLocation,
        moodRequirement: detectedMood,
        cuisinePreference: detectedCategory ? [detectedCategory] : []
      },
      alternatives,
      recommendedMeetups: meetups.map(m => {
        const { reasons, score } = generateMeetupReasons(m);
        return {
          id: m.id,
          title: m.title,
          description: m.description,
          location: m.location,
          address: m.address,
          date: m.date,
          time: m.time,
          category: m.category,
          maxParticipants: m.max_participants,
          currentParticipants: m.current_participants,
          priceRange: m.price_range,
          image: m.image,
          status: m.status,
          host: {
            name: m.host_name,
            profileImage: m.host_profile_image
          },
          // 추가된 AI 분석 필드
          aiReasons: reasons,
          aiScore: score,
          matchType: detectedCategory ? 'category' : 'keyword'
        };
      }).sort((a, b) => b.aiScore - a.aiScore) // 점수 높은 순으로 정렬
    }];

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ AI 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: 'AI 검색 중 오류가 발생했습니다',
      results: [{
        isNoMatch: true,
        userContext: req.body.query || '',
        noMatchReason: '검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        wantedCategory: '',
        intentSummary: '🤖 검색 처리 중 문제가 발생했습니다.'
      }]
    });
  }
});

// API 라우터 설정
console.log('🔗 등록 중: /api/users 라우터');
app.use('/api/users', userRoutes);
console.log('🔗 등록 중: /api/meetups 라우터');
app.use('/api/meetups', meetupRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', researchRoutes);
app.use('/api', reviewRoutes); // 리뷰 라우트 (/api/meetups/:id/reviews 등)

// 고급 리서치 파이프라인 라우트
const advancedResearchRoutes = require('./routes/advanced-research');
app.use('/api/admin/advanced', advancedResearchRoutes);

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