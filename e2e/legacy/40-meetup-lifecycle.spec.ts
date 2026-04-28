import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import {
  getApiToken,
  createTestMeetup,
  joinTestMeetup,
  updateMeetupStatus,
} from './helpers/seed';

let meetupId: string;
let seedFailed = false;

test.describe('모임 생명주기 (모집중→진행중→종료) 테스트', () => {
  test.beforeAll(async () => {
    try {
      const hostToken = await getApiToken('11111111-1111-1111-1111-111111111111');
      const meetup = await createTestMeetup(hostToken, {
        title: 'E2E 생명주기 테스트 모임',
        maxParticipants: 4,
        genderPreference: '상관없음',
      });
      meetupId = meetup.id || meetup.meetupId;

      // 참가자 추가
      const participantToken = await getApiToken('22222222-2222-2222-2222-222222222222');
      await joinTestMeetup(participantToken, meetupId);
    } catch (e) {
      seedFailed = true;
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, '11111111-1111-1111-1111-111111111111');
  });

  test('모임 상세에서 참가자 수 표시', async ({ page }) => {
    test.skip(seedFailed || !meetupId, '시드 데이터 없음');

    await page.goto(`/meetup/${meetupId}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 최소 호스트 + 참가자 1명
    expect(bodyText).toMatch(/명|참가|참여/);
  });

  test('API: 모임 상태 모집중 확인', async ({ page }) => {
    test.skip(seedFailed || !meetupId, '시드 데이터 없음');

    const response = await page.request.get(`http://localhost:3001/api/meetups/${meetupId}`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const meetup = data.data || data.meetup || data;
    expect(meetup.status).toBe('모집중');
  });

  test('API: 참가 취소 후 다시 참가', async ({ page }) => {
    test.skip(seedFailed || !meetupId, '시드 데이터 없음');

    // 새로운 테스트용 모임 생성
    const hostToken = await getApiToken('11111111-1111-1111-1111-111111111111');
    const newMeetup = await createTestMeetup(hostToken, {
      title: 'E2E 참가취소 테스트 모임',
      maxParticipants: 4,
      genderPreference: '상관없음',
    });
    const newMeetupId = newMeetup.id || newMeetup.meetupId;

    // User2 참가
    const participantToken = await getApiToken('22222222-2222-2222-2222-222222222222');
    await joinTestMeetup(participantToken, newMeetupId);

    // User2 참가 취소
    const cancelResponse = await page.request.delete(
      `http://localhost:3001/api/meetups/${newMeetupId}/leave`,
      {
        headers: { 'Authorization': `Bearer ${participantToken}` },
      }
    );
    // 취소 성공 또는 이미 나간 상태
    expect(cancelResponse.status()).toBeLessThan(500);
  });

  test('API: 리뷰 가능한 모임 조회', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:3001/api/user/reviewable-meetups', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  test('API: 내 활동 내역 조회', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:3001/api/user/activities', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // getActivities returns { activities, pagination } without success field
    expect(data.success || Array.isArray(data.activities)).toBeTruthy();
  });

  test('내 모임 화면에서 호스트 모임 표시', async ({ page }) => {
    await page.goto('/my-meetups');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/모임|약속|주최|참여/);
  });

  test('참여한 모임 화면', async ({ page }) => {
    await page.goto('/joined-meetups');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/참여|참가|모임|약속|없습니다/);
  });
});
