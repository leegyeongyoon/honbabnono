const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// 환경변수 로드
dotenv.config({ path: '../.env' });

const app = express();
const PORT = 3001;

// 미들웨어
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.33:3000'],
  credentials: true
}));
app.use(express.json());

// 카카오 OAuth2 설정
const KAKAO_CONFIG = {
  clientId: process.env.KAKAO_CLIENT_ID,
  clientSecret: process.env.KAKAO_CLIENT_SECRET,
  redirectUri: process.env.KAKAO_REDIRECT_URI,
  authUrl: 'https://kauth.kakao.com/oauth/authorize',
  tokenUrl: 'https://kauth.kakao.com/oauth/token',
  userInfoUrl: 'https://kapi.kakao.com/v2/user/me'
};

// 카카오 로그인 시작 (리다이렉트)
app.get('/auth/kakao', (req, res) => {
  const kakaoAuthUrl = `${KAKAO_CONFIG.authUrl}?client_id=${KAKAO_CONFIG.clientId}&redirect_uri=${KAKAO_CONFIG.redirectUri}&response_type=code`;
  res.redirect(kakaoAuthUrl);
});

// 카카오 OAuth2 콜백 처리
app.get('/auth/kakao/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('카카오 로그인 에러:', error);
    return res.redirect('http://localhost:3000?error=kakao_login_failed');
  }

  if (!code) {
    console.error('Authorization code가 없습니다');
    return res.redirect('http://localhost:3000?error=no_code');
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
    const user = {
      id: kakaoUser.id,
      email: kakaoUser.kakao_account?.email,
      name: kakaoUser.kakao_account?.profile?.nickname || '혼밥러',
      profileImage: kakaoUser.kakao_account?.profile?.profile_image_url,
      provider: 'kakao'
    };

    // 4. JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'honbabnono_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5. 프론트엔드로 리다이렉트 (토큰과 함께)
    const redirectUrl = `http://localhost:3000?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('카카오 로그인 처리 에러:', error);
    res.redirect('http://localhost:3000?error=auth_failed');
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
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // 임시 더미 로그인 (실제로는 데이터베이스 확인 필요)
  if (email && password) {
    const user = {
      id: 'dummy_user',
      email: email,
      name: '혼밥러',
      provider: 'email'
    };

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'honbabnono_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token, user });
  } else {
    res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
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

// 서버 시작
app.listen(PORT, () => {
  console.log(`🍚 혼밥시러 백엔드 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`🔑 카카오 OAuth2 설정:`);
  console.log(`   - Client ID: ${KAKAO_CONFIG.clientId ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`   - Redirect URI: ${KAKAO_CONFIG.redirectUri}`);
});