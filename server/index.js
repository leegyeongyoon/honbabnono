const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const multer = require('multer');
const fs = require('fs');

// PostgreSQL 연결 설정
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// 환경변수 로드
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://honbabnono.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
const PORT = process.env.API_PORT || 3001;

// 카카오 OAuth 헬퍼 함수들
const getKakaoToken = async (code) => {
  try {
    const response = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID,
        client_secret: process.env.KAKAO_CLIENT_SECRET,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Kakao token error:', error.response?.data || error.message);
    throw new Error('Failed to get Kakao token');
  }
};

const getKakaoUserInfo = async (accessToken) => {
  try {
    const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Kakao user info error:', error.response?.data || error.message);
    throw new Error('Failed to get Kakao user info');
  }
};

const generateJWT = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Express Router 생성 (API base path용)
const apiRouter = express.Router();

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정 (이미지 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `meetup-${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // 이미지 파일만 허용
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  }
});

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:3000', 'https://honbabnono.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (업로드된 이미지)
app.use('/uploads', express.static(uploadDir));

// 모든 요청 로깅 (디버깅용)
app.use((req, res, next) => {
  console.log(`📝 Request: ${req.method} ${req.url}`);
  next();
});

// API 라우터를 /api 경로에 마운트
app.use('/api', apiRouter);

// 임시: /api 없는 요청을 /api로 리다이렉트 (하위 호환성을 위해)
app.use('/meetups', (req, res) => {
  console.log('⚠️  Legacy request without /api prefix, redirecting:', req.originalUrl);
  res.redirect(301, `/api${req.originalUrl}`);
});

app.use('/auth', (req, res) => {
  console.log('⚠️  Legacy auth request without /api prefix, redirecting:', req.originalUrl);
  res.redirect(301, `/api${req.originalUrl}`);
});

app.use('/chat', (req, res) => {
  console.log('⚠️  Legacy chat request without /api prefix, redirecting:', req.originalUrl);
  res.redirect(301, `/api${req.originalUrl}`);
});

// 기본 라우터
apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '혼밥시러 API 서버가 정상 동작 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// 카카오 로그인 시작 (인증 페이지로 리다이렉트)
apiRouter.get('/auth/kakao', (req, res) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.KAKAO_REDIRECT_URI)}&response_type=code`;
  
  console.log('카카오 로그인 시작:', {
    clientId: process.env.KAKAO_CLIENT_ID,
    redirectUri: process.env.KAKAO_REDIRECT_URI,
    authUrl: kakaoAuthUrl
  });
  
  res.redirect(kakaoAuthUrl);
});

// 카카오 로그인 시작 (레거시 경로)
apiRouter.get('/auth/kakao/login', (req, res) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.KAKAO_REDIRECT_URI)}&response_type=code`;
  
  console.log('카카오 로그인 시작:', {
    clientId: process.env.KAKAO_CLIENT_ID,
    redirectUri: process.env.KAKAO_REDIRECT_URI,
    authUrl: kakaoAuthUrl
  });
  
  res.redirect(kakaoAuthUrl);
});

// 카카오 로그인 콜백 처리
apiRouter.get('/auth/kakao/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('카카오 로그인 에러:', error);
    return res.redirect('/#/login?error=kakao_auth_failed');
  }
  
  if (!code) {
    console.error('카카오 로그인 코드 없음');
    return res.redirect('/#/login?error=no_auth_code');
  }
  
  try {
    console.log('카카오 로그인 콜백 처리 시작:', code);
    
    // 1. 카카오에서 access_token 받기
    const tokenData = await getKakaoToken(code);
    console.log('카카오 토큰 획득 성공');
    
    // 2. access_token으로 사용자 정보 조회
    const kakaoUser = await getKakaoUserInfo(tokenData.access_token);
    console.log('카카오 사용자 정보 획득:', kakaoUser.kakao_account?.email);
    
    // 3. 데이터베이스에서 사용자 찾기 또는 생성
    let userResult = await pool.query(`
      SELECT * FROM users WHERE provider = $1 AND provider_id = $2
    `, ['kakao', kakaoUser.id.toString()]);
    
    let user;
    let created = false;
    
    if (userResult.rows.length === 0) {
      // 새 사용자 생성
      const newUserResult = await pool.query(`
        INSERT INTO users (
          id, email, name, profile_image, provider, provider_id, is_verified, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING *
      `, [
        kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@honbabnono.com`,
        kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자',
        kakaoUser.kakao_account?.profile?.profile_image_url,
        'kakao',
        kakaoUser.id.toString(),
        true
      ]);
      user = newUserResult.rows[0];
      created = true;
    } else {
      user = userResult.rows[0];
    }
    
    if (created) {
      console.log('새 사용자 생성:', user.email);
    } else {
      console.log('기존 사용자 로그인:', user.email);
    }
    
    // 4. JWT 토큰 생성
    const jwtToken = generateJWT(user);
    
    // 5. 프론트엔드로 토큰과 함께 리다이렉트
    res.redirect(`http://localhost:3000/login?success=true&token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage
    }))}`);
    
  } catch (error) {
    console.error('카카오 로그인 처리 실패:', error);
    res.redirect('http://localhost:3000/login?error=kakao_login_failed');
  }
});

// 토큰 검증 및 자동 로그인 API
// 테스트 로그인 API (개발용)
apiRouter.post('/auth/test-login', async (req, res) => {
  try {
    const testUser = {
      id: '11111111-1111-1111-1111-111111111111',
      name: '테스트유저1',
      email: 'test1@test.com'
    };

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: testUser.id,
        email: testUser.email,
        name: testUser.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ 테스트 로그인 성공:', testUser.email);
    
    res.json({
      success: true,
      token,
      user: testUser
    });
  } catch (error) {
    console.error('❌ 테스트 로그인 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '테스트 로그인 중 오류가 발생했습니다.' 
    });
  }
});

