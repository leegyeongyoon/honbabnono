import axios from 'axios';
import { KakaoTokenResponse, KakaoUserInfo } from '../types/auth';

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID!;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET!;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI!;

const KAKAO_AUTH_URL = 'https://kauth.kakao.com';
const KAKAO_API_URL = 'https://kapi.kakao.com';

export const getKakaoAuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: 'code',
    scope: 'profile_nickname,profile_image,account_email',
  });

  return `${KAKAO_AUTH_URL}/oauth/authorize?${params.toString()}`;
};

export const getKakaoToken = async (code: string): Promise<KakaoTokenResponse> => {
  try {
    const response = await axios.post(
      `${KAKAO_AUTH_URL}/oauth/token`,
      {
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri: KAKAO_REDIRECT_URI,
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
    console.error('Kakao token error:', error);
    throw new Error('Failed to get Kakao token');
  }
};

export const getKakaoUserInfo = async (accessToken: string): Promise<KakaoUserInfo> => {
  try {
    const response = await axios.get(`${KAKAO_API_URL}/v2/user/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Kakao user info error:', error);
    throw new Error('Failed to get Kakao user info');
  }
};

export const revokeKakaoToken = async (accessToken: string): Promise<void> => {
  try {
    await axios.post(
      `${KAKAO_API_URL}/v1/user/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error) {
    console.error('Kakao token revoke error:', error);
    // 로그아웃 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
};