import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { getKakaoAuthUrl, getKakaoToken, getKakaoUserInfo } from '../utils/kakao';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  KakaoCallbackRequest,
  KakaoUserInfo 
} from '../types/auth';

const router = express.Router();

// 임시 사용자 저장소 (실제 프로젝트에서는 데이터베이스 사용)
const users: User[] = [];
let userIdCounter = 1;

// 이메일로 사용자 찾기
const findUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

// 카카오 ID로 사용자 찾기
const findUserByKakaoId = (kakaoId: number): User | undefined => {
  return users.find(user => user.kakaoId === kakaoId);
};

// 사용자 생성
const createUser = (userData: Partial<User>): User => {
  const user: User = {
    id: userIdCounter.toString(),
    email: userData.email!,
    nickname: userData.nickname!,
    profileImage: userData.profileImage,
    kakaoId: userData.kakaoId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  userIdCounter++;
  users.push(user);
  return user;
};

// 일반 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // TODO: 실제로는 해시된 비밀번호와 비교
    // const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    // if (!isPasswordValid) {
    //   return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    // }

    const token = generateToken(user);
    const authResponse: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };

    res.json(authResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 카카오 로그인 시작
router.get('/kakao', (req, res) => {
  const kakaoAuthUrl = getKakaoAuthUrl();
  res.redirect(kakaoAuthUrl);
});

// 카카오 로그인 콜백 처리
router.post('/kakao/callback', async (req, res) => {
  try {
    const { code }: KakaoCallbackRequest = req.body;

    if (!code) {
      return res.status(400).json({ message: '인증 코드가 필요합니다.' });
    }

    // 카카오 토큰 획득
    const tokenResponse = await getKakaoToken(code);
    
    // 카카오 사용자 정보 획득
    const kakaoUserInfo: KakaoUserInfo = await getKakaoUserInfo(tokenResponse.access_token);

    // 기존 사용자 확인
    let user = findUserByKakaoId(kakaoUserInfo.id);

    if (!user) {
      // 새 사용자 생성
      const email = kakaoUserInfo.kakao_account.email || `kakao_${kakaoUserInfo.id}@temp.com`;
      const nickname = kakaoUserInfo.kakao_account.profile.nickname;
      const profileImage = kakaoUserInfo.kakao_account.profile.profile_image_url;

      // 이메일 중복 확인
      const existingUser = findUserByEmail(email);
      if (existingUser) {
        // 기존 사용자에 카카오 ID 연결
        existingUser.kakaoId = kakaoUserInfo.id;
        existingUser.updatedAt = new Date();
        user = existingUser;
      } else {
        // 새 사용자 생성
        user = createUser({
          email,
          nickname,
          profileImage,
          kakaoId: kakaoUserInfo.id,
        });
      }
    } else {
      // 기존 사용자 정보 업데이트
      user.nickname = kakaoUserInfo.kakao_account.profile.nickname;
      user.profileImage = kakaoUserInfo.kakao_account.profile.profile_image_url;
      user.updatedAt = new Date();
    }

    const token = generateToken(user);
    const authResponse: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };

    res.json(authResponse);
  } catch (error) {
    console.error('Kakao callback error:', error);
    res.status(500).json({ message: '카카오 로그인 처리 중 오류가 발생했습니다.' });
  }
});

// GET 방식 카카오 콜백 (브라우저 리다이렉트용)
router.get('/kakao/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=${error}`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
    }

    // 카카오 토큰 획득
    const tokenResponse = await getKakaoToken(code);
    
    // 카카오 사용자 정보 획득
    const kakaoUserInfo: KakaoUserInfo = await getKakaoUserInfo(tokenResponse.access_token);

    // 기존 사용자 확인
    let user = findUserByKakaoId(kakaoUserInfo.id);

    if (!user) {
      // 새 사용자 생성
      const email = kakaoUserInfo.kakao_account.email || `kakao_${kakaoUserInfo.id}@temp.com`;
      const nickname = kakaoUserInfo.kakao_account.profile.nickname;
      const profileImage = kakaoUserInfo.kakao_account.profile.profile_image_url;

      // 이메일 중복 확인
      const existingUser = findUserByEmail(email);
      if (existingUser) {
        // 기존 사용자에 카카오 ID 연결
        existingUser.kakaoId = kakaoUserInfo.id;
        existingUser.updatedAt = new Date();
        user = existingUser;
      } else {
        // 새 사용자 생성
        user = createUser({
          email,
          nickname,
          profileImage,
          kakaoId: kakaoUserInfo.id,
        });
      }
    } else {
      // 기존 사용자 정보 업데이트
      user.nickname = kakaoUserInfo.kakao_account.profile.nickname;
      user.profileImage = kakaoUserInfo.kakao_account.profile.profile_image_url;
      user.updatedAt = new Date();
    }

    const token = generateToken(user);
    
    // 토큰을 쿠키로 설정하고 프론트엔드로 리다이렉트
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    res.redirect(`${process.env.FRONTEND_URL}?login=success`);
  } catch (error) {
    console.error('Kakao GET callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=kakao_login_failed`);
  }
});

// 사용자 정보 조회
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = users.find(u => u.id === req.user!.userId);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 로그아웃
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  try {
    // 클라이언트에서 토큰 삭제하도록 응답
    res.clearCookie('token');
    res.json({ message: '로그아웃되었습니다.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: '로그아웃 처리 중 오류가 발생했습니다.' });
  }
});

export default router;