apiRouter.post('/auth/verify-token', async (req, res) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 JWT decoded:', decoded);
    
    // userId 필드명 확인 (userId 또는 id)
    const userId = decoded.userId || decoded.id;
    console.log('🔍 Extracted userId:', userId);
    
    // 사용자 정보 조회 (is_verified 조건 제거)
    const userResult = await pool.query(`
      SELECT id, email, name, profile_image, provider, is_verified, created_at 
      FROM users 
      WHERE id = $1
    `, [userId]);

    console.log('🔍 User query result:', { found: userResult.rows.length, userId });

    if (userResult.rows.length === 0) {
      console.log('❌ 사용자를 찾을 수 없습니다:', userId);
      return res.status(404).json({ 
        success: false, 
        error: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = userResult.rows[0];
    
    console.log('✅ 토큰 검증 성공 - 자동 로그인:', user.email);

    res.json({
      success: true,
      message: '자동 로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profile_image,
        provider: user.provider,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      token: token // 기존 토큰 재사용
    });

  } catch (error) {
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

    console.error('토큰 검증 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 카카오 로그인 API (웹 앱용)
apiRouter.post('/auth/kakao', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({
      success: false,
      message: '인증 코드가 필요합니다.'
    });
  }
  
  try {
    console.log('카카오 로그인 API 요청 처리 시작:', code);
    
    // 1. 카카오에서 access_token 받기
    const tokenData = await getKakaoToken(code);
    console.log('카카오 토큰 획득 성공');
    
    // 2. access_token으로 사용자 정보 조회
    const kakaoUser = await getKakaoUserInfo(tokenData.access_token);
    console.log('카카오 사용자 정보 획득:', kakaoUser.kakao_account?.email);
    
    // 3. 데이터베이스에서 사용자 찾기 또는 생성
    let userResult = await pool.query(`
      SELECT * FROM users WHERE provider = $1 AND provider_id = $2
    `, ['kakao', kakaoUser.id.toString()]);
    
    let user;
    let created = false;
    
    if (userResult.rows.length === 0) {
      // 새 사용자 생성
      const newUserResult = await pool.query(`
        INSERT INTO users (
          id, email, name, profile_image, provider, provider_id, is_verified, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING *
      `, [
        kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@honbabnono.com`,
        kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자',
        kakaoUser.kakao_account?.profile?.profile_image_url,
        'kakao',
        kakaoUser.id.toString(),
        true
      ]);
      user = newUserResult.rows[0];
      created = true;
    } else {
      user = userResult.rows[0];
    }
    
    if (created) {
      console.log('새 사용자 생성:', user.email);
    } else {
      console.log('기존 사용자 로그인:', user.email);
    }
    
    // 4. JWT 토큰 생성
    const jwtToken = generateJWT(user);
    
    // 5. 응답 반환
    res.json({
      success: true,
      message: '카카오 로그인 성공',
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          provider: user.provider
        }
      }
    });
    
  } catch (error) {
    console.error('카카오 로그인 API 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '카카오 로그인 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 토큰 검증 시작:', { 
    url: req.originalUrl, 
    method: req.method,
    authHeader: authHeader?.substring(0, 20) + '...', 
    token: token?.substring(0, 20) + '...' 
  });

  if (!token) {
    console.log('❌ 토큰이 없습니다');
    return res.status(401).json({ error: '접근 토큰이 필요합니다' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ 토큰 검증 실패:', err.message);
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }
    console.log('✅ 토큰 검증 성공:', { userId: user.userId || user.id, email: user.email, url: req.originalUrl });
    req.user = { userId: user.userId || user.id, email: user.email, name: user.name };
    next();
  });
};

// 이미지 업로드 API
apiRouter.post('/upload/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('📷 이미지 업로드 요청:', {
      userId: req.user.userId,
      file: req.file ? {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file'
    });

    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다' });
    }

    // 업로드된 파일의 URL 생성
    const imageUrl = `http://localhost:3001/uploads/${req.file.filename}`;
    
    console.log('✅ 이미지 업로드 성공:', imageUrl);
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다' });
  }
});

// 사용자 프로필 조회 (인증 필요)
apiRouter.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(`
      SELECT id, email, name, profile_image, provider, provider_id, 
             is_verified, rating, meetups_hosted, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [req.user.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const user = userResult.rows[0];
    res.json({ user });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 밥 모임 목록 조회 (데이터베이스 연동)
apiRouter.get('/meetups', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, location, search } = req.query;
    const offset = (page - 1) * limit;
    const where = { status: '모집중' };

    // 필터 조건 추가
    if (category) where.category = category;
    if (location) where.location = { [require('sequelize').Op.iLike]: `%${location}%` };
    if (search) {
      where[require('sequelize').Op.or] = [
        { title: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { description: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }

    // 전체 개수 조회
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM meetups m
      WHERE m.status = '모집중'
    `);
    const total = parseInt(countResult.rows[0].total);

    // 모임 목록 조회 (채팅방 마지막 메시지 시간 포함)
    const meetupsResult = await pool.query(`
      SELECT DISTINCT ON (m.id)
        m.id,
        m.title,
        m.description,
        m.location,
        m.address,
        m.latitude,
        m.longitude,
        m.date,
        m.time,
        m.max_participants as "maxParticipants",
        m.current_participants as "currentParticipants",
        m.category,
        m.price_range as "priceRange",
        m.image,
        m.status,
        m.host_id as "hostId",
        m.requirements,
        m.tags,
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        u.id as "host.id",
        u.name as "host.name",
        u.profile_image as "host.profileImage",
        u.rating as "host.rating",
        cr."lastMessageTime" as "lastChatTime",
        cr."lastMessage" as "lastChatMessage"
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON ("meetupId") 
          "meetupId",
          "lastMessageTime",
          "lastMessage"
        FROM chat_rooms 
        WHERE "isActive" = true 
        ORDER BY "meetupId", "lastMessageTime" DESC
      ) cr ON m.id = cr."meetupId"
      WHERE m.status = '모집중'
      ORDER BY m.id, m.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const meetups = meetupsResult.rows;

    res.json({
      meetups,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('모임 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 로그아웃 API (토큰 무효화)
apiRouter.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    console.log('🚪 로그아웃 요청:', { userId: req.user.userId, email: req.user.email });
    
    // 클라이언트 측에서 토큰을 삭제하도록 응답
    res.json({
      success: true,
      message: '로그아웃 되었습니다.'
    });
    
    console.log('✅ 로그아웃 완료:', { userId: req.user.userId });
  } catch (error) {
    console.error('❌ 로그아웃 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 모임 생성 (데이터베이스 연동, 인증 필요)

// 모임 상세 조회 API
apiRouter.get('/meetups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 모임 상세 조회 요청:', { meetupId: id });
    
    // 조회수 증가
    await pool.query(`
      UPDATE meetups 
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = $1
    `, [id]);
    
    // 모임 정보 조회
    const meetupResult = await pool.query(`
      SELECT 
        m.id,
        m.title,
        m.description,
        m.location,
        m.address,
        m.latitude,
        m.longitude,
        m.date,
        m.time,
        m.max_participants as "maxParticipants",
        m.current_participants as "currentParticipants",
        m.category,
        m.price_range as "priceRange",
        m.image,
        m.status,
        m.host_id as "hostId",
        m.requirements,
        m.tags,
        m.view_count as "viewCount",
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        u.id as "host_id",
        u.name as "host_name",
        u.profile_image as "host_profileImage",
        u.rating as "host_rating",
        u.meetups_hosted as "host_meetups_hosted",
        u.meetups_joined as "host_meetups_joined"
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    const meetupData = meetupResult.rows[0];
    
    // 참가자 정보 조회
    const participantsResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.profile_image as "profileImage",
        mp.status,
        mp.created_at as "joinedAt"
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.meetup_id = $1
      ORDER BY mp.created_at ASC
    `, [id]);

    // 호스트의 밥알지수 계산
    const calculateBabAlScore = (hostedCount = 0, joinedCount = 0, rating = 0) => {
      let score = 20; // 기본 점수
      score += Math.min(joinedCount * 2, 30); // 참여 점수 (최대 30점)
      score += Math.min(hostedCount * 5, 25); // 호스팅 점수 (최대 25점) 
      score += Math.min((rating - 1) * 6.25, 25); // 평점 점수 (최대 25점)
      return Math.min(Math.round(score), 100);
    };

    const hostBabAlScore = calculateBabAlScore(
      meetupData.host_meetups_hosted || 0,
      meetupData.host_meetups_joined || 0, 
      meetupData.host_rating || 0
    );

    // 모임 데이터 구조화
    const meetup = {
      id: meetupData.id,
      title: meetupData.title,
      description: meetupData.description,
      location: meetupData.location,
      address: meetupData.address,
      latitude: meetupData.latitude,
      longitude: meetupData.longitude,
      date: meetupData.date,
      time: meetupData.time,
      maxParticipants: meetupData.maxParticipants,
      currentParticipants: meetupData.currentParticipants,
      category: meetupData.category,
      priceRange: meetupData.priceRange,
      image: meetupData.image,
      status: meetupData.status,
      hostId: meetupData.hostId,
      requirements: meetupData.requirements,
      tags: meetupData.tags,
      viewCount: meetupData.viewCount || 0,
      createdAt: meetupData.createdAt,
      updatedAt: meetupData.updatedAt,
      host: {
        id: meetupData.host_id,
        name: meetupData.host_name,
        profileImage: meetupData.host_profileImage,
        rating: meetupData.host_rating,
        babAlScore: hostBabAlScore
      },
      participants: participantsResult.rows
    };

    console.log('✅ 모임 상세 조회 성공:', { meetupId: id, participantCount: participantsResult.rows.length });

    res.json({
      success: true,
      meetup
    });
  } catch (error) {
    console.error('모임 상세 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 모임 생성 API
apiRouter.post('/meetups', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      address,
      date,
      time,
      maxParticipants,
      priceRange,
      requirements,
      tags,
      // Preference filters
      genderFilter,
      ageFilterMin,
      ageFilterMax,
      eatingSpeed,
      conversationDuringMeal,
      talkativeness,
      mealPurpose,
      specificRestaurant,
      interests,
      isRequired
    } = req.body;

    const userId = req.user.userId;
    
    console.log('🎯 모임 생성 요청:', {
      userId,
      title,
      category,
      location,
      date,
      time,
      maxParticipants,
      hasImage: !!req.file,
      filters: {
        genderFilter,
        ageFilterMin,
        ageFilterMax,
        eatingSpeed,
        conversationDuringMeal,
        talkativeness,
        mealPurpose,
        specificRestaurant,
        interests: typeof interests === 'string' ? interests : JSON.stringify(interests),
        isRequired
      }
    });

    // 필수 필드 검증
    if (!title || !category || !location || !date || !time || !maxParticipants) {
      return res.status(400).json({ 
        error: '제목, 카테고리, 위치, 날짜, 시간, 최대 참가자 수는 필수입니다' 
      });
    }

    // 필수 필터 검증 (성별, 나이만)
    if (!genderFilter || !ageFilterMin || !ageFilterMax) {
      return res.status(400).json({ 
        error: '필수 필터를 모두 선택해주세요 (성별, 나이)' 
      });
    }

    // 이미지 URL 처리
    let imageUrl = null;
    if (req.file) {
      imageUrl = `http://localhost:3001/uploads/${req.file.filename}`;
    }

    // 태그 처리 (문자열이면 JSON으로 파싱)
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      }
    }

    // 모임 생성
    const meetupResult = await pool.query(`
      INSERT INTO meetups (
        id, title, description, category, location, address, 
        date, time, max_participants, current_participants, 
        price_range, image, status, host_id, requirements, 
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, '모집중', $11, $12, NOW(), NOW()
      ) RETURNING *
    `, [
      title,
      description || '',
      category,
      location,
      address || '',
      date,
      time,
      parseInt(maxParticipants),
      priceRange || '1-2만원',
      imageUrl,
      userId,
      requirements || ''
    ]);

    const newMeetup = meetupResult.rows[0];

    // 호스트를 자동으로 참가자로 추가
    await pool.query(`
      INSERT INTO meetup_participants (id, meetup_id, user_id, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, '참가승인', NOW(), NOW())
    `, [newMeetup.id, userId]);

    // 현재 참가자 수 업데이트
    await pool.query(`
      UPDATE meetups 
      SET current_participants = 1
      WHERE id = $1
    `, [newMeetup.id]);

    // 태그 저장 (태그 테이블이 있다면)
    if (parsedTags.length > 0) {
      try {
        const tagPromises = parsedTags.map(tag => 
          pool.query(`
            INSERT INTO meetup_tags (meetup_id, tag_name) 
            VALUES ($1, $2) 
            ON CONFLICT DO NOTHING
          `, [newMeetup.id, tag])
        );
        await Promise.all(tagPromises);
      } catch (tagError) {
        console.log('태그 저장 스킵:', tagError.message);
      }
    }

    // 모임 생성 시 채팅방도 자동 생성
    try {
      const chatRoomResult = await pool.query(`
        INSERT INTO chat_rooms (type, "meetupId", title, description, "createdBy", "createdAt", "updatedAt")
        VALUES ('meetup', $1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `, [newMeetup.id, newMeetup.title, `${newMeetup.title} 모임 채팅방`, userId]);

      const roomId = chatRoomResult.rows[0].id;

      // 사용자 이름 조회
      const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userResult.rows[0]?.name || '사용자';

      // 호스트를 채팅방 참여자로 자동 추가
      await pool.query(`
        INSERT INTO chat_participants ("chatRoomId", "userId", "userName", "joinedAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW(), NOW())
      `, [roomId, userId, userName]);

      console.log('✅ 채팅방 자동 생성 완료:', { roomId, meetupId: newMeetup.id });
    } catch (chatError) {
      console.log('⚠️ 채팅방 생성 실패 (무시):', chatError.message);
    }

    console.log('✅ 모임 생성 완료:', {
      meetupId: newMeetup.id,
      title: newMeetup.title,
      imageUrl
    });

    res.json({
      success: true,
      message: '모임이 생성되었습니다',
      meetup: {
        id: newMeetup.id,
        title: newMeetup.title,
        description: newMeetup.description,
        category: newMeetup.category,
        location: newMeetup.location,
        address: newMeetup.address,
        date: newMeetup.date,
        time: newMeetup.time,
        maxParticipants: newMeetup.max_participants,
        currentParticipants: newMeetup.current_participants,
        priceRange: newMeetup.price_range,
        image: newMeetup.image,
        status: newMeetup.status,
        hostId: newMeetup.host_id,
        requirements: newMeetup.requirements,
        tags: parsedTags,
        createdAt: newMeetup.created_at
      }
    });
  } catch (error) {
    console.error('모임 생성 오류:', error);
    res.status(500).json({ error: '모임 생성 중 오류가 발생했습니다' });
  }
});

// 모임 참가 API
apiRouter.post('/meetups/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('👥 모임 참가 요청:', { meetupId: id, userId });

    // 모임 존재 확인
    const meetupResult = await pool.query(`
      SELECT id, current_participants, max_participants, status 
      FROM meetups 
      WHERE id = $1
    `, [id]);

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    const meetup = meetupResult.rows[0];

    // 이미 참가했는지 확인
    const existingParticipantResult = await pool.query(`
      SELECT id FROM meetup_participants 
      WHERE meetup_id = $1 AND user_id = $2
    `, [id, userId]);

    if (existingParticipantResult.rows.length > 0) {
      return res.status(400).json({ error: '이미 참가한 모임입니다' });
    }

    // 참가자 수 확인
    if (meetup.current_participants >= meetup.max_participants) {
      return res.status(400).json({ error: '모임이 가득찼습니다' });
    }

    // 참가자 추가
    await pool.query(`
      INSERT INTO meetup_participants (id, meetup_id, user_id, status, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
    `, [id, userId, '참가승인']);

    // 현재 참가자 수 업데이트
    await pool.query(`
      UPDATE meetups 
      SET current_participants = current_participants + 1, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    console.log('✅ 모임 참가 완료:', { meetupId: id, userId });

    res.json({
      success: true,
      message: '모임 참가가 완료되었습니다'
    });
  } catch (error) {
    console.error('모임 참가 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 호스트가 모임을 취소하는 함수
async function handleHostCancelMeetup(req, res, meetupId, hostId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🚨 호스트가 모임을 취소합니다:', { meetupId, hostId });

    // 1. 모든 참가자 조회
    const participantsResult = await client.query(`
      SELECT user_id FROM meetup_participants WHERE meetup_id = $1
    `, [meetupId]);

    // 2. 채팅방 조회
    const chatRoomResult = await client.query(`
      SELECT id FROM chat_rooms WHERE "meetupId" = $1
    `, [meetupId]);

    // 3. 채팅방이 있으면 정리
    if (chatRoomResult.rows.length > 0) {
      const chatRoomId = chatRoomResult.rows[0].id;
      
      // 모든 채팅 참가자 비활성화
      await client.query(`
        UPDATE chat_participants 
        SET "isActive" = false, "leftAt" = NOW(), "updatedAt" = NOW()
        WHERE "chatRoomId" = $1
      `, [chatRoomId]);

      // 시스템 메시지 추가
      await client.query(`
        INSERT INTO chat_messages (
          id, "chatRoomId", "senderId", "senderName", message, 
          "messageType", "createdAt", "updatedAt"
        )
        VALUES (
          gen_random_uuid(), $1, 'system', '시스템', '호스트가 모임을 취소했습니다. 채팅방이 종료됩니다.',
          'system', NOW(), NOW()
        )
      `, [chatRoomId]);

      // 채팅방 비활성화
      await client.query(`
        UPDATE chat_rooms 
        SET "isActive" = false, "lastMessage" = '호스트가 모임을 취소했습니다.', 
            "lastMessageTime" = NOW(), "updatedAt" = NOW()
        WHERE id = $1
      `, [chatRoomId]);
    }

    // 4. 참가자들에게 포인트 환불 (약속금 3000원 환불)
    const depositAmount = 3000;
    for (const participant of participantsResult.rows) {
      try {
        await client.query(`
          UPDATE users 
          SET points = points + $1, updated_at = NOW()
          WHERE id = $2
        `, [depositAmount, participant.user_id]);

        // 포인트 거래 내역 기록
        await client.query(`
          INSERT INTO point_transactions (id, user_id, amount, type, description, meetup_id, created_at)
          VALUES (gen_random_uuid(), $1, $2, 'refund', $3, $4, NOW())
        `, [participant.user_id, depositAmount, '모임 취소로 인한 약속금 환불', meetupId]);

        console.log('✅ 참가자 포인트 환불 완료:', { userId: participant.user_id, amount: depositAmount });
      } catch (refundError) {
        console.error('포인트 환불 실패:', { userId: participant.user_id, error: refundError });
        // 포인트 환불 실패해도 모임 취소는 진행
      }
    }

    // 5. 모든 참가자 제거
    await client.query(`
      DELETE FROM meetup_participants WHERE meetup_id = $1
    `, [meetupId]);

    // 6. 모임 상태를 취소로 변경 (삭제하지 않고 취소 상태로)
    await client.query(`
      UPDATE meetups 
      SET status = '취소', current_participants = 0, updated_at = NOW()
      WHERE id = $1
    `, [meetupId]);

    await client.query('COMMIT');
    
    // 7. 관련 알림들 정리 (트랜잭션 외부에서 실행 - 실패해도 메인 로직에 영향 없음)
    try {
      const notifClient = await pool.connect();
      try {
        await notifClient.query(`
          DELETE FROM notifications 
          WHERE user_id = $1 AND content LIKE $2
        `, [hostId, `%${meetupId}%`]);
        console.log('알림 테이블 정리 완료');
      } finally {
        notifClient.release();
      }
    } catch (notifError) {
      // notifications 테이블이 없으면 무시
      console.log('알림 테이블 정리 스킵:', notifError.message);
    }
    
    console.log('✅ 호스트의 모임 취소 완료:', { meetupId, hostId });

    res.json({
      success: true,
      message: '모임이 취소되었습니다',
      isHostCancellation: true
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('호스트 모임 취소 오류:', error);
    res.status(500).json({ error: '모임 취소 중 오류가 발생했습니다' });
  } finally {
    client.release();
  }
}

// 모임 탈퇴 API
apiRouter.post('/meetups/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('🚪 모임 탈퇴 요청:', { meetupId: id, userId });

    // 모임 존재 확인
    const meetupResult = await pool.query(`
      SELECT id, host_id, current_participants 
      FROM meetups 
      WHERE id = $1
    `, [id]);

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }

    const meetup = meetupResult.rows[0];

    // 호스트인 경우 모임 전체 취소 로직
    if (meetup.host_id === userId) {
      return await handleHostCancelMeetup(req, res, id, userId);
    }

    // 참가했는지 확인
    const participantResult = await pool.query(`
      SELECT id FROM meetup_participants 
      WHERE meetup_id = $1 AND user_id = $2
    `, [id, userId]);

    if (participantResult.rows.length === 0) {
      return res.status(400).json({ error: '참가하지 않은 모임입니다' });
    }

    // 트랜잭션 시작
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. 모임 참가자에서 제거
      await client.query(`
        DELETE FROM meetup_participants 
        WHERE meetup_id = $1 AND user_id = $2
      `, [id, userId]);

      // 2. 현재 참가자 수 감소
      await client.query(`
        UPDATE meetups 
        SET current_participants = current_participants - 1, updated_at = NOW()
        WHERE id = $1
      `, [id]);

      // 3. 해당 모임의 채팅방에서 사용자 제거
      const chatRoomResult = await client.query(`
        SELECT id FROM chat_rooms WHERE "meetupId" = $1
      `, [id]);

      if (chatRoomResult.rows.length > 0) {
        const chatRoomId = chatRoomResult.rows[0].id;
        
        // 채팅방 참가자에서 제거
        await client.query(`
          UPDATE chat_participants 
          SET "isActive" = false, "leftAt" = NOW(), "updatedAt" = NOW()
          WHERE "chatRoomId" = $1 AND "userId" = $2
        `, [chatRoomId, userId]);

        // 시스템 메시지 추가
        const userResult = await client.query(`
          SELECT name FROM users WHERE id = $1
        `, [userId]);
        
        const userName = userResult.rows[0]?.name || '사용자';
        
        await client.query(`
          INSERT INTO chat_messages (
            id, "chatRoomId", "senderId", "senderName", message, 
            "messageType", "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid(), $1, $2, '시스템', $3,
            'system', NOW(), NOW()
          )
        `, [chatRoomId, 'system', `${userName}님이 모임을 떠났습니다.`]);

        // 채팅방 마지막 메시지 업데이트
        await client.query(`
          UPDATE chat_rooms 
          SET "lastMessage" = $1, "lastMessageTime" = NOW(), "updatedAt" = NOW()
          WHERE id = $2
        `, [`${userName}님이 모임을 떠났습니다.`, chatRoomId]);
      }

      await client.query('COMMIT');
      
      // 4. 알림 데이터 정리 (트랜잭션 외부에서 실행 - 실패해도 메인 로직에 영향 없음)
      try {
        const notifClient = await pool.connect();
        try {
          await notifClient.query(`
            DELETE FROM notifications 
            WHERE user_id = $1 AND content LIKE $2
          `, [userId, `%${id}%`]);
          console.log('알림 테이블 정리 완료');
        } finally {
          notifClient.release();
        }
      } catch (notifError) {
        // notifications 테이블이 없으면 무시
        console.log('알림 테이블 정리 스킵:', notifError.message);
      }
      
      console.log('✅ 모임 탈퇴 완료:', { meetupId: id, userId });

      res.json({
        success: true,
        message: '모임에서 탈퇴했습니다'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('모임 탈퇴 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 채팅방 목록 조회 API
apiRouter.get('/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 채팅방 목록 조회 요청:', { userId });
    
    // 사용자가 참여한 채팅방 목록 조회
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.type,
        cr."meetupId",
        cr.title,
        cr.description,
        cr."lastMessage",
        cr."lastMessageTime",
        cr."isActive",
        cp."unreadCount",
        cp."isPinned",
        cp."isMuted",
        array_agg(DISTINCT cp2."userName") as participants
      FROM chat_rooms cr
      JOIN chat_participants cp ON cr.id = cp."chatRoomId"
      LEFT JOIN chat_participants cp2 ON cr.id = cp2."chatRoomId" AND cp2."isActive" = true
      WHERE cp."userId" = $1 AND cp."isActive" = true
      GROUP BY cr.id, cp."unreadCount", cp."isPinned", cp."isMuted"
      ORDER BY COALESCE(cr."lastMessageTime", cr."createdAt") DESC
    `, [userId]);
    
    const chatRooms = result.rows;

    console.log('✅ 채팅방 조회 결과:', chatRooms.length, '개');

    // 프론트엔드 형식에 맞게 변환
    const formattedRooms = chatRooms.map(room => ({
      id: room.id,
      type: room.type,
      meetupId: room.meetupId,
      title: room.title,
      participants: room.participants || [],
      lastMessage: room.lastMessage || '',
      lastTime: room.lastMessageTime ? new Date(room.lastMessageTime).toISOString() : new Date().toISOString(),
      unreadCount: room.unreadCount || 0,
      isActive: room.isActive,
      isOnline: true
    }));

    res.json({
      success: true,
      data: formattedRooms
    });
  } catch (error) {
    console.error('채팅방 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 채팅 메시지 조회 API
apiRouter.get('/chat/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('💬 채팅 메시지 조회 요청:', { chatRoomId: id, page, limit });
    
    // 채팅방 정보 조회
    const chatRoomResult = await pool.query(`
      SELECT id, title, type, "meetupId", description
      FROM chat_rooms 
      WHERE id = $1
    `, [id]);
    
    if (chatRoomResult.rows.length === 0) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다' });
    }
    
    const chatRoom = chatRoomResult.rows[0];
    
    // 채팅방 참가자 조회
    const participantsResult = await pool.query(`
      SELECT cp."userId", cp."userName"
      FROM chat_participants cp
      WHERE cp."chatRoomId" = $1 AND cp."isActive" = true
    `, [id]);
    
    // 채팅 메시지 조회 (최신순)
    const messagesResult = await pool.query(`
      SELECT 
        cm.id,
        cm."chatRoomId",
        cm."senderId",
        cm."senderName", 
        cm.message,
        cm."messageType",
        cm."isEdited",
        cm."editedAt",
        cm."isDeleted",
        cm."replyToId",
        cm."fileUrl",
        cm."fileName",
        cm."fileSize",
        cm."createdAt",
        cm."updatedAt"
      FROM chat_messages cm
      WHERE cm."chatRoomId" = $1 AND cm."isDeleted" = false
      ORDER BY cm."createdAt" DESC
      LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), parseInt(offset)]);
    
    // 메시지를 시간순 정렬 (오래된 것부터)
    const messages = messagesResult.rows.reverse().map(msg => ({
      id: msg.id,
      chatRoomId: msg.chatRoomId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      message: msg.message,
      messageType: msg.messageType || 'text',
      timestamp: msg.createdAt,
      isMe: msg.senderId === req.user.userId,
      isRead: true, // 조회된 메시지는 읽은 것으로 처리
      isEdited: msg.isEdited,
      editedAt: msg.editedAt,
      replyToId: msg.replyToId,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileSize: msg.fileSize
    }));
    
    console.log('✅ 채팅 메시지 조회 성공:', { chatRoomId: id, messageCount: messages.length });
    
    res.json({
      success: true,
      data: {
        chatRoom: {
          id: chatRoom.id,
          title: chatRoom.title,
          type: chatRoom.type,
          meetupId: chatRoom.meetupId,
          description: chatRoom.description,
          participants: participantsResult.rows
        },
        messages
      }
    });
  } catch (error) {
    console.error('채팅 메시지 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 채팅 메시지 전송 API
apiRouter.post('/chat/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, messageType = 'text' } = req.body;
    const userId = req.user.userId;
    
    console.log('📤 채팅 메시지 전송 요청:', { chatRoomId: id, userId, messageLength: message?.length });
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: '메시지 내용이 필요합니다' });
    }
    
    // 사용자 정보 조회
    const userResult = await pool.query(`
      SELECT name FROM users WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }
    
    const senderName = userResult.rows[0].name;
    
    // 채팅방 존재 확인
    const chatRoomResult = await pool.query(`
      SELECT id FROM chat_rooms WHERE id = $1
    `, [id]);
    
    if (chatRoomResult.rows.length === 0) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다' });
    }
    
    // 메시지 저장
    const messageResult = await pool.query(`
      INSERT INTO chat_messages (
        "chatRoomId", "senderId", "senderName", message, "messageType", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, "chatRoomId", "senderId", "senderName", message, "messageType", "createdAt"
    `, [id, userId, senderName, message.trim(), messageType]);
    
    const savedMessage = messageResult.rows[0];
    
    // 채팅방의 마지막 메시지 업데이트
    await pool.query(`
      UPDATE chat_rooms 
      SET "lastMessage" = $1, "lastMessageTime" = NOW(), "updatedAt" = NOW()
      WHERE id = $2
    `, [message.trim(), id]);
    
    // Socket.IO로 실시간 메시지 브로드캐스트
    const messageData = {
      id: savedMessage.id,
      chatRoomId: savedMessage.chatRoomId,
      senderId: savedMessage.senderId,
      senderName: savedMessage.senderName,
      message: savedMessage.message,
      messageType: savedMessage.messageType,
      timestamp: savedMessage.createdAt,
      isMe: false, // 다른 클라이언트들에게는 false로 전송
      isRead: false
    };
    
    // 해당 채팅방의 모든 클라이언트에게 메시지 브로드캐스트
    io.to(`room-${id}`).emit('new-message', messageData);
    
    console.log('✅ 채팅 메시지 전송 완료:', { messageId: savedMessage.id, chatRoomId: id });
    
    res.json({
      success: true,
      data: {
        ...messageData,
        isMe: true // 발송자에게는 true로 응답
      }
    });
  } catch (error) {
    console.error('채팅 메시지 전송 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// ======================
// 포인트 API
// ======================

// 개발자 계정 확인 함수
const isDeveloperAccount = (email) => {
  const developerEmails = [
    'restapi@kakao.com',
    'developer@honbabnono.com',
    'admin@honbabnono.com'
  ];
  return developerEmails.includes(email);
};

// 포인트 충전 API
apiRouter.post('/users/charge-points', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    console.log('💰 포인트 충전 요청:', { userId, amount });

    // 사용자 정보 조회 (이메일 확인용)
    const userResult = await pool.query(`
      SELECT u.id, u.name, u.email, COALESCE(up.available_points, 0) as points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = userResult.rows[0];
    const isDevAccount = isDeveloperAccount(user.email);

    // 개발자 계정 특별 혜택
    let finalAmount = amount;
    let bonusAmount = 0;
    let maxAmount = 1000000;
    
    if (isDevAccount) {
      // 개발자 계정은 10배 보너스 + 제한 없음
      bonusAmount = amount * 9; // 10배가 되도록 (원래 금액 + 9배 보너스)
      finalAmount = amount + bonusAmount;
      maxAmount = 100000000; // 1억원까지 충전 가능
      
      console.log('🎉 개발자 계정 특별 혜택 적용:', {
        originalAmount: amount,
        bonusAmount,
        finalAmount,
        userEmail: user.email
      });
    }

    if (!amount || amount < 1000) {
      return res.status(400).json({ 
        success: false, 
        message: '최소 충전 금액은 1,000원입니다.' 
      });
    }

    if (amount > maxAmount) {
      return res.status(400).json({ 
        success: false, 
        message: isDevAccount ? 
          '개발자 계정 최대 충전 금액은 100,000,000원입니다.' :
          '최대 충전 금액은 1,000,000원입니다.' 
      });
    }

    const newPoints = (user.points || 0) + finalAmount;

    // user_points 테이블에 포인트 업데이트 또는 생성
    await pool.query(`
      INSERT INTO user_points (id, user_id, total_points, available_points, used_points, expired_points, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $2, 0, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET 
        total_points = user_points.total_points + $3,
        available_points = user_points.available_points + $3,
        updated_at = NOW()
    `, [userId, newPoints, finalAmount]);

    // 포인트 충전 기록 저장 (point_transactions 테이블이 있다면)
    try {
      await pool.query(`
        INSERT INTO point_transactions (user_id, amount, type, description, created_at)
        VALUES ($1, $2, 'charge', $3, NOW())
      `, [userId, finalAmount, isDevAccount ? '개발자 계정 보너스 충전' : '포인트 충전']);
    } catch (transactionError) {
      console.log('포인트 거래 기록 테이블이 없거나 오류:', transactionError.message);
      // 테이블이 없어도 충전은 계속 진행
    }

    console.log('✅ 포인트 충전 완료:', { 
      userId, 
      originalAmount: amount,
      bonusAmount,
      finalAmount,
      previousPoints: user.points || 0, 
      newPoints,
      isDeveloperAccount: isDevAccount
    });

    let message = `${finalAmount.toLocaleString()}원이 충전되었습니다.`;
    if (isDevAccount && bonusAmount > 0) {
      message = `개발자 혜택! ${amount.toLocaleString()}원 충전 + ${bonusAmount.toLocaleString()}원 보너스 = 총 ${finalAmount.toLocaleString()}원이 충전되었습니다! 🎉`;
    }

    res.json({
      success: true,
      data: {
        userId,
        amount: finalAmount,
        previousPoints: user.points || 0,
        newPoints,
        message,
        isDeveloperAccount: isDevAccount,
        bonusAmount: bonusAmount || 0
      }
    });

  } catch (error) {
    console.error('포인트 충전 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '포인트 충전 중 오류가 발생했습니다.' 
    });
  }
});

// 포인트 사용 API
apiRouter.post('/users/use-points', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const userId = req.user.userId;

    console.log('💸 포인트 사용 요청:', { userId, amount, description });

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: '올바른 사용 금액을 입력해주세요.' 
      });
    }

    // 사용자 포인트 조회
    const userResult = await pool.query(`
      SELECT u.id, u.name, COALESCE(up.available_points, 0) as points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = userResult.rows[0];
    const currentPoints = user.points || 0;

    if (currentPoints < amount) {
      return res.status(400).json({ 
        success: false, 
        message: '포인트가 부족합니다.' 
      });
    }

    const newPoints = currentPoints - amount;

    // user_points 테이블에서 포인트 차감
    await pool.query(`
      UPDATE user_points 
      SET available_points = available_points - $1,
          used_points = used_points + $1,
          updated_at = NOW()
      WHERE user_id = $2
    `, [amount, userId]);

    // 포인트 사용 기록 저장
    try {
      await pool.query(`
        INSERT INTO point_transactions (user_id, amount, type, description, created_at)
        VALUES ($1, $2, 'use', $3, NOW())
      `, [userId, -amount, description || '포인트 사용']);
    } catch (transactionError) {
      console.log('포인트 거래 기록 테이블이 없거나 오류:', transactionError.message);
    }

    console.log('✅ 포인트 사용 완료:', { 
      userId, 
      amount, 
      previousPoints: currentPoints, 
      newPoints 
    });

    res.json({
      success: true,
      data: {
        userId,
        amount,
        previousPoints: currentPoints,
        newPoints,
        message: `${amount.toLocaleString()}원이 사용되었습니다.`
      }
    });

  } catch (error) {
    console.error('포인트 사용 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '포인트 사용 중 오류가 발생했습니다.' 
    });
  }
});

// 포인트 잔액 조회 API
apiRouter.get('/users/points', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('💰 포인트 잔액 조회 요청:', { userId });

    const userResult = await pool.query(`
      SELECT u.id, u.name, COALESCE(up.available_points, 0) as points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = userResult.rows[0];
    console.log('✅ 포인트 조회 성공:', { userId: user.id, name: user.name, points: user.points });

    const responseData = {
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        points: user.points || 0
      }
    };
    
    console.log('📤 포인트 응답 데이터:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('포인트 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '포인트 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 포인트 환불 API (모임 취소 시)
apiRouter.post('/users/refund-points', authenticateToken, async (req, res) => {
  try {
    const { amount, description, meetupId } = req.body;
    const userId = req.user.userId;

    console.log('💰 포인트 환불 요청:', { userId, amount, description, meetupId });

    // 사용자 존재 확인
    const userResult = await pool.query(`
      SELECT u.id, COALESCE(up.available_points, 0) as points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    // user_points 테이블에서 포인트 환불 (추가)
    await pool.query(`
      INSERT INTO user_points (id, user_id, total_points, available_points, used_points, expired_points, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $2, 0, 0, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET 
        total_points = user_points.total_points + $2,
        available_points = user_points.available_points + $2,
        updated_at = NOW()
    `, [userId, amount]);

    // 포인트 거래 내역 기록
    await pool.query(`
      INSERT INTO point_transactions (id, user_id, amount, type, description, meetup_id, created_at)
      VALUES (gen_random_uuid(), $1, $2, 'refund', $3, $4, NOW())
    `, [userId, amount, description, meetupId]);

    console.log('✅ 포인트 환불 완료:', { userId, amount });

    // 업데이트된 포인트 조회
    const updatedUserResult = await pool.query(`
      SELECT available_points as points FROM user_points WHERE user_id = $1
    `, [userId]);

    res.json({
      success: true,
      message: '포인트가 환불되었습니다.',
      data: {
        refundedAmount: amount,
        newBalance: updatedUserResult.rows[0].points
      }
    });

  } catch (error) {
    console.error('포인트 환불 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '포인트 환불 중 오류가 발생했습니다.' 
    });
  }
});

