const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { initDatabase, User, Meetup, MeetupParticipant } = require('../backend/src/models/index');

// 환경변수 로드
dotenv.config();

const app = express();
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
  origin: process.env.CORS_ORIGIN || 'https://honbabnono.com',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 라우터를 /api 경로에 마운트
app.use('/api', apiRouter);

// 기본 라우터
apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '혼밥시러 API 서버가 정상 동작 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// 카카오 로그인 시작 (인증 페이지로 리다이렉트)
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
    const [user, created] = await User.findOrCreate({
      where: {
        provider: 'kakao',
        providerId: kakaoUser.id.toString()
      },
      defaults: {
        email: kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@honbabnono.com`,
        name: kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자',
        profileImage: kakaoUser.kakao_account?.profile?.profile_image_url,
        provider: 'kakao',
        providerId: kakaoUser.id.toString(),
        isVerified: true
      }
    });
    
    if (created) {
      console.log('새 사용자 생성:', user.email);
    } else {
      console.log('기존 사용자 로그인:', user.email);
    }
    
    // 4. JWT 토큰 생성
    const jwtToken = generateJWT(user);
    
    // 5. 프론트엔드로 토큰과 함께 리다이렉트
    res.redirect(`/#/login?success=true&token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage
    }))}`);
    
  } catch (error) {
    console.error('카카오 로그인 처리 실패:', error);
    res.redirect('/#/login?error=kakao_login_failed');
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
    const [user, created] = await User.findOrCreate({
      where: {
        provider: 'kakao',
        providerId: kakaoUser.id.toString()
      },
      defaults: {
        email: kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@honbabnono.com`,
        name: kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자',
        profileImage: kakaoUser.kakao_account?.profile?.profile_image_url,
        provider: 'kakao',
        providerId: kakaoUser.id.toString(),
        isVerified: true
      }
    });
    
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

// 사용자 프로필 조회 (인증 필요)
apiRouter.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json({ user });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '접근 토큰이 필요합니다' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
    }
    req.user = { userId: user.id, email: user.email, name: user.name };
    next();
  });
};

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

    const { count, rows: meetups } = await Meetup.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage', 'rating']
        }
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      meetups,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
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

    if (!title || !location || !date || !time || !maxParticipants || !category) {
      return res.status(400).json({ error: '필수 필드를 모두 입력해주세요' });
    }

    const meetup = await Meetup.create({
      title,
      description,
      location,
      address,
      date,
      time,
      maxParticipants,
      category,
      priceRange,
      hostId,
      requirements
    });

    // 호스트를 자동으로 참가자로 추가
    await MeetupParticipant.create({
      meetupId: meetup.id,
      userId: hostId,
      status: '참가승인'
    });

    // 호스트의 주최 모임 수 증가
    await User.increment('meetupsHosted', { where: { id: hostId } });

    const createdMeetup = await Meetup.findByPk(meetup.id, {
      include: [
        {
          model: User,
          as: 'host',
          attributes: ['id', 'name', 'profileImage', 'rating']
        }
      ]
    });

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

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 초기화
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 혼밥시러 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔑 Kakao login: http://localhost:${PORT}/api/auth/kakao/login`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;