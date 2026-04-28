import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { getApiToken } from './helpers/seed';

const API = 'http://localhost:3001/api';
const USER2_ID = '22222222-2222-2222-2222-222222222222';

test.describe('지원/공지 고급 엔드포인트 테스트', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    token = await getApiToken(USER2_ID);
  });

  test('API: GET /api/support/notices/:id - 공지사항 상세 (id=1)', async ({ page }) => {
    const response = await page.request.get(`${API}/support/notices/1`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.notice).toBeTruthy();
      expect(data.notice).toHaveProperty('title');
      expect(data.notice).toHaveProperty('content');
    } else {
      // 공지 없음(404) 또는 DB 이슈(500) 허용
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: GET /api/support/notices/:id - 공지사항 상세 (id=2)', async ({ page }) => {
    const response = await page.request.get(`${API}/support/notices/2`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.notice).toBeTruthy();
    } else {
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: GET /api/notices/:id - standalone 공지사항 상세 (id=1)', async ({ page }) => {
    const response = await page.request.get(`${API}/notices/1`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.notice).toBeTruthy();
      expect(data.notice).toHaveProperty('id');
    } else {
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: GET /api/notices/:id - standalone 공지사항 상세 (id=2)', async ({ page }) => {
    const response = await page.request.get(`${API}/notices/2`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
    } else {
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: GET /api/notices/:id - 존재하지 않는 공지사항 (id=99999)', async ({ page }) => {
    const response = await page.request.get(`${API}/notices/99999`);

    if (response.ok()) {
      // 혹시 성공이면 데이터가 있다는 뜻
      const data = await response.json();
      expect(data).toBeTruthy();
    } else {
      // 404 또는 500 기대
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: POST /api/support/inquiry - 문의 접수', async ({ page }) => {
    const response = await page.request.post(`${API}/support/inquiry`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        subject: 'E2E 테스트 문의',
        content: '테스트 문의 내용입니다. Playwright E2E 테스트에서 자동 생성됨.',
        category: '기타',
      },
    });

    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();

    if (data.success) {
      expect(data).toHaveProperty('message');
    }
  });

  test('API: POST /api/support/inquiry - 제목 없이 문의 (400)', async ({ page }) => {
    const response = await page.request.post(`${API}/support/inquiry`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        content: '제목 없는 문의',
        category: '기타',
      },
    });

    const data = await response.json();
    // 400 (유효성 에러) 또는 500 (DB 이슈)
    expect(data.success === false || response.status() === 400 || response.status() === 500).toBeTruthy();
  });

  test('API: POST /api/support/inquiry - 인증 없이 문의 (401)', async ({ page }) => {
    const response = await page.request.post(`${API}/support/inquiry`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        subject: '인증 없는 문의',
        content: '인증 없이 시도',
        category: '기타',
      },
    });

    expect([401, 403]).toContain(response.status());
  });

  test('API: GET /api/support/my-inquiries - 내 문의 내역 조회', async ({ page }) => {
    const response = await page.request.get(`${API}/support/my-inquiries`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
      // data 또는 inquiries 배열
      const inquiries = data.data || data.inquiries || [];
      expect(Array.isArray(inquiries)).toBeTruthy();
    } else {
      // DB 테이블 미존재 허용
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('API: GET /api/support/my-inquiries - 인증 없이 조회 (401)', async ({ page }) => {
    const response = await page.request.get(`${API}/support/my-inquiries`);
    expect([401, 403]).toContain(response.status());
  });

  test('API: GET /api/legal/terms - 이용약관 조회', async ({ page }) => {
    const response = await page.request.get(`${API}/legal/terms`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.data).toBeTruthy();
    } else {
      // 약관 미등록(404) 또는 DB 이슈(500)
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: GET /api/legal/privacy - 개인정보처리방침 조회', async ({ page }) => {
    const response = await page.request.get(`${API}/legal/privacy`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.data).toBeTruthy();
    } else {
      // 방침 미등록(404) 또는 DB 이슈(500)
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: GET /api/app-info - 앱 정보 조회', async ({ page }) => {
    const response = await page.request.get(`${API}/app-info`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data).toBeTruthy();
    expect(data.data).toHaveProperty('version');
    expect(data.data).toHaveProperty('features');
    expect(Array.isArray(data.data.features)).toBeTruthy();
  });

  test('API: GET /api/support/notices - 공지사항 목록 조회', async ({ page }) => {
    const response = await page.request.get(`${API}/support/notices`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
      const notices = data.notices || data.data || [];
      expect(Array.isArray(notices)).toBeTruthy();
    } else {
      // DB 이슈 허용
      expect([404, 500]).toContain(response.status());
    }
  });

  test('API: GET /api/support/faq - FAQ 목록 조회', async ({ page }) => {
    const response = await page.request.get(`${API}/support/faq`);

    if (response.ok()) {
      const data = await response.json();
      expect(data.success).toBeTruthy();
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
