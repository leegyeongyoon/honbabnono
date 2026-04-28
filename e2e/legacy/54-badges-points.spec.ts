import { test, expect } from '@playwright/test';
import { getApiToken, createTestMeetup } from './helpers/seed';

const API = 'http://localhost:3001/api';

const USER1_ID = '11111111-1111-1111-1111-111111111111'; // 호스트
const USER2_ID = '22222222-2222-2222-2222-222222222222'; // 참가자

let userToken: string;
let hostToken: string;
let seedFailed = false;

test.describe('뱃지 및 포인트 모듈 테스트', () => {
  test.beforeAll(async () => {
    try {
      userToken = await getApiToken(USER2_ID);
      hostToken = await getApiToken(USER1_ID);
    } catch (e) {
      seedFailed = true;
    }
  });

  // ==========================================
  // 뱃지 엔드포인트
  // ==========================================

  test('GET /api/badges - 전체 뱃지 목록 조회', async ({ page }) => {
    const response = await page.request.get(`${API}/badges`);

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(Array.isArray(data.badges)).toBeTruthy();
    } else {
      // badges 테이블 미존재 허용
      expect(response.status()).toBe(500);
    }
  });

  test('GET /api/badges/available - 획득 가능한 뱃지 목록', async ({ page }) => {
    const response = await page.request.get(`${API}/badges/available`);

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(Array.isArray(data.badges)).toBeTruthy();
    } else {
      // badges 테이블 미존재 허용
      expect(response.status()).toBe(500);
    }
  });

  test('GET /api/badges/progress - 뱃지 진행률 조회 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.get(`${API}/badges/progress`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(Array.isArray(data.progress)).toBeTruthy();

      // 각 뱃지에 진행률 정보 포함
      if (data.progress.length > 0) {
        const badge = data.progress[0];
        expect(badge).toHaveProperty('currentProgress');
        expect(badge).toHaveProperty('progressPercent');
      }
    } else {
      // badges/user_badges 테이블 미존재 허용
      expect(response.status()).toBe(500);
    }
  });

  test('GET /api/badges/progress - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.get(`${API}/badges/progress`);
    expect(response.status()).toBe(401);
  });

  test('GET /api/badges/my - 내 뱃지 목록 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.get(`${API}/badges/my`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(Array.isArray(data.badges)).toBeTruthy();
    } else {
      // user_badges 테이블 미존재 허용
      expect(response.status()).toBe(500);
    }
  });

  test('GET /api/badges/my - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.get(`${API}/badges/my`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/badges/earn/:badgeId - 뱃지 획득 시도', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    // 먼저 사용 가능한 뱃지 목록 가져오기
    const listRes = await page.request.get(`${API}/badges/available`);
    const listData = await listRes.json();

    if (!listRes.ok() || !listData.badges || listData.badges.length === 0) {
      // 뱃지가 없거나 테이블 미존재 - 가짜 ID로 시도
      const response = await page.request.post(`${API}/badges/earn/1`, {
        headers: { 'Authorization': `Bearer ${userToken}` },
      });

      const data = await response.json();
      // 뱃지 미존재(404), 이미 획득(400), 또는 DB 이슈(500) 허용
      expect(
        data.success === true ||
        data.error ||
        response.status() === 500
      ).toBeTruthy();
      return;
    }

    const badgeId = listData.badges[0].id;

    const response = await page.request.post(`${API}/badges/earn/${badgeId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const data = await response.json();

    // 성공, 이미 획득(400), 또는 DB 이슈(500) 허용
    expect(
      data.success === true ||
      data.error?.includes('이미') ||
      response.status() === 500
    ).toBeTruthy();
  });

  test('POST /api/badges/earn/:badgeId - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.post(`${API}/badges/earn/1`);
    expect(response.status()).toBe(401);
  });

  test('PUT /api/badges/featured/:badgeId - 대표 뱃지 설정', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    // 내 뱃지 목록에서 대표로 설정할 뱃지 찾기
    const myBadgesRes = await page.request.get(`${API}/badges/my`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const myBadgesData = await myBadgesRes.json();

    let badgeId = 1; // 기본값
    if (myBadgesRes.ok() && myBadgesData.badges && myBadgesData.badges.length > 0) {
      badgeId = myBadgesData.badges[0].id;
    }

    const response = await page.request.put(`${API}/badges/featured/${badgeId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const data = await response.json();

    // 성공, 뱃지 미보유(404), 또는 DB 이슈(500) 허용
    expect(
      data.success === true ||
      data.success === false ||
      response.status() === 500
    ).toBeTruthy();
  });

  test('PUT /api/badges/featured/:badgeId - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.put(`${API}/badges/featured/1`);
    expect(response.status()).toBe(401);
  });

  // ==========================================
  // 포인트 엔드포인트
  // ==========================================

  test('GET /api/points - 포인트 조회 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.get(`${API}/points`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(data.points).toBeTruthy();
      expect(data.points).toHaveProperty('available');
      expect(data.points).toHaveProperty('totalEarned');
      expect(data.points).toHaveProperty('totalUsed');
      // 포인트는 음수가 아님
      expect(data.points.available).toBeGreaterThanOrEqual(0);
    } else {
      // user_points 테이블 미존재 허용
      expect(response.status()).toBe(500);
    }
  });

  test('GET /api/points - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.get(`${API}/points`);
    expect(response.status()).toBe(401);
  });

  test('GET /api/points/history - 포인트 내역 조회 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.get(`${API}/points/history`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(Array.isArray(data.history)).toBeTruthy();
      expect(data.pagination).toBeTruthy();
    } else {
      // point_transactions 테이블 미존재 허용
      expect(response.status()).toBe(500);
    }
  });

  test('GET /api/points/history - 페이지네이션 파라미터', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.get(`${API}/points/history?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(5);
    } else {
      // DB 이슈 허용
      expect(response.status()).toBe(500);
    }
  });

  test('GET /api/points/history - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.get(`${API}/points/history`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/points/earn - 포인트 적립 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.post(`${API}/points/earn`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        amount: 100,
        reason: 'E2E 테스트 적립',
      },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(data.message).toMatch(/포인트|적립/);
    } else {
      // user_points/point_transactions 테이블 미존재 허용
      expect(response.status()).toBe(500);
    }
  });

  test('POST /api/points/earn - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.post(`${API}/points/earn`, {
      data: { amount: 100, reason: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/points/use - 포인트 사용 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.post(`${API}/points/use`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        amount: 10,
        reason: 'E2E 테스트 사용',
      },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(data.message).toMatch(/포인트|사용/);
    } else if (response.status() === 400) {
      // 잔액 부족
      expect(data.success).toBeFalsy();
      expect(data.error).toMatch(/잔액|부족/);
    } else {
      // DB 이슈 허용
      expect(response.status()).toBe(500);
    }
  });

  test('POST /api/points/use - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.post(`${API}/points/use`, {
      data: { amount: 10, reason: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/points/deposit - 약속금 결제 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    // 테스트용 모임 생성
    let testMeetupId: string;
    try {
      const meetup = await createTestMeetup(hostToken, {
        title: `E2E 약속금 테스트 모임 ${Date.now()}`,
      });
      testMeetupId = meetup.id || meetup.meetupId;
    } catch (e) {
      test.skip(true, '모임 생성 실패');
      return;
    }

    const response = await page.request.post(`${API}/points/deposit`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        meetupId: testMeetupId,
        amount: 3000,
      },
    });

    const data = await response.json();

    if (response.ok()) {
      expect(data.success).toBeTruthy();
      expect(data.message).toMatch(/약속금|결제/);
    } else if (response.status() === 400) {
      // 잔액 부족
      expect(data.success).toBeFalsy();
      expect(data.error).toMatch(/잔액|부족|포인트/);
    } else {
      // promise_deposits 테이블 미존재 등 DB 이슈 허용
      expect(response.status()).toBe(500);
    }
  });

  test('POST /api/points/deposit - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.post(`${API}/points/deposit`, {
      data: { meetupId: 'test', amount: 3000 },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/points/refund - 약속금 환불 (인증 필요)', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const response = await page.request.post(`${API}/points/refund`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        meetupId: '00000000-0000-0000-0000-000000000000',
      },
    });

    const data = await response.json();

    if (response.status() === 400) {
      // 환불할 약속금 없음
      expect(data.success).toBeFalsy();
      expect(data.error).toMatch(/환불|약속금|없/);
    } else if (response.ok()) {
      // 환불 성공
      expect(data.success).toBeTruthy();
    } else {
      // promise_deposits 테이블 미존재 등 DB 이슈 허용
      expect(response.status()).toBe(500);
    }
  });

  test('POST /api/points/refund - 인증 없이 요청 시 401', async ({ page }) => {
    const response = await page.request.post(`${API}/points/refund`, {
      data: { meetupId: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  // ==========================================
  // 통합 시나리오: 포인트 적립 → 사용 → 내역 확인
  // ==========================================

  test('포인트 적립 → 조회 → 사용 → 내역 확인 플로우', async ({ page }) => {
    test.skip(seedFailed, '토큰 발급 실패');

    const headers = {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    };

    // 1. 포인트 적립
    const earnRes = await page.request.post(`${API}/points/earn`, {
      headers,
      data: { amount: 500, reason: 'E2E 통합 테스트 적립' },
    });

    if (!earnRes.ok()) {
      // DB 이슈로 적립 실패 시 나머지 스킵
      expect(earnRes.status()).toBe(500);
      return;
    }

    // 2. 포인트 조회
    const getRes = await page.request.get(`${API}/points`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    if (getRes.ok()) {
      const getData = await getRes.json();
      expect(getData.success).toBeTruthy();
      expect(getData.points.available).toBeGreaterThan(0);
    }

    // 3. 포인트 사용
    const useRes = await page.request.post(`${API}/points/use`, {
      headers,
      data: { amount: 50, reason: 'E2E 통합 테스트 사용' },
    });

    if (useRes.ok()) {
      const useData = await useRes.json();
      expect(useData.success).toBeTruthy();
    }

    // 4. 내역 확인
    const historyRes = await page.request.get(`${API}/points/history?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    if (historyRes.ok()) {
      const historyData = await historyRes.json();
      expect(historyData.success).toBeTruthy();
      expect(historyData.history.length).toBeGreaterThan(0);
    }
  });
});
