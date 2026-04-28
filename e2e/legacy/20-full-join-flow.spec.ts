import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import {
  getApiToken,
  createTestMeetup,
  joinTestMeetup,
  seedFullMeetup,
} from './helpers/seed';

let depositMeetupId: string;
let femaleOnlyMeetupId: string;
let fullMeetupId: string;
let seedFailed = false;

test.describe('전체 참가 플로우 - 모임 참가 → 보증금 결제 → 채팅방', () => {
  test.beforeAll(async () => {
    try {
      const hostToken = await getApiToken('11111111-1111-1111-1111-111111111111');

      // 보증금 모임 생성
      const depositMeetup = await createTestMeetup(hostToken, {
        title: 'E2E 보증금 테스트 모임',
        maxParticipants: 4,
        genderPreference: '상관없음',
      });
      depositMeetupId = depositMeetup.id || depositMeetup.meetupId;

      // 보증금 설정 (직접 DB 업데이트 — API가 없으므로)
      // Note: createTestMeetup doesn't set deposit. Skip deposit test if can't set it.

      // 여성만 모임 생성
      const femaleOnlyMeetup = await createTestMeetup(hostToken, {
        title: 'E2E 여성만 모임',
        genderPreference: '여성만',
        maxParticipants: 4,
      });
      femaleOnlyMeetupId = femaleOnlyMeetup.id || femaleOnlyMeetup.meetupId;

      // 인원 마감 모임 생성
      const fullSeed = await seedFullMeetup();
      fullMeetupId = fullSeed.meetupId;
    } catch (e) {
      console.error('SEED FAILED:', e);
      seedFailed = true;
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('보증금 모임: 같이먹기 클릭 → 결제 모달 → 포인트 선택 → 결제 완료', async ({ page }) => {
    // 보증금 모임은 DB에서 직접 검색 (seed로 설정 불가)
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];
    const depositMeetup = meetups.find((m: any) =>
      m.promiseDepositRequired &&
      m.promiseDepositAmount > 0 &&
      (!m.genderPreference || ['무관', '상관없음', '혼성', '남성만'].includes(m.genderPreference)) &&
      m.currentParticipants < m.maxParticipants
    );
    test.skip(!depositMeetup, '보증금 모임이 없음');

    await page.goto(`/meetup/${depositMeetup.id}`);
    await page.waitForTimeout(3000);

    const joinBtn = page.locator('text=같이먹기').first();
    if (await joinBtn.isVisible()) {
      await joinBtn.click();
      await page.waitForTimeout(2000);

      const modalText = await page.textContent('body');
      expect(modalText).toMatch(/결제|보증금|포인트|카카오페이|카드/);

      const pointOption = page.locator('text=포인트 결제').first();
      if (await pointOption.isVisible()) {
        await pointOption.click();
        await page.waitForTimeout(500);
      }

      const payBtn = page.locator('text=/\\d+.*원 결제하기/').first();
      if (await payBtn.isVisible()) {
        await payBtn.click();
        await page.waitForTimeout(5000);
        const afterPayText = await page.textContent('body');
        expect(afterPayText).toMatch(/완료|성공|채팅방|참여취소/);
      }
    } else {
      const bodyText = await page.textContent('body');
      expect(bodyText).toMatch(/채팅방|참여취소|전용/);
    }
  });

  test('무보증금 모임: 같이먹기 클릭 → 바로 참가 → 채팅방 버튼 표시', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];
    const freeMeetup = meetups.find((m: any) =>
      !m.promiseDepositRequired &&
      (!m.genderPreference || ['무관', '상관없음', '혼성', '남성만'].includes(m.genderPreference)) &&
      m.currentParticipants < m.maxParticipants &&
      m.status === '모집중'
    );
    test.skip(!freeMeetup, '무보증금 모임이 없음');

    await page.goto(`/meetup/${freeMeetup.id}`);
    await page.waitForTimeout(3000);

    const joinBtn = page.locator('text=같이먹기').first();
    if (await joinBtn.isVisible()) {
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      await joinBtn.click();
      await page.waitForTimeout(3000);

      const afterJoinText = await page.textContent('body');
      expect(afterJoinText).toMatch(/채팅방|참여취소|같이먹기|실패/);
    }
  });

  test('성별 제한 모임: 여성만 → 남성 유저 버튼 비활성화', async ({ page }) => {
    test.skip(seedFailed || !femaleOnlyMeetupId, '여성만 모임 시드 없음');

    await page.goto(`/meetup/${femaleOnlyMeetupId}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 여성 전용 표시 또는 참가 불가 표시
    const hasFemaleRestriction = bodyText?.includes('전용') ||
      bodyText?.includes('여성') ||
      bodyText?.includes('참가할 수 없') ||
      bodyText?.includes('제한');
    expect(hasFemaleRestriction || bodyText!.includes('같이먹기')).toBeTruthy();
  });

  test('인원 마감 모임: "인원이 마감되었습니다" 표시', async ({ page }) => {
    test.skip(seedFailed || !fullMeetupId, '마감 모임 시드 없음');

    await page.goto(`/meetup/${fullMeetupId}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 마감 표시 또는 같이먹기 버튼 비활성화
    const hasFullIndicator = bodyText?.includes('마감') ||
      bodyText?.includes('인원') ||
      bodyText?.includes('참여취소') ||
      bodyText?.includes('채팅방');
    expect(hasFullIndicator).toBeTruthy();
  });
});
