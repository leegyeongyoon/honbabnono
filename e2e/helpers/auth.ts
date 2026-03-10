import { Page } from '@playwright/test';

const API_URL = 'http://localhost:3001/api';
const WEB_URL = 'http://localhost:3000';

// 토큰 캐시 - userId별로 한 번만 발급받고 재사용
const tokenCache: Map<string, { token: string; user: any }> = new Map();

/**
 * 테스트용 토큰 발급 (캐시됨 - userId별로 1회만 호출, rate limit 시 재시도)
 */
async function getTestToken(page: Page, userId: string): Promise<{ token: string; user: any }> {
  const cached = tokenCache.get(userId);
  if (cached) {
    return cached;
  }

  // Rate limiter 대비 최대 3회 재시도 (5초 간격)
  for (let attempt = 0; attempt < 3; attempt++) {
    const tokenResponse = await page.request.post(`${API_URL}/auth/test-login`, {
      data: { userId },
    });

    if (tokenResponse.ok()) {
      const data = await tokenResponse.json();
      const token = data.token;
      const user = {
        ...data.user,
        babAlScore: data.user.babAlScore || 50,
        meetupsHosted: data.user.meetupsHosted || 0,
        meetupsJoined: data.user.meetupsJoined || 5,
        rating: data.user.rating || 4.0,
      };
      tokenCache.set(userId, { token, user });
      return { token, user };
    }

    // Rate limited → 대기 후 재시도
    if (tokenResponse.status() === 429 && attempt < 2) {
      await page.waitForTimeout(5000);
      continue;
    }

    throw new Error('test-login 실패: ' + (await tokenResponse.text()));
  }

  throw new Error('test-login 재시도 실패');
}

/**
 * 테스트용 로그인 - localStorage에 JWT 주입
 */
export async function loginAsTestUser(page: Page, userId: string = '22222222-2222-2222-2222-222222222222') {
  const { token, user } = await getTestToken(page, userId);

  // 도메인 컨텍스트 확보
  await page.goto(`${WEB_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  // localStorage에 실제 JWT와 유저 정보 주입
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user-storage', JSON.stringify({
      state: { user, isLoggedIn: true, token },
      version: 0,
    }));
  }, { token, user });

  // 홈으로 이동 (networkidle 대신 load로 변경하여 속도 향상)
  await page.goto(`${WEB_URL}/home`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
}

/**
 * 로그아웃
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto(`${WEB_URL}/login`);
  await page.waitForLoadState('networkidle');
}
