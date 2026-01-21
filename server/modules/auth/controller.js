const axios = require('axios');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const logger = require('../../config/logger');
const { generateJWT } = require('../../middleware/auth');

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
    logger.error('Kakao token error:', error.response?.data || error.message);
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
    logger.error('Kakao user info error:', error.response?.data || error.message);
    throw new Error('Failed to get Kakao user info');
  }
};

// 카카오 로그인 시작 (인증 페이지로 리다이렉트)
exports.kakaoAuthRedirect = (req, res) => {
  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.KAKAO_REDIRECT_URI)}&response_type=code`;

  logger.debug('카카오 로그인 시작:', {
    clientId: process.env.KAKAO_CLIENT_ID,
    redirectUri: process.env.KAKAO_REDIRECT_URI,
    authUrl: kakaoAuthUrl
  });

  res.redirect(kakaoAuthUrl);
};

// 카카오 로그인 콜백 처리
exports.kakaoCallback = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    logger.error('카카오 로그인 에러:', error);
    return res.redirect('/#/login?error=kakao_auth_failed');
  }

  if (!code) {
    logger.error('카카오 로그인 코드 없음');
    return res.redirect('/#/login?error=no_auth_code');
  }

  try {
    logger.debug('카카오 로그인 콜백 처리 시작:', code);

    // 1. 카카오에서 access_token 받기
    const tokenData = await getKakaoToken(code);
    logger.debug('카카오 토큰 획득 성공');

    // 2. access_token으로 사용자 정보 조회
    const kakaoUser = await getKakaoUserInfo(tokenData.access_token);
    logger.debug('카카오 사용자 정보 획득:', kakaoUser.kakao_account?.email);

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
      logger.info('새 사용자 생성:', user.email);
    } else {
      logger.info('기존 사용자 로그인:', user.email);
    }

    // 4. JWT 토큰 생성
    const jwtToken = generateJWT(user);

    // 5. 프론트엔드로 토큰과 함께 리다이렉트
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?success=true&token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage
    }))}`);

  } catch (error) {
    logger.error('카카오 로그인 처리 실패:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?error=kakao_login_failed`);
  }
};

// 카카오 로그인 API (웹 앱용)
exports.kakaoLogin = async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({
      error: '카카오 액세스 토큰이 필요합니다.'
    });
  }

  try {
    console.log('카카오 로그인 API 요청 처리 시작:', accessToken);

    // access_token으로 직접 사용자 정보 조회
    const kakaoUser = await getKakaoUserInfo(accessToken);
    logger.debug('카카오 사용자 정보 획득:', kakaoUser.kakao_account?.email);

    // 데이터베이스에서 사용자 찾기 또는 생성
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
      logger.info('새 사용자 생성:', user.email);
    } else {
      logger.info('기존 사용자 로그인:', user.email);
    }

    // JWT 토큰 생성
    const jwtToken = generateJWT(user);

    // 응답 반환
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
      error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? error.message : '카카오 로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// 토큰 검증 및 자동 로그인 API
exports.verifyToken = async (req, res) => {
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

    // 사용자 정보 조회 (삭제되지 않은 계정만)
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
};

// 로그아웃
exports.logout = async (req, res) => {
  try {
    console.log('🚪 로그아웃 요청:', { userId: req.user.userId, email: req.user.email });
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
};

// 테스트 로그인
exports.testLogin = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🧪 테스트 로그인 요청:', { email });

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '이메일이 필요합니다.'
      });
    }

    const userResult = await pool.query(`
      SELECT id, name, email, provider, is_verified, profile_image, rating, created_at
      FROM users
      WHERE email = $1
    `, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 이메일의 테스트 사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ 테스트 로그인 성공:', {
      userId: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      success: true,
      message: '테스트 로그인이 성공했습니다.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        isVerified: user.is_verified,
        profileImage: user.profile_image,
        rating: user.rating,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ 테스트 로그인 실패:', error);
    res.status(500).json({
      success: false,
      error: '테스트 로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// 사용자 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const userResult = await pool.query(`
      SELECT id, email, name, profile_image, provider, is_verified, created_at, rating,
             phone, gender, babal_score, meetups_joined, meetups_hosted
      FROM users
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profile_image,
        provider: user.provider,
        isVerified: user.is_verified,
        rating: user.rating,
        phone: user.phone,
        gender: user.gender,
        babalScore: user.babal_score,
        meetupsJoined: user.meetups_joined,
        meetupsHosted: user.meetups_hosted,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '프로필 정보를 불러올 수 없습니다.'
    });
  }
};

// 이메일 회원가입
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: '모든 필드를 입력해주세요.'
      });
    }

    // 이메일 중복 체크
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 등록된 이메일입니다.'
      });
    }

    // 비밀번호 해싱
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = await pool.query(`
      INSERT INTO users (email, password, name, provider, is_verified, created_at)
      VALUES ($1, $2, $3, 'email', false, NOW())
      RETURNING id, email, name, provider, is_verified, created_at
    `, [email, hashedPassword, name]);

    const newUser = result.rows[0];

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        provider: newUser.provider
      },
      token
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ success: false, error: '회원가입 중 오류가 발생했습니다.' });
  }
};

// 이메일 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: '이메일과 비밀번호를 입력해주세요.'
      });
    }

    // 사용자 조회
    const userResult = await pool.query(
      'SELECT id, email, name, password, provider, profile_image, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const user = userResult.rows[0];

    // 비밀번호 확인
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profile_image,
        provider: user.provider,
        isVerified: user.is_verified
      },
      token
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ success: false, error: '로그인 중 오류가 발생했습니다.' });
  }
};