// ======================
// 리뷰 API
// ======================

// 모임에 대한 리뷰 작성
apiRouter.post('/meetups/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { rating, comment, tags } = req.body;
    const userId = req.user.userId;
    
    console.log('✍️ 리뷰 작성 요청:', { meetupId, userId, rating });
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: '평점은 1-5 사이의 값이어야 합니다' });
    }
    
    // 모임 존재 확인
    const meetupResult = await pool.query(`
      SELECT id, title, host_id, date FROM meetups WHERE id = $1
    `, [meetupId]);
    
    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }
    
    const meetup = meetupResult.rows[0];
    
    // 모임이 완료되었는지 확인 (과거 날짜)
    if (new Date(meetup.date) > new Date()) {
      return res.status(400).json({ error: '완료된 모임에만 리뷰를 작성할 수 있습니다' });
    }
    
    // 사용자가 해당 모임에 참가했는지 확인
    const participantResult = await pool.query(`
      SELECT id FROM meetup_participants 
      WHERE meetup_id = $1 AND user_id = $2 AND status = '참가승인'
    `, [meetupId, userId]);
    
    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: '참가한 모임에만 리뷰를 작성할 수 있습니다' });
    }
    
    // 이미 리뷰를 작성했는지 확인
    const existingReviewResult = await pool.query(`
      SELECT id FROM reviews WHERE meetup_id = $1 AND reviewer_id = $2
    `, [meetupId, userId]);
    
    if (existingReviewResult.rows.length > 0) {
      return res.status(400).json({ error: '이미 리뷰를 작성하셨습니다' });
    }
    
    // 사용자 정보 조회
    const userResult = await pool.query(`
      SELECT name FROM users WHERE id = $1
    `, [userId]);
    
    const reviewerName = userResult.rows[0]?.name || '익명';
    
    // 리뷰 저장
    const reviewResult = await pool.query(`
      INSERT INTO reviews (
        meetup_id, reviewer_id, reviewer_name, rating, comment, tags, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, meetup_id, reviewer_id, reviewer_name, rating, comment, tags, created_at
    `, [meetupId, userId, reviewerName, rating, comment || '', JSON.stringify(tags || [])]);
    
    const review = reviewResult.rows[0];
    
    // 호스트의 평균 평점 업데이트
    const avgRatingResult = await pool.query(`
      SELECT AVG(r.rating) as avg_rating, COUNT(r.id) as review_count
      FROM reviews r
      JOIN meetups m ON r.meetup_id = m.id
      WHERE m.host_id = $1
    `, [meetup.host_id]);
    
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;
    
    await pool.query(`
      UPDATE users 
      SET rating = $1, updated_at = NOW()
      WHERE id = $2
    `, [avgRating, meetup.host_id]);
    
    console.log('✅ 리뷰 작성 완료:', { reviewId: review.id, rating, avgRating });
    
    res.status(201).json({
      success: true,
      data: {
        ...review,
        tags: JSON.parse(review.tags)
      }
    });
  } catch (error) {
    console.error('리뷰 작성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 모임의 리뷰 목록 조회
apiRouter.get('/meetups/:id/reviews', async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('📝 리뷰 목록 조회 요청:', { meetupId, page, limit });
    
    // 리뷰 목록 조회
    const reviewsResult = await pool.query(`
      SELECT 
        r.id,
        r.meetup_id,
        r.reviewer_id,
        r.reviewer_name,
        r.rating,
        r.comment,
        r.tags,
        r.created_at,
        u.profile_image as reviewer_profile_image
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.meetup_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [meetupId, parseInt(limit), parseInt(offset)]);
    
    // 총 개수 조회
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM reviews WHERE meetup_id = $1
    `, [meetupId]);
    
    // 평균 평점 계산
    const avgRatingResult = await pool.query(`
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as review_count
      FROM reviews 
      WHERE meetup_id = $1
    `, [meetupId]);
    
    const reviews = reviewsResult.rows.map(review => ({
      ...review,
      tags: JSON.parse(review.tags || '[]')
    }));
    
    const total = parseInt(countResult.rows[0].total);
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;
    const reviewCount = parseInt(avgRatingResult.rows[0].review_count);
    
    console.log('✅ 리뷰 목록 조회 성공:', { count: reviews.length, avgRating, reviewCount });
    
    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          averageRating: avgRating,
          totalReviews: reviewCount
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 사용자가 작성한 리뷰 목록 조회
apiRouter.get('/user/reviews', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    
    console.log('👤 사용자 리뷰 목록 조회 요청:', { userId, page, limit });
    
    // 사용자가 작성한 리뷰 목록 조회
    const reviewsResult = await pool.query(`
      SELECT 
        r.id,
        r.meetup_id,
        r.rating,
        r.comment,
        r.tags,
        r.created_at,
        m.title as meetup_title,
        m.date as meetup_date,
        m.location as meetup_location,
        m.category as meetup_category
      FROM reviews r
      JOIN meetups m ON r.meetup_id = m.id
      WHERE r.reviewer_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    // 총 개수 조회
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM reviews WHERE reviewer_id = $1
    `, [userId]);
    
    const reviews = reviewsResult.rows.map(review => ({
      ...review,
      tags: JSON.parse(review.tags || '[]')
    }));
    
    const total = parseInt(countResult.rows[0].total);
    
    console.log('✅ 사용자 리뷰 목록 조회 성공:', { count: reviews.length, total });
    
    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('사용자 리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// ======================
// 내활동 API
// ======================

// 내가 호스팅한 모임 목록 조회
apiRouter.get('/user/hosted-meetups', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    
    console.log('🏠 호스팅 모임 조회 요청:', { userId, page, limit });
    
    // 내가 호스팅한 모임 목록 조회
    const meetupsResult = await pool.query(`
      SELECT 
        m.id,
        m.title,
        m.description,
        m.location,
        m.date,
        m.time,
        m.max_participants as "maxParticipants",
        m.current_participants as "currentParticipants",
        m.category,
        m.status,
        m.created_at as "createdAt"
      FROM meetups m
      WHERE m.host_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    // 총 개수 조회
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM meetups WHERE host_id = $1
    `, [userId]);
    
    const total = parseInt(countResult.rows[0].total);
    
    console.log('✅ 호스팅 모임 조회 성공:', { count: meetupsResult.rows.length, total });
    
    res.json({
      success: true,
      data: meetupsResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('호스팅 모임 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 내 모임 목록 조회 (통합 엔드포인트)
apiRouter.get('/my-meetups', authenticateToken, async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    
    console.log('📱 내 모임 조회 요청:', { userId, type, page, limit });
    
    let query;
    let params;
    
    if (type === 'hosted') {
      // 호스팅한 모임만
      query = `
        SELECT 
          m.id,
          m.title,
          m.description,
          m.location,
          m.date,
          m.time,
          m.max_participants as "maxParticipants",
          m.current_participants as "currentParticipants",
          m.category,
          m.status,
          m.created_at as "createdAt",
          'hosted' as type
        FROM meetups m
        WHERE m.host_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, parseInt(limit), parseInt(offset)];
    } else if (type === 'joined') {
      // 참가한 모임만
      query = `
        SELECT 
          m.id,
          m.title,
          m.description,
          m.location,
          m.date,
          m.time,
          m.max_participants as "maxParticipants",
          m.current_participants as "currentParticipants",
          m.category,
          m.status,
          m.created_at as "createdAt",
          mp.status as "participationStatus",
          mp.created_at as "joinedAt",
          u.name as "hostName",
          'joined' as type
        FROM meetup_participants mp
        JOIN meetups m ON mp.meetup_id = m.id
        JOIN users u ON m.host_id = u.id
        WHERE mp.user_id = $1 AND m.host_id != $1
        ORDER BY mp.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, parseInt(limit), parseInt(offset)];
    } else {
      // 모든 모임 (호스팅 + 참가)
      query = `
        (SELECT 
          m.id,
          m.title,
          m.description,
          m.location,
          m.date,
          m.time,
          m.max_participants as "maxParticipants",
          m.current_participants as "currentParticipants",
          m.category,
          m.status,
          m.created_at as "createdAt",
          null as "participationStatus",
          null as "joinedAt",
          null as "hostName",
          'hosted' as type
        FROM meetups m
        WHERE m.host_id = $1)
        UNION ALL
        (SELECT 
          m.id,
          m.title,
          m.description,
          m.location,
          m.date,
          m.time,
          m.max_participants as "maxParticipants",
          m.current_participants as "currentParticipants",
          m.category,
          m.status,
          m.created_at as "createdAt",
          mp.status as "participationStatus",
          mp.created_at as "joinedAt",
          u.name as "hostName",
          'joined' as type
        FROM meetup_participants mp
        JOIN meetups m ON mp.meetup_id = m.id
        JOIN users u ON m.host_id = u.id
        WHERE mp.user_id = $1 AND m.host_id != $1)
        ORDER BY "createdAt" DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, parseInt(limit), parseInt(offset)];
    }
    
    const meetupsResult = await pool.query(query, params);
    
    console.log('✅ 내 모임 조회 성공:', { count: meetupsResult.rows.length, type });
    
    res.json({
      success: true,
      data: meetupsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: meetupsResult.rows.length
      }
    });
  } catch (error) {
    console.error('❌ 내 모임 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 내가 참가한 모임 목록 조회
apiRouter.get('/user/joined-meetups', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.userId;
    
    console.log('👥 참가 모임 조회 요청:', { userId, page, limit });
    
    // 내가 참가한 모임 목록 조회 (호스팅한 모임 제외)
    const meetupsResult = await pool.query(`
      SELECT 
        m.id,
        m.title,
        m.description,
        m.location,
        m.date,
        m.time,
        m.max_participants as "maxParticipants",
        m.current_participants as "currentParticipants",
        m.category,
        m.status,
        m.created_at as "createdAt",
        mp.status as "participationStatus",
        mp.created_at as "joinedAt",
        u.name as "hostName"
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      JOIN users u ON m.host_id = u.id
      WHERE mp.user_id = $1 AND m.host_id != $1
      ORDER BY mp.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    // 총 개수 조회
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.user_id = $1 AND m.host_id != $1
    `, [userId]);
    
    const total = parseInt(countResult.rows[0].total);
    
    console.log('✅ 참가 모임 조회 성공:', { count: meetupsResult.rows.length, total });
    
    res.json({
      success: true,
      data: meetupsResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('참가 모임 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 내활동 통계 조회
apiRouter.get('/user/activity-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📊 활동 통계 조회 요청:', { userId });
    
    // 호스팅한 모임 수
    const hostedResult = await pool.query(`
      SELECT COUNT(*) as count FROM meetups WHERE host_id = $1
    `, [userId]);
    
    // 참가한 모임 수 (호스팅한 모임 포함)
    const joinedResult = await pool.query(`
      SELECT COUNT(*) as count FROM meetup_participants WHERE user_id = $1
    `, [userId]);
    
    // 완료된 모임 수 (과거 날짜의 모임)
    const completedResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.user_id = $1 AND m.date < CURRENT_DATE
    `, [userId]);
    
    // 이번 달 참가 예정 모임 수
    const thisMonthResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.user_id = $1 
        AND m.date >= CURRENT_DATE 
        AND m.date < (CURRENT_DATE + INTERVAL '1 month')
    `, [userId]);
    
    const stats = {
      hostedMeetups: parseInt(hostedResult.rows[0].count),
      joinedMeetups: parseInt(joinedResult.rows[0].count),
      completedMeetups: parseInt(completedResult.rows[0].count),
      upcomingMeetups: parseInt(thisMonthResult.rows[0].count)
    };
    
    console.log('✅ 활동 통계 조회 성공:', stats);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('활동 통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 밥알지수 계산 API
apiRouter.get('/user/rice-index', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🍚 밥알지수 계산 요청:', { userId });

    // 사용자 활동 데이터 조회 (activity-stats와 동일한 로직 사용)
    const [
      hostedResult,
      joinedResult,
      completedResult,
      reviews,
      averageRating
    ] = await Promise.all([
      // 호스팅한 모임 수
      pool.query(`
        SELECT COUNT(*) as count 
        FROM meetups 
        WHERE host_id = $1
      `, [userId]),
      
      // 참가한 모임 수 (호스트로 참여한 것 제외)
      pool.query(`
        SELECT COUNT(*) as count 
        FROM meetup_participants mp
        JOIN meetups m ON mp.meetup_id = m.id
        WHERE mp.user_id = $1 AND m.host_id != $2
      `, [userId, userId]),
      
      // 과거 모임 참가 수 (완료된 모임)
      pool.query(`
        SELECT COUNT(*) as count 
        FROM meetup_participants mp
        JOIN meetups m ON mp.meetup_id = m.id
        WHERE mp.user_id = $1 AND m.date < CURRENT_DATE
      `, [userId]),
      
      // 작성한 리뷰 수
      pool.query(`
        SELECT COUNT(*) as count 
        FROM reviews 
        WHERE reviewer_id = $1
      `, [userId]),
      
      // 받은 평균 평점 (호스트로서)
      pool.query(`
        SELECT AVG(r.rating) as avg_rating 
        FROM reviews r 
        JOIN meetups m ON r.meetup_id = m.id 
        WHERE m.host_id = $1
      `, [userId])
    ]);

    const stats = {
      joinedMeetups: parseInt(joinedResult.rows[0].count),
      hostedMeetups: parseInt(hostedResult.rows[0].count),
      completedMeetups: parseInt(completedResult.rows[0].count),
      reviewsWritten: parseInt(reviews.rows[0].count),
      averageRating: parseFloat(averageRating.rows[0].avg_rating || 0)
    };

    // 사용자의 저장된 밥알지수 조회 (자동 계산 대신 저장된 값 사용)
    const userResult = await pool.query(`
      SELECT babal_score FROM users WHERE id = $1
    `, [userId]);
    
    let riceIndex = userResult.rows[0]?.babal_score || 40.0; // 기본 점수

    // 밥알지수 레벨 계산
    const getRiceLevel = (score) => {
      if (score >= 98.1) {
        return {
          level: "밥神 (밥신)",
          emoji: "🍚🍚🍚🍚🍚🍚🍚",
          description: "전설적인 유저",
          color: "#FFD700" // 금색
        };
      } else if (score >= 90.0) {
        return {
          level: "찰밥대장",
          emoji: "🍚🍚🍚🍚🍚🍚",
          description: "거의 완벽한 활동 이력",
          color: "#FF6B35" // 주황색
        };
      } else if (score >= 80.0) {
        return {
          level: "밥도둑 밥상",
          emoji: "🍚🍚🍚🍚🍚",
          description: "상위권, 최고의 매너 보유",
          color: "#F7931E" // 오렌지
        };
      } else if (score >= 70.0) {
        return {
          level: "고봉밥",
          emoji: "🍚🍚🍚🍚",
          description: "후기 품질도 높고 꾸준한 출석",
          color: "#4CAF50" // 초록색
        };
      } else if (score >= 60.0) {
        return {
          level: "따끈한 밥그릇",
          emoji: "🍚🍚🍚",
          description: "후기와 출석률 모두 양호",
          color: "#2196F3" // 파란색
        };
      } else if (score >= 40.0) {
        return {
          level: "밥 한 숟갈",
          emoji: "🍚",
          description: "일반 유저, 평균적인 활동",
          color: "#9E9E9E" // 회색
        };
      } else {
        return {
          level: "티스푼",
          emoji: "🍚🍚",
          description: "반복된 신고/노쇼, 신뢰 낮음",
          color: "#F44336" // 빨간색
        };
      }
    };

    const levelInfo = getRiceLevel(riceIndex);

    console.log('✅ 밥알지수 계산 완료:', {
      userId,
      stats,
      calculatedIndex: riceIndex,
      level: levelInfo
    });

    res.json({
      success: true,
      riceIndex,
      level: levelInfo,
      stats
    });

  } catch (error) {
    console.error('❌ 밥알지수 계산 실패:', error);
    res.status(500).json({ 
      success: false, 
      error: '밥알지수를 계산할 수 없습니다.' 
    });
  }
});

// ===========================================
// 마이페이지 상세 기능 API들
// ===========================================

// 1. 프로필 관리 API
// 프로필 정보 수정
apiRouter.put('/user/profile', authenticateToken, async (req, res) => {
  try {
    console.log('👤 프로필 수정 요청:', req.body);
    const { name, email, profile_image } = req.body;
    const userId = req.userId;

    // 입력 검증
    if (!name && !email && !profile_image) {
      return res.status(400).json({
        success: false,
        error: '수정할 정보를 입력해주세요.'
      });
    }

    // 이메일 중복 검사 (이메일이 변경된 경우)
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 사용 중인 이메일입니다.'
        });
      }
    }

    // 업데이트할 필드들 동적으로 구성
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;

    if (name) {
      updateFields.push(`name = $${valueIndex}`);
      updateValues.push(name);
      valueIndex++;
    }
    if (email) {
      updateFields.push(`email = $${valueIndex}`);
      updateValues.push(email);
      valueIndex++;
    }
    if (profile_image) {
      updateFields.push(`profile_image = $${valueIndex}`);
      updateValues.push(profile_image);
      valueIndex++;
    }

    updateFields.push(`updated_at = $${valueIndex}`);
    updateValues.push(new Date());
    valueIndex++;

    updateValues.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING id, email, name, profile_image, provider, is_verified, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    console.log('✅ 프로필 수정 성공');
    res.json({
      success: true,
      message: '프로필이 성공적으로 수정되었습니다.',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ 프로필 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: '프로필 수정 중 오류가 발생했습니다.'
    });
  }
});

// 비밀번호 변경 (이메일 로그인 사용자만)
apiRouter.put('/user/password', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 비밀번호 변경 요청');
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '새 비밀번호는 6자 이상이어야 합니다.'
      });
    }

    // 사용자 정보 조회
    const userResult = await pool.query(
      'SELECT password, provider FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    // 소셜 로그인 사용자는 비밀번호 변경 불가
    if (user.provider !== 'email') {
      return res.status(400).json({
        success: false,
        error: '소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.'
      });
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '현재 비밀번호가 올바르지 않습니다.'
      });
    }

    // 새 비밀번호 해시화
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await pool.query(
      'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3',
      [hashedNewPassword, new Date(), userId]
    );

    console.log('✅ 비밀번호 변경 성공');
    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('❌ 비밀번호 변경 실패:', error);
    res.status(500).json({
      success: false,
      error: '비밀번호 변경 중 오류가 발생했습니다.'
    });
  }
});

// 2. 알림 설정 API
// 알림 설정 조회
apiRouter.get('/user/notification-settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 알림 설정 조회 요청');
    const userId = req.userId;

    const result = await pool.query(`
      SELECT 
        push_notifications,
        email_notifications,
        meetup_reminders,
        chat_notifications,
        marketing_notifications,
        updated_at
      FROM user_notification_settings 
      WHERE user_id = $1
    `, [userId]);

    let settings;
    if (result.rows.length === 0) {
      // 기본 설정으로 생성
      const defaultSettings = {
        push_notifications: true,
        email_notifications: true,
        meetup_reminders: true,
        chat_notifications: true,
        marketing_notifications: false
      };

      await pool.query(`
        INSERT INTO user_notification_settings 
        (user_id, push_notifications, email_notifications, meetup_reminders, chat_notifications, marketing_notifications)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, defaultSettings.push_notifications, defaultSettings.email_notifications, 
          defaultSettings.meetup_reminders, defaultSettings.chat_notifications, defaultSettings.marketing_notifications]);

      settings = defaultSettings;
    } else {
      settings = result.rows[0];
    }

    console.log('✅ 알림 설정 조회 성공');
    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('❌ 알림 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 설정 조회 중 오류가 발생했습니다.'
    });
  }
});

// 알림 설정 업데이트
apiRouter.put('/user/notification-settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 알림 설정 업데이트 요청:', req.body);
    const userId = req.userId;
    const {
      push_notifications,
      email_notifications,
      meetup_reminders,
      chat_notifications,
      marketing_notifications
    } = req.body;

    // 설정이 존재하는지 확인
    const existingSettings = await pool.query(
      'SELECT user_id FROM user_notification_settings WHERE user_id = $1',
      [userId]
    );

    if (existingSettings.rows.length === 0) {
      // 새로 생성
      await pool.query(`
        INSERT INTO user_notification_settings 
        (user_id, push_notifications, email_notifications, meetup_reminders, chat_notifications, marketing_notifications)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, push_notifications ?? true, email_notifications ?? true, 
          meetup_reminders ?? true, chat_notifications ?? true, marketing_notifications ?? false]);
    } else {
      // 업데이트할 필드들 동적으로 구성
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;

      if (push_notifications !== undefined) {
        updateFields.push(`push_notifications = $${valueIndex}`);
        updateValues.push(push_notifications);
        valueIndex++;
      }
      if (email_notifications !== undefined) {
        updateFields.push(`email_notifications = $${valueIndex}`);
        updateValues.push(email_notifications);
        valueIndex++;
      }
      if (meetup_reminders !== undefined) {
        updateFields.push(`meetup_reminders = $${valueIndex}`);
        updateValues.push(meetup_reminders);
        valueIndex++;
      }
      if (chat_notifications !== undefined) {
        updateFields.push(`chat_notifications = $${valueIndex}`);
        updateValues.push(chat_notifications);
        valueIndex++;
      }
      if (marketing_notifications !== undefined) {
        updateFields.push(`marketing_notifications = $${valueIndex}`);
        updateValues.push(marketing_notifications);
        valueIndex++;
      }

      updateFields.push(`updated_at = $${valueIndex}`);
      updateValues.push(new Date());
      valueIndex++;

      updateValues.push(userId);

      if (updateFields.length > 1) { // updated_at 외에 다른 필드가 있는 경우만
        const updateQuery = `
          UPDATE user_notification_settings 
          SET ${updateFields.join(', ')}
          WHERE user_id = $${valueIndex}
        `;
        await pool.query(updateQuery, updateValues);
      }
    }

    console.log('✅ 알림 설정 업데이트 성공');
    res.json({
      success: true,
      message: '알림 설정이 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('❌ 알림 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: '알림 설정 업데이트 중 오류가 발생했습니다.'
    });
  }
});

// 3. 개인정보 관리 API
// 개인정보 내보내기
apiRouter.get('/user/data-export', authenticateToken, async (req, res) => {
  try {
    console.log('📁 개인정보 내보내기 요청');
    const userId = req.userId;

    // 사용자 기본 정보
    const userResult = await pool.query(`
      SELECT id, email, name, profile_image, provider, is_verified, created_at, updated_at
      FROM users WHERE id = $1
    `, [userId]);

    // 참여한 모임들
    const meetupsResult = await pool.query(`
      SELECT m.title, m.description, m.location, m.date, m.time, m.category, mp.status, mp.joined_at
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.user_id = $1
      ORDER BY mp.joined_at DESC
    `, [userId]);

    // 호스팅한 모임들
    const hostedMeetupsResult = await pool.query(`
      SELECT title, description, location, date, time, category, status, created_at
      FROM meetups WHERE host_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    // 작성한 리뷰들
    const reviewsResult = await pool.query(`
      SELECT r.rating, r.comment, r.tags, r.created_at, m.title as meetup_title
      FROM reviews r
      JOIN meetups m ON r.meetup_id = m.id
      WHERE r.reviewer_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    // 알림 설정
    const notificationResult = await pool.query(`
      SELECT push_notifications, email_notifications, meetup_reminders, chat_notifications, marketing_notifications
      FROM user_notification_settings WHERE user_id = $1
    `, [userId]);

    const exportData = {
      user_info: userResult.rows[0],
      joined_meetups: meetupsResult.rows,
      hosted_meetups: hostedMeetupsResult.rows,
      reviews: reviewsResult.rows,
      notification_settings: notificationResult.rows[0] || null,
      exported_at: new Date().toISOString()
    };

    console.log('✅ 개인정보 내보내기 성공');
    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('❌ 개인정보 내보내기 실패:', error);
    res.status(500).json({
      success: false,
      error: '개인정보 내보내기 중 오류가 발생했습니다.'
    });
  }
});

// 계정 탈퇴
apiRouter.delete('/user/account', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ 계정 탈퇴 요청');
    const userId = req.userId;
    const { password, reason } = req.body;

    // 사용자 정보 조회
    const userResult = await pool.query(
      'SELECT password, provider, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    // 이메일 로그인 사용자인 경우 비밀번호 확인
    if (user.provider === 'email' && password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          error: '비밀번호가 올바르지 않습니다.'
        });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 탈퇴 로그 기록
      await client.query(`
        INSERT INTO user_deletion_logs (user_id, email, reason, deleted_at)
        VALUES ($1, $2, $3, $4)
      `, [userId, user.email, reason || '', new Date()]);

      // 관련 데이터 삭제 (참조 무결성 고려)
      await client.query('DELETE FROM chat_participants WHERE "userId" = $1', [userId]);
      await client.query('DELETE FROM meetup_participants WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM reviews WHERE reviewer_id = $1', [userId]);
      await client.query('DELETE FROM user_notification_settings WHERE user_id = $1', [userId]);
      
      // 호스팅한 모임들 상태 변경 (삭제하지 않고 비활성화)
      await client.query(
        'UPDATE meetups SET status = $1, updated_at = $2 WHERE host_id = $3',
        ['취소', new Date(), userId]
      );

      // 사용자 계정 삭제
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      console.log('✅ 계정 탈퇴 성공');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: '계정이 성공적으로 탈퇴되었습니다.'
    });

  } catch (error) {
    console.error('❌ 계정 탈퇴 실패:', error);
    res.status(500).json({
      success: false,
      error: '계정 탈퇴 중 오류가 발생했습니다.'
    });
  }
});

// 4. 도움말 및 지원 API
// FAQ 목록 조회
apiRouter.get('/support/faq', async (req, res) => {
  try {
    console.log('❓ FAQ 목록 조회 요청');
    const { category } = req.query;

    let query = `
      SELECT id, category, question, answer, order_index, created_at, updated_at
      FROM faq 
      WHERE is_active = true
    `;
    const queryParams = [];

    if (category) {
      query += ' AND category = $1';
      queryParams.push(category);
    }

    query += ' ORDER BY category, order_index, created_at';

    const result = await pool.query(query, queryParams);

    console.log('✅ FAQ 목록 조회 성공');
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ FAQ 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'FAQ 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 문의하기
apiRouter.post('/support/inquiry', authenticateToken, async (req, res) => {
  try {
    console.log('💬 문의 접수 요청:', req.body);
    const userId = req.userId;
    const { subject, content, category } = req.body;

    // 입력 검증
    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        error: '제목과 내용을 입력해주세요.'
      });
    }

    const result = await pool.query(`
      INSERT INTO support_inquiries (user_id, subject, content, category, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, subject, category, status, created_at
    `, [userId, subject, content, category || '일반', '접수', new Date()]);

    console.log('✅ 문의 접수 성공');
    res.json({
      success: true,
      message: '문의가 성공적으로 접수되었습니다.',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ 문의 접수 실패:', error);
    res.status(500).json({
      success: false,
      error: '문의 접수 중 오류가 발생했습니다.'
    });
  }
});

// 내 문의 내역 조회
apiRouter.get('/support/my-inquiries', authenticateToken, async (req, res) => {
  try {
    console.log('📋 내 문의 내역 조회 요청');
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 전체 개수 조회
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM support_inquiries WHERE user_id = $1',
      [userId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // 문의 내역 조회
    const result = await pool.query(`
      SELECT id, subject, content, category, status, created_at, updated_at
      FROM support_inquiries 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    console.log('✅ 내 문의 내역 조회 성공');
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('❌ 내 문의 내역 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '문의 내역 조회 중 오류가 발생했습니다.'
    });
  }
});

// 5. 이용약관 및 개인정보처리방침 API
// 이용약관 조회
apiRouter.get('/legal/terms', async (req, res) => {
  try {
    console.log('📄 이용약관 조회 요청');
    
    const result = await pool.query(`
      SELECT version, content, effective_date, created_at
      FROM terms_of_service 
      WHERE is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '이용약관을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 이용약관 조회 성공');
    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ 이용약관 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '이용약관 조회 중 오류가 발생했습니다.'
    });
  }
});

// 개인정보처리방침 조회
apiRouter.get('/legal/privacy', async (req, res) => {
  try {
    console.log('🔒 개인정보처리방침 조회 요청');
    
    const result = await pool.query(`
      SELECT version, content, effective_date, created_at
      FROM privacy_policy 
      WHERE is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '개인정보처리방침을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 개인정보처리방침 조회 성공');
    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ 개인정보처리방침 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '개인정보처리방침 조회 중 오류가 발생했습니다.'
    });
  }
});

