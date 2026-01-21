const axios = require('axios');

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI;

const KAKAO_AUTH_URL = 'https://kauth.kakao.com';
const KAKAO_API_URL = 'https://kapi.kakao.com';

const getKakaoAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: 'code',
    scope: 'profile_nickname,profile_image,account_email',
  });

  return `${KAKAO_AUTH_URL}/oauth/authorize?${params.toString()}`;
};

const getKakaoToken = async (code) => {
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
    console.error('Kakao token error:', error.response?.data || error.message);
    throw new Error('Failed to get Kakao token');
  }
};

const getKakaoUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(`${KAKAO_API_URL}/v2/user/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Kakao user info error:', error.response?.data || error.message);
    throw new Error('Failed to get Kakao user info');
  }
};

const revokeKakaoToken = async (accessToken) => {
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
    console.error('Kakao token revoke error:', error.response?.data || error.message);
    // 로그아웃 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
};

module.exports = {
  getKakaoAuthUrl,
  getKakaoToken,
  getKakaoUserInfo,
  revokeKakaoToken
};