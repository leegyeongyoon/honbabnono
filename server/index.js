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

// 미들웨어 설정
app.use(cors({
  origin: ['http://localhost:3000', 'https://honbabnono.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    console.log('✅ 토큰 검증 성공:', { userId: user.id, email: user.email, url: req.originalUrl });
    req.user = { userId: user.id, email: user.email, name: user.name };
    next();
  });
};

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

    // 모임 목록 조회
    const meetupsResult = await pool.query(`
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
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        u.id as "host.id",
        u.name as "host.name",
        u.profile_image as "host.profileImage",
        u.rating as "host.rating"
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE m.status = '모집중'
      ORDER BY m.created_at DESC
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

// 모임 생성 (데이터베이스 연동, 인증 필요)
apiRouter.post('/meetups', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      address,
      date,
      time,
      maxParticipants,
      category,
      priceRange,
      requirements
    } = req.body;

    const hostId = req.user.userId;

    console.log('📝 모임 생성 요청:', { title, hostId, category });

    if (!title || !location || !date || !time || !maxParticipants || !category) {
      return res.status(400).json({ error: '필수 필드를 모두 입력해주세요' });
    }

    // 모임 생성
    const meetupResult = await pool.query(`
      INSERT INTO meetups (
        id, title, description, location, address, date, time, 
        max_participants, current_participants, category, price_range, 
        host_id, requirements, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11, '모집중', NOW(), NOW()
      ) RETURNING *
    `, [title, description, location, address, date, time, maxParticipants, category, priceRange, hostId, requirements]);

    const meetup = meetupResult.rows[0];

    // 호스트를 자동으로 참가자로 추가
    await pool.query(`
      INSERT INTO meetup_participants (meetup_id, user_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
    `, [meetup.id, hostId, '참가승인']);

    // 호스트의 주최 모임 수 증가
    await pool.query(`
      UPDATE users 
      SET meetups_hosted = meetups_hosted + 1, updated_at = NOW()
      WHERE id = $1
    `, [hostId]);

    // 호스트 정보와 함께 생성된 모임 정보 조회
    const createdMeetupResult = await pool.query(`
      SELECT 
        m.*,
        u.id as "host_id",
        u.name as "host_name", 
        u.profile_image as "host_profileImage",
        u.rating as "host_rating"
      FROM meetups m
      LEFT JOIN users u ON m.host_id = u.id
      WHERE m.id = $1
    `, [meetup.id]);

    const createdMeetupData = createdMeetupResult.rows[0];
    
    const createdMeetup = {
      ...createdMeetupData,
      host: {
        id: createdMeetupData.host_id,
        name: createdMeetupData.host_name,
        profileImage: createdMeetupData.host_profileImage,
        rating: createdMeetupData.host_rating
      }
    };

    console.log('✅ 모임 생성 완료:', { meetupId: meetup.id, title });

    res.status(201).json({
      success: true,
      message: '모임이 생성되었습니다',
      meetup: createdMeetup
    });
  } catch (error) {
    console.error('모임 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 모임 상세 조회 API
apiRouter.get('/meetups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 모임 상세 조회 요청:', { meetupId: id });
    
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
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        u.id as "host_id",
        u.name as "host_name",
        u.profile_image as "host_profileImage",
        u.rating as "host_rating"
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
      createdAt: meetupData.createdAt,
      updatedAt: meetupData.updatedAt,
      host: {
        id: meetupData.host_id,
        name: meetupData.host_name,
        profileImage: meetupData.host_profileImage,
        rating: meetupData.host_rating
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
      INSERT INTO meetup_participants (meetup_id, user_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
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
      ORDER BY cr."lastMessageTime" DESC NULLS LAST, cr."createdAt" DESC
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

// 404 에러 핸들러 (API 라우터용)
apiRouter.use('*', (req, res) => {
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