// 404 핸들러를 임시로 주석 처리 (파일 끝으로 이동)
// apiRouter.use('*', (req, res) => {
//   res.status(404).json({
//     error: 'API 엔드포인트를 찾을 수 없습니다.',
//     path: req.path
//   });
// });

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log('📱 클라이언트 연결됨:', socket.id);
  
  // 사용자가 채팅방에 입장
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`👤 사용자가 채팅방 ${roomId}에 입장`);
  });
  
  // 사용자가 채팅방에서 퇴장
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`👤 사용자가 채팅방 ${roomId}에서 퇴장`);
  });
  
  // 메시지 전송
  socket.on('send-message', (data) => {
    console.log('💬 메시지 전송:', data);
    // 해당 채팅방의 모든 클라이언트에게 메시지 브로드캐스트
    io.to(data.roomId).emit('new-message', data);
  });
  
  // 연결 해제
  socket.on('disconnect', () => {
    console.log('📱 클라이언트 연결 해제됨:', socket.id);
  });
});

// 모임 후기 API들
// 모임 후기 작성
apiRouter.post('/meetups/:id/review', authenticateToken, async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;
    const { rating, content, images } = req.body;

    console.log('🌟 모임 후기 작성 요청:', { meetupId, userId, rating });

    // 입력값 검증
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: '평점은 1-5 사이의 값이어야 합니다.' 
      });
    }

    if (!content || content.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: '후기 내용은 최소 10자 이상 작성해주세요.' 
      });
    }

    // 모임 존재 및 참가 여부 확인
    const participantCheck = await pool.query(`
      SELECT mp.id, m.title, m.date, m.time, m.status
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.meetup_id = $1 AND mp.user_id = $2 AND mp.status = '참가승인'
    `, [meetupId, userId]);

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: '참가한 모임에만 후기를 작성할 수 있습니다.' 
      });
    }

    const meetup = participantCheck.rows[0];

    // 모임이 종료되었는지 확인
    const meetupDateTime = new Date(`${meetup.date}T${meetup.time}`);
    const now = new Date();
    if (meetupDateTime.getTime() > now.getTime()) {
      return res.status(400).json({ 
        success: false, 
        error: '종료된 모임에만 후기를 작성할 수 있습니다.' 
      });
    }

    // 이미 후기를 작성했는지 확인
    const existingReview = await pool.query(`
      SELECT id FROM meetup_reviews 
      WHERE meetup_id = $1 AND user_id = $2
    `, [meetupId, userId]);

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: '이미 이 모임에 대한 후기를 작성하셨습니다.' 
      });
    }

    // 후기 저장
    const reviewResult = await pool.query(`
      INSERT INTO meetup_reviews (
        id, meetup_id, user_id, rating, content, images, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()
      ) RETURNING *
    `, [meetupId, userId, rating, content.trim(), JSON.stringify(images || [])]);

    const review = reviewResult.rows[0];

    console.log('✅ 모임 후기 작성 성공:', review.id);

    res.status(201).json({
      success: true,
      message: '후기가 성공적으로 작성되었습니다.',
      review: {
        id: review.id,
        rating: review.rating,
        content: review.content,
        images: JSON.parse(review.images || '[]'),
        createdAt: review.created_at
      }
    });

  } catch (error) {
    console.error('모임 후기 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모임 후기 목록 조회
apiRouter.get('/meetups/:id/reviews', async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log('📝 모임 후기 목록 조회:', { meetupId, page, limit });

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 후기 목록 조회
    const reviewsResult = await pool.query(`
      SELECT 
        mr.id,
        mr.rating,
        mr.content,
        mr.images,
        mr.created_at,
        u.name as author_name,
        u.profile_image as author_profile_image
      FROM meetup_reviews mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.meetup_id = $1
      ORDER BY mr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [meetupId, parseInt(limit), offset]);

    // 전체 후기 수 조회
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM meetup_reviews WHERE meetup_id = $1
    `, [meetupId]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    // 평균 평점 계산
    const avgRatingResult = await pool.query(`
      SELECT AVG(rating)::NUMERIC(3,2) as avg_rating, COUNT(*) as review_count
      FROM meetup_reviews WHERE meetup_id = $1
    `, [meetupId]);

    const { avg_rating, review_count } = avgRatingResult.rows[0];

    const reviews = reviewsResult.rows.map(review => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      images: JSON.parse(review.images || '[]'),
      createdAt: review.created_at,
      author: {
        name: review.author_name,
        profileImage: review.author_profile_image
      }
    }));

    console.log('✅ 모임 후기 목록 조회 성공:', reviews.length, '개');

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      },
      summary: {
        averageRating: parseFloat(avg_rating) || 0,
        reviewCount: parseInt(review_count)
      }
    });

  } catch (error) {
    console.error('모임 후기 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모임 확정/취소 API
apiRouter.put('/meetups/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;
    const { action } = req.body; // 'confirm' 또는 'cancel'
    
    console.log('🎯 모임 확정/취소 요청:', { meetupId, userId, action });

    // 입력값 검증
    if (!action || !['confirm', 'cancel'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: '올바른 액션을 선택해주세요 (confirm/cancel).' 
      });
    }

    // 모임 정보 및 호스트 권한 확인
    const meetupResult = await pool.query(`
      SELECT * FROM meetups 
      WHERE id = $1 AND host_id = $2
    `, [meetupId, userId]);

    if (meetupResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '모임을 찾을 수 없거나 호스트 권한이 없습니다.' 
      });
    }

    const meetup = meetupResult.rows[0];
    let newStatus;

    if (action === 'confirm') {
      // 모임 확정
      if (meetup.status === 'confirmed') {
        return res.status(400).json({ 
          success: false, 
          error: '이미 확정된 모임입니다.' 
        });
      }
      newStatus = 'confirmed';
    } else {
      // 모임 취소
      if (meetup.status === 'cancelled') {
        return res.status(400).json({ 
          success: false, 
          error: '이미 취소된 모임입니다.' 
        });
      }
      newStatus = 'cancelled';
    }

    // 모임 상태 업데이트
    await pool.query(`
      UPDATE meetups 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [newStatus, meetupId]);

    // 취소인 경우 참가자들에게 약속금 환불 처리
    if (action === 'cancel') {
      // 참가자 목록 조회
      const participantsResult = await pool.query(`
        SELECT mp.user_id, pd.id as deposit_id, pd.amount
        FROM meetup_participants mp
        LEFT JOIN promise_deposits pd ON mp.meetup_id = pd.meetup_id AND mp.user_id = pd.user_id
        WHERE mp.meetup_id = $1 AND mp.status = '참가승인'
      `, [meetupId]);

      // 각 참가자에게 환불 처리
      for (const participant of participantsResult.rows) {
        if (participant.deposit_id && participant.amount) {
          // 포인트 환불
          await pool.query(`
            UPDATE user_points 
            SET available_points = available_points + $1,
                used_points = used_points - $1,
                updated_at = NOW()
            WHERE user_id = $2
          `, [participant.amount, participant.user_id]);

          // 환불 거래 내역 추가
          await pool.query(`
            INSERT INTO point_transactions 
            (user_id, type, amount, description, created_at, updated_at)
            VALUES ($1, 'earned', $2, '모임 취소로 인한 약속금 환불: ${meetup.title}', NOW(), NOW())
          `, [participant.user_id, participant.amount]);

          // 약속금 상태 업데이트
          await pool.query(`
            UPDATE promise_deposits 
            SET status = 'refunded', updated_at = NOW()
            WHERE id = $1
          `, [participant.deposit_id]);
        }
      }
    }

    console.log('✅ 모임 확정/취소 성공:', { meetupId, action, newStatus });

    res.json({
      success: true,
      message: action === 'confirm' ? '모임이 확정되었습니다.' : '모임이 취소되었습니다.',
      status: newStatus
    });

  } catch (error) {
    console.error('❌ 모임 확정/취소 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// 모임 위치 인증
apiRouter.post('/meetups/:id/verify-location', authenticateToken, async (req, res) => {
  try {
    const { id: meetupId } = req.params;
    const userId = req.user.userId;
    const { latitude, longitude, accuracy } = req.body;

    console.log('📍 모임 위치 인증 요청:', { meetupId, userId, latitude, longitude });

    // 입력값 검증
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: '위치 정보가 필요합니다.' 
      });
    }

    // 모임 정보 및 참가 여부 확인
    const meetupResult = await pool.query(`
      SELECT m.*, mp.id as participant_id
      FROM meetups m
      JOIN meetup_participants mp ON m.id = mp.meetup_id
      WHERE m.id = $1 AND mp.user_id = $2 AND mp.status = '참가승인'
    `, [meetupId, userId]);

    if (meetupResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: '참가 승인된 모임만 위치 인증이 가능합니다.' 
      });
    }

    const meetup = meetupResult.rows[0];

    // 거리 계산 (하버사인 공식)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // 지구 반지름 (미터)
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    // 모임 장소 좌표 (임시로 서울시청 좌표 사용)
    const meetupLatitude = meetup.latitude || 37.5665;
    const meetupLongitude = meetup.longitude || 126.9780;

    const distance = calculateDistance(latitude, longitude, meetupLatitude, meetupLongitude);
    const maxDistance = 100; // 100미터
    const isVerified = distance <= maxDistance;

    // 위치 인증 기록 저장
    await pool.query(`
      INSERT INTO location_verifications (
        id, meetup_id, user_id, latitude, longitude, accuracy, distance, verified, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
      )
    `, [meetupId, userId, latitude, longitude, accuracy, Math.round(distance), isVerified]);

    let message = '';
    if (isVerified) {
      message = `모임 장소 인증 성공! (${Math.round(distance)}m 거리)`;
    } else {
      message = `모임 장소에서 너무 멀리 있습니다. (${Math.round(distance)}m 거리, 최대 ${maxDistance}m)`;
    }

    console.log(isVerified ? '✅ 위치 인증 성공' : '❌ 위치 인증 실패:', message);

    res.json({
      success: true,
      verified: isVerified,
      distance: Math.round(distance),
      maxDistance,
      accuracy,
      message
    });

  } catch (error) {
    console.error('모임 위치 인증 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
});

// ===========================================
// 약속금 및 포인트 시스템 API
// ===========================================

// 테스트 API
apiRouter.get('/user/test-api', (req, res) => {
  console.log('✅ 테스트 API 도달!');
  res.json({ success: true, message: '테스트 성공!' });
});

// 사용자 포인트 조회
apiRouter.get('/user/points', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🎁 포인트 조회 요청:', { userId });

    // user_points 테이블에서 포인트 정보 조회
    const userResult = await pool.query(`
      SELECT u.id, u.name, u.email, 
             COALESCE(up.total_points, 0) as total_points,
             COALESCE(up.available_points, 0) as available_points,
             COALESCE(up.used_points, 0) as used_points,
             COALESCE(up.expired_points, 0) as expired_points
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];
    const userPoints = user.available_points || 0;

    console.log('✅ 포인트 조회 성공:', { userId, points: userPoints });

    res.json({
      success: true,
      data: {
        id: user.id,
        userId: user.id,
        totalPoints: user.total_points,
        availablePoints: user.available_points,
        usedPoints: user.used_points,
        expiredPoints: user.expired_points,
        lastUpdatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 포인트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '포인트 정보를 조회할 수 없습니다.'
    });
  }
});

