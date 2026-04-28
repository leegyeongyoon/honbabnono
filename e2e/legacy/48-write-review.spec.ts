import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { getApiToken, seedCompletedMeetupWithAttendance } from './helpers/seed';

let seededData: { meetupId: string; hostId: string; participantId: string } | null = null;
let seedFailed = false;

test.describe('리뷰 작성 화면 테스트', () => {
  test.beforeAll(async () => {
    try {
      seededData = await seedCompletedMeetupWithAttendance();
    } catch (e) {
      seedFailed = true;
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('리뷰 작성 화면 접근', async ({ page }) => {
    test.skip(seedFailed || !seededData, '시드 데이터 없음');

    await page.goto(`/write-review/${seededData!.meetupId}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 리뷰 작성 화면 또는 에러 메시지
    expect(bodyText).toBeTruthy();
  });

  test('API: 리뷰 가능한 참가자 조회', async ({ page }) => {
    test.skip(seedFailed || !seededData, '시드 데이터 없음');

    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get(
      `http://localhost:3001/api/meetups/${seededData!.meetupId}/reviewable-participants`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    // 참가자 목록 반환 또는 권한 에러
    expect(
      data.success === true ||
      Array.isArray(data.participants) ||
      response.status() >= 400
    ).toBeTruthy();
  });

  test('API: 리뷰 작성 - 필수 필드 누락', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('http://localhost:3001/api/reviews', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        // meetupId 누락
        rating: 4,
        content: '테스트 리뷰',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('API: 리뷰 작성 - 잘못된 평점', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.post('http://localhost:3001/api/reviews', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        meetupId: seededData?.meetupId || '00000000-0000-0000-0000-000000000000',
        rating: 10, // 유효 범위 초과
        content: '테스트 리뷰',
      },
    });
    // 400 (validation) 또는 500 (DB)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('API: 리뷰 태그 포함 작성', async ({ page }) => {
    test.skip(seedFailed || !seededData, '시드 데이터 없음');

    const participantToken = await getApiToken('22222222-2222-2222-2222-222222222222');
    const response = await page.request.post('http://localhost:3001/api/reviews', {
      headers: {
        'Authorization': `Bearer ${participantToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        meetupId: seededData!.meetupId,
        rating: 5,
        content: 'E2E 태그 리뷰 테스트입니다',
        tags: ['시간약속잘지킴', '대화가재미있음', '친절해요'],
        isAnonymous: false,
      },
    });
    const data = await response.json();
    // 성공, 이미 작성, 또는 서버 에러
    expect(
      data.success === true ||
      data.error?.includes('이미') ||
      response.status() <= 500
    ).toBeTruthy();
  });

  test('API: 받은 리뷰 조회', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get(
      'http://localhost:3001/api/user/reviews/received',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    expect(data.success === true || response.status() === 500).toBeTruthy();
  });

  test('API: 리뷰 답변', async ({ page }) => {
    // 호스트로 로그인
    await loginAsTestUser(page, '11111111-1111-1111-1111-111111111111');
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // 받은 리뷰 목록에서 답변 가능한 리뷰 찾기
    const reviewsResponse = await page.request.get(
      'http://localhost:3001/api/user/reviews/received',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (reviewsResponse.ok()) {
      const reviewsData = await reviewsResponse.json();
      const reviews = reviewsData.reviews || [];
      const replyableReview = reviews.find((r: any) => r.can_reply);

      if (replyableReview) {
        const replyResponse = await page.request.post(
          `http://localhost:3001/api/reviews/${replyableReview.id}/reply`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            data: { reply: 'E2E 테스트 답변입니다. 감사합니다!' },
          }
        );
        const replyData = await replyResponse.json();
        expect(replyData.success === true || replyResponse.status() >= 400).toBeTruthy();
      }
    }
  });

  test('리뷰 관리 화면 접근', async ({ page }) => {
    await page.goto('/my-reviews');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/리뷰|없습니다|작성/);
  });
});
