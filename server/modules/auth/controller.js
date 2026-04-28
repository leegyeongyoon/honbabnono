const axios = require('axios');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const logger = require('../../config/logger');
const { generateJWT, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } = require('../../middleware/auth');

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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/login?error=kakao_auth_failed`);
  }

  if (!code) {
    logger.error('카카오 로그인 코드 없음');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/login?error=no_auth_code`);
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

    // 4. JWT 토큰 및 리프레시 토큰 생성
    const jwtToken = generateJWT(user);
    const refreshToken = await generateRefreshToken(user);

    // 5. 리프레시 토큰을 HTTP-only 쿠키로 설정
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    // 6. 프론트엔드로 액세스 토큰과 함께 리다이렉트 (리프레시 토큰은 쿠키로 전달)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?success=true&token=${jwtToken}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      gender: user.gender
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
    logger.debug('카카오 로그인 API 요청 처리 시작');

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

    // JWT 토큰 및 리프레시 토큰 생성
    const jwtToken = generateJWT(user);
    const refreshToken = await generateRefreshToken(user);

    // 응답 반환
    res.json({
      success: true,
      message: '카카오 로그인 성공',
      data: {
        token: jwtToken,
        refreshToken: refreshToken,
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
    logger.error('카카오 로그인 API 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '카카오 로그인 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? error.message : '카카오 로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// 토큰 검증 및 자동 로그인 API
exports.verifyToken = async (req, res) => {
  logger.debug('토큰 검증 API 호출됨', {
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
    logger.debug('JWT decoded:', { userId: decoded.userId || decoded.id });

    // userId 필드명 확인 (userId 또는 id)
    const userId = decoded.userId || decoded.id;
    logger.debug('Extracted userId:', userId);

    // 사용자 정보 조회 (삭제되지 않은 계정만)
    const userResult = await pool.query(`
      SELECT id, email, name, profile_image, provider, is_verified, gender, created_at
      FROM users
      WHERE id = $1
    `, [userId]);

    logger.debug('User query result:', { found: userResult.rows.length, userId });

    if (userResult.rows.length === 0) {
      logger.info('사용자를 찾을 수 없습니다:', userId);
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    logger.info('토큰 검증 성공 - 자동 로그인:', user.email);

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
        gender: user.gender,
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

    logger.error('토큰 검증 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};

// 로그아웃
exports.logout = async (req, res) => {
  try {
    logger.info('로그아웃 요청:', { userId: req.user.userId, email: req.user.email });

    // 리프레시 토큰이 있으면 삭제 (body 또는 쿠키에서 읽기)
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
      logger.info('리프레시 토큰 삭제 완료');
    }

    // 쿠키에서 리프레시 토큰 제거
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/api/auth'
    });

    res.json({
      success: true,
      message: '로그아웃 되었습니다.'
    });
    logger.info('로그아웃 완료:', { userId: req.user.userId });
  } catch (error) {
    logger.error('로그아웃 실패:', error);
    res.status(500).json({
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다.'
    });
  }
};

// 비밀번호 재설정 요청
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // 항상 성공 응답 (이메일 존재 여부 노출 방지)
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1 AND provider = $2', [email, 'email']);

    if (userResult.rows.length > 0) {
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1시간

      await pool.query(
        'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
        [resetTokenHash, expires, userResult.rows[0].id]
      );

      logger.info('비밀번호 재설정 토큰 생성:', { userId: userResult.rows[0].id, resetUrl: `/reset-password?token=${resetToken}` });
      // TODO: 이메일 발송 서비스 연동
    }

    res.json({ success: true, message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.' });
  } catch (error) {
    logger.error('비밀번호 재설정 요청 실패:', error);
    res.status(500).json({ success: false, error: '처리 중 오류가 발생했습니다.' });
  }
};

// 비밀번호 재설정 실행
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const userResult = await pool.query(
      'SELECT id FROM users WHERE reset_token_hash = $1 AND reset_token_expires > NOW()',
      [tokenHash]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: '유효하지 않거나 만료된 토큰입니다.' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, userResult.rows[0].id]
    );

    logger.info('비밀번호 재설정 완료:', { userId: userResult.rows[0].id });
    res.json({ success: true, message: '비밀번호가 재설정되었습니다.' });
  } catch (error) {
    logger.error('비밀번호 재설정 실패:', error);
    res.status(500).json({ success: false, error: '비밀번호 재설정 중 오류가 발생했습니다.' });
  }
};

// 테스트 로그인
exports.testLogin = async (req, res) => {
  // 프로덕션에서 테스트 로그인 차단
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { email, userId } = req.body;
    logger.debug('테스트 로그인 요청:', { email, userId });

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        error: '이메일 또는 userId가 필요합니다.'
      });
    }

    const userResult = await pool.query(`
      SELECT id, name, email, provider, is_verified, profile_image, rating, gender, created_at
      FROM users
      WHERE ${userId ? 'id = $1' : 'email = $1'}
    `, [userId || email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 이메일의 테스트 사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    const token = generateJWT(user);
    const refreshToken = await generateRefreshToken(user);

    logger.info('테스트 로그인 성공:', {
      userId: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      success: true,
      message: '테스트 로그인이 성공했습니다.',
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        isVerified: user.is_verified,
        profileImage: user.profile_image,
        gender: user.gender,
        rating: user.rating,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error('테스트 로그인 실패:', error);
    res.status(500).json({
      success: false,
      error: '테스트 로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// ============================================================
// v2 테스트 시드 (개발/테스트 전용)
// 멱등 — 매번 호출해도 동일 ID 유지
// ============================================================
exports.testSeedV2 = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const TEST_USER_ID = '11111111-1111-1111-1111-111111111111';
  const TEST_USER_2_ID = '22222222-2222-2222-2222-222222222222';
  const TEST_MERCHANT_USER_ID = '33333333-3333-3333-3333-333333333333';
  const TEST_RESTAURANT_ID = '99999999-1111-1111-1111-111111111111';
  const TEST_MERCHANT_ID = '99999999-2222-2222-2222-222222222222';

  try {
    // 1. 사용자 보장 (UPSERT)
    await pool.query(`
      INSERT INTO users (id, email, name, provider, is_verified, gender, rating)
      VALUES ($1, 'e2e-host@test.local', 'E2E 호스트', 'email', true, '여성', 4.5)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `, [TEST_USER_ID]);

    await pool.query(`
      INSERT INTO users (id, email, name, provider, is_verified, gender, rating)
      VALUES ($1, 'e2e-guest@test.local', 'E2E 게스트', 'email', true, '남성', 4.0)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `, [TEST_USER_2_ID]);

    await pool.query(`
      INSERT INTO users (id, email, name, provider, is_verified, gender, rating)
      VALUES ($1, 'e2e-merchant@test.local', 'E2E 점주', 'email', true, '남성', 0)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `, [TEST_MERCHANT_USER_ID]);

    // 2. restaurant
    await pool.query(`
      INSERT INTO restaurants (id, name, description, category, phone, address, latitude, longitude, seat_count, is_active)
      VALUES ($1, 'E2E 샤브샤브', '테스트용 샤브샤브 매장', '샤브샤브', '02-123-4567', '서울특별시 강남구 강남대로 396', 37.4979, 127.0276, 30, true)
      ON CONFLICT (id) DO UPDATE SET is_active = true, updated_at = NOW()
    `, [TEST_RESTAURANT_ID]);

    // 3. merchant (verified)
    await pool.query(`
      INSERT INTO merchants (id, user_id, restaurant_id, business_number, business_name, representative_name, verification_status, verified_at)
      VALUES ($1, $2, $3, '123-45-67890', 'E2E 사업자', 'E2E 점주', 'verified', NOW())
      ON CONFLICT (id) DO UPDATE SET verification_status = 'verified', verified_at = NOW()
    `, [TEST_MERCHANT_ID, TEST_MERCHANT_USER_ID, TEST_RESTAURANT_ID]);

    // 4. menus (3개) — 멱등 보장 위해 기존 삭제 후 INSERT
    await pool.query(`DELETE FROM menus WHERE restaurant_id = $1`, [TEST_RESTAURANT_ID]);
    await pool.query(`
      INSERT INTO menus (restaurant_id, name, description, price, prep_time_min, is_set_menu, serves, is_active)
      VALUES
        ($1, '샤브샤브 2인 세트', '소고기/돼지고기 + 채소/만두', 38000, 20, true, 2, true),
        ($1, '샤브샤브 3-4인 세트', '풍성한 모듬 + 사이드', 78000, 25, true, 4, true),
        ($1, '런치 단품', '평일 점심 한정', 13000, 10, false, 1, true)
    `, [TEST_RESTAURANT_ID]);

    // 5. time slots (월~금 11:00, 12:00, 18:00, 19:00, 20:00)
    await pool.query(`DELETE FROM restaurant_time_slots WHERE restaurant_id = $1`, [TEST_RESTAURANT_ID]);
    const slots = ['11:00', '12:00', '18:00', '19:00', '20:00'];
    for (let dow = 1; dow <= 5; dow++) {
      for (const t of slots) {
        await pool.query(`
          INSERT INTO restaurant_time_slots (restaurant_id, day_of_week, slot_time, max_reservations, is_active)
          VALUES ($1, $2, $3, 5, true)
          ON CONFLICT (restaurant_id, day_of_week, slot_time) DO NOTHING
        `, [TEST_RESTAURANT_ID, dow, t]);
      }
    }

    res.json({
      success: true,
      seeded: {
        userId: TEST_USER_ID,
        guestUserId: TEST_USER_2_ID,
        merchantUserId: TEST_MERCHANT_USER_ID,
        restaurantId: TEST_RESTAURANT_ID,
        merchantId: TEST_MERCHANT_ID,
      },
    });
  } catch (error) {
    logger.error('v2 시드 실패:', error);
    res.status(500).json({ success: false, error: error.message });
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
    logger.error('프로필 조회 오류:', error);
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

    const token = generateJWT(newUser);
    const refreshToken = await generateRefreshToken(newUser);

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        provider: newUser.provider
      },
      token,
      refreshToken
    });
  } catch (error) {
    logger.error('회원가입 오류:', error);
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

    const token = generateJWT(user);
    const refreshToken = await generateRefreshToken(user);

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
      token,
      refreshToken
    });
  } catch (error) {
    logger.error('로그인 오류:', error);
    res.status(500).json({ success: false, error: '로그인 중 오류가 발생했습니다.' });
  }
};

// 리프레시 토큰으로 새 액세스 토큰 발급
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: '리프레시 토큰이 필요합니다.'
      });
    }

    // 리프레시 토큰 검증
    const tokenData = await verifyRefreshToken(refreshToken);

    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: '유효하지 않거나 만료된 리프레시 토큰입니다.'
      });
    }

    // 사용자 정보 조회 (계정이 아직 유효한지 확인)
    const userResult = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [tokenData.userId]
    );

    if (userResult.rows.length === 0) {
      await revokeRefreshToken(refreshToken);
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult.rows[0];

    // 새 액세스 토큰 발급
    const newAccessToken = generateJWT(user);

    // 새 리프레시 토큰 발급 (토큰 로테이션)
    await revokeRefreshToken(refreshToken);
    const newRefreshToken = await generateRefreshToken(user);

    // 새 리프레시 토큰을 HTTP-only 쿠키로 설정
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    logger.info('토큰 갱신 성공:', { userId: user.id, email: user.email });

    res.json({
      success: true,
      message: '토큰이 갱신되었습니다.',
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error('토큰 갱신 오류:', error);
    res.status(500).json({
      success: false,
      error: '토큰 갱신 중 오류가 발생했습니다.'
    });
  }
};