// 포인트 내역 조회
apiRouter.get('/user/point-transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('📋 포인트 내역 조회 요청:', { userId, page, limit });

    const transactionsResult = await pool.query(`
      SELECT * FROM point_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM point_transactions WHERE user_id = $1
    `, [userId]);

    const total = parseInt(countResult.rows[0].total);

    console.log('✅ 포인트 내역 조회 성공:', transactionsResult.rows.length);

    res.json({
      success: true,
      data: transactionsResult.rows.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        expiryDate: tx.expiry_date,
        relatedDepositId: tx.related_deposit_id,
        createdAt: tx.created_at
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ 포인트 내역 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '포인트 내역을 조회할 수 없습니다.'
    });
  }
});

// 약속금 결제 (Mock 구현)
apiRouter.post('/deposits/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, meetupId, paymentMethod } = req.body;

    console.log('💳 약속금 결제 요청:', { userId, amount, meetupId, paymentMethod });

    // 입력값 검증
    if (!amount || !meetupId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 실제 meetupId가 아닌 임시 ID인 경우 임시 meetup 생성
    const isTemporaryMeetupId = meetupId.startsWith('temp-');
    let actualMeetupId = meetupId;
    
    if (isTemporaryMeetupId) {
      // 임시 meetup 레코드 생성 (약속금 결제를 위한 placeholder)
      const tempMeetupResult = await pool.query(`
        INSERT INTO meetups (
          id, title, description, location, date, time, 
          max_participants, category, host_id, status,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '임시 모임 (결제 진행 중)', '모임 생성 진행 중', '미정', 
          CURRENT_DATE + INTERVAL '1 day', '12:00:00',
          2, '기타', $1, '모집중',
          NOW(), NOW()
        ) RETURNING id
      `, [userId]);
      
      actualMeetupId = tempMeetupResult.rows[0].id;
      console.log('🎫 임시 meetup 생성:', actualMeetupId);
    } else {
      // 이미 결제한 약속금이 있는지 확인 (실제 모임ID인 경우에만)
      const existingDeposit = await pool.query(`
        SELECT id FROM promise_deposits 
        WHERE meetup_id = $1 AND user_id = $2
      `, [meetupId, userId]);

      if (existingDeposit.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 해당 모임의 약속금을 결제하셨습니다.'
        });
      }
    }

    let paymentId;
    let redirectUrl;

    // 결제 방법별 처리 (Mock)
    switch (paymentMethod) {
      case 'kakaopay':
        paymentId = `kakao_${Date.now()}`;
        redirectUrl = `https://mockup-kakaopay.com/pay?amount=${amount}`;
        break;
      case 'card':
        paymentId = `card_${Date.now()}`;
        break;
      case 'points':
        // 포인트 잔액 확인
        const pointsResult = await pool.query(`
          SELECT available_points FROM user_points WHERE user_id = $1
        `, [userId]);
        
        if (pointsResult.rows.length === 0 || pointsResult.rows[0].available_points < amount) {
          return res.status(400).json({
            success: false,
            error: '보유 포인트가 부족합니다.'
          });
        }

        // 포인트 차감
        await pool.query(`
          UPDATE user_points 
          SET available_points = available_points - $1,
              used_points = used_points + $1,
              updated_at = NOW()
          WHERE user_id = $2
        `, [amount, userId]);

        // 포인트 거래 내역 추가
        const actualMeetupId = isTemporaryMeetupId ? null : meetupId;
        const description = isTemporaryMeetupId 
          ? '모임 약속금 결제 (임시 결제)'
          : `모임 약속금 결제 (모임 ID: ${meetupId})`;
        await pool.query(`
          INSERT INTO point_transactions (user_id, type, amount, description, created_at)
          VALUES ($1, 'used', $2, $3, NOW())
        `, [userId, amount, description]);

        paymentId = `points_${Date.now()}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '지원하지 않는 결제 방식입니다.'
        });
    }

    // 약속금 기록 저장 (실제 meetupId 사용)
    const depositResult = await pool.query(`
      INSERT INTO promise_deposits (
        meetup_id, user_id, amount, status, payment_method, payment_id, deposited_at, created_at, updated_at
      ) VALUES ($1, $2, $3, 'paid', $4, $5, NOW(), NOW(), NOW())
      RETURNING id
    `, [actualMeetupId, userId, amount, paymentMethod, paymentId]);

    const depositId = depositResult.rows[0].id;

    console.log('✅ 약속금 결제 완료:', { depositId, paymentId, actualMeetupId });

    res.json({
      success: true,
      paymentId: depositId,
      meetupId: actualMeetupId, // 실제 생성된 meetup ID 반환
      redirectUrl
    });

  } catch (error) {
    console.error('❌ 약속금 결제 실패:', error);
    res.status(500).json({
      success: false,
      error: '결제 처리 중 오류가 발생했습니다.'
    });
  }
});

// 약속금 환불 처리
apiRouter.post('/deposits/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { id: depositId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    console.log('💰 약속금 환불 요청:', { depositId, reason, userId });

    // 약속금 정보 조회
    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits 
      WHERE id = $1 AND user_id = $2 AND status = 'paid'
    `, [depositId, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '환불 가능한 약속금을 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];

    // 환불 금액 계산 (여기서는 100% 환불로 처리)
    const refundAmount = deposit.amount;

    // 약속금 상태 업데이트
    await pool.query(`
      UPDATE promise_deposits 
      SET status = 'refunded', 
          refund_amount = $1, 
          refund_reason = $2,
          returned_at = NOW(), 
          updated_at = NOW()
      WHERE id = $3
    `, [refundAmount, reason, depositId]);

    console.log('✅ 약속금 환불 완료:', { depositId, refundAmount });

    res.json({
      success: true,
      message: '약속금이 환불되었습니다.',
      refundAmount
    });

  } catch (error) {
    console.error('❌ 약속금 환불 실패:', error);
    res.status(500).json({
      success: false,
      error: '환불 처리 중 오류가 발생했습니다.'
    });
  }
});

// 약속금 포인트 전환
apiRouter.post('/deposits/:id/convert-to-points', authenticateToken, async (req, res) => {
  try {
    const { id: depositId } = req.params;
    const userId = req.user.userId;

    console.log('🎁 약속금 포인트 전환 요청:', { depositId, userId });

    // 약속금 정보 조회
    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits 
      WHERE id = $1 AND user_id = $2 AND status = 'paid'
    `, [depositId, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '포인트 전환 가능한 약속금을 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];
    const pointAmount = deposit.amount; // 100% 포인트 전환

    // 포인트 적립
    await pool.query(`
      INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
      VALUES ($1, $2, $2, 0, 0)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        total_points = user_points.total_points + $2,
        available_points = user_points.available_points + $2,
        updated_at = NOW()
    `, [userId, pointAmount]);

    // 포인트 거래 내역 추가
    await pool.query(`
      INSERT INTO point_transactions (user_id, type, amount, description, related_deposit_id, created_at)
      VALUES ($1, 'earned', $2, $3, $4, NOW())
    `, [userId, pointAmount, `약속금 포인트 전환 (모임 ID: ${deposit.meetup_id})`, depositId]);

    // 약속금 상태 업데이트
    await pool.query(`
      UPDATE promise_deposits 
      SET status = 'converted', 
          is_converted_to_points = true,
          updated_at = NOW()
      WHERE id = $1
    `, [depositId]);

    console.log('✅ 약속금 포인트 전환 완료:', { depositId, pointAmount });

    res.json({
      success: true,
      message: '약속금이 포인트로 전환되었습니다.',
      pointAmount
    });

  } catch (error) {
    console.error('❌ 약속금 포인트 전환 실패:', error);
    res.status(500).json({
      success: false,
      error: '포인트 전환 처리 중 오류가 발생했습니다.'
    });
  }
});

// 사용자 약속금 내역 조회
apiRouter.get('/user/deposits', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    console.log('💰 약속금 내역 조회 요청:', { userId, page, limit });

    const depositsResult = await pool.query(`
      SELECT 
        pd.*,
        m.title as meetup_title,
        m.date as meetup_date,
        m.location as meetup_location
      FROM promise_deposits pd
      JOIN meetups m ON pd.meetup_id = m.id
      WHERE pd.user_id = $1
      ORDER BY pd.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM promise_deposits WHERE user_id = $1
    `, [userId]);

    const total = parseInt(countResult.rows[0].total);

    console.log('✅ 약속금 내역 조회 성공:', depositsResult.rows.length);

    res.json({
      success: true,
      data: depositsResult.rows.map(deposit => ({
        id: deposit.id,
        meetupId: deposit.meetup_id,
        amount: deposit.amount,
        status: deposit.status,
        paymentMethod: deposit.payment_method,
        paymentId: deposit.payment_id,
        refundAmount: deposit.refund_amount,
        refundReason: deposit.refund_reason,
        isConvertedToPoints: deposit.is_converted_to_points,
        depositedAt: deposit.deposited_at,
        returnedAt: deposit.returned_at,
        createdAt: deposit.created_at,
        meetup: {
          title: deposit.meetup_title,
          date: deposit.meetup_date,
          location: deposit.meetup_location
        }
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ 약속금 내역 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '약속금 내역을 조회할 수 없습니다.'
    });
  }
});

// 404 에러 핸들러 (API 라우터용) - 모든 라우트 정의 후 마지막에 위치
apiRouter.use('*', (req, res) => {
  res.status(404).json({
    error: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.path
  });
});

// 서버 시작
const startServer = async () => {
  try {
    // PostgreSQL 연결 테스트
    await pool.query('SELECT 1+1 AS result');
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 혼밥시러 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔑 Kakao login: http://localhost:${PORT}/api/auth/kakao/login`);
      console.log(`📡 WebSocket 서버가 Socket.IO로 실행 중입니다.`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;