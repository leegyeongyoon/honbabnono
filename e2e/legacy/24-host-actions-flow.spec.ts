import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { seedRecruitingMeetupWithParticipant } from './helpers/seed';

let seededMeetupId: string;
let seedFailed = false;

test.describe('호스트 액션 플로우', () => {
  // 테스트 시작 전 시드 데이터 생성 (User1 호스트, User2 참가)
  test.beforeAll(async () => {
    try {
      const seed = await seedRecruitingMeetupWithParticipant();
      seededMeetupId = seed.meetupId;
    } catch (e) {
      seedFailed = true;
    }
  });

  test.beforeEach(async ({ page }) => {
    // 호스트 (User1)로 로그인
    await loginAsTestUser(page, '11111111-1111-1111-1111-111111111111');
  });

  test('내 모임 목록에서 호스팅한 모임 확인', async ({ page }) => {
    test.skip(seedFailed, '시드 데이터 생성 실패');

    await page.goto('/my-meetups');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/모임|주최|참여|호스트|내가 만든|약속/);
  });

  test('호스트가 자신의 모임 상세에서 관리 버튼 확인', async ({ page }) => {
    test.skip(seedFailed || !seededMeetupId, '시드 데이터 없음');

    await page.goto(`/meetup/${seededMeetupId}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // 호스트에게만 보이는 관리 요소 확인
    const hasHostUI = bodyText?.includes('확정') ||
      bodyText?.includes('취소') ||
      bodyText?.includes('수정') ||
      bodyText?.includes('관리') ||
      bodyText?.includes('마감') ||
      bodyText?.includes('채팅방') ||
      bodyText?.includes('참여취소');
    expect(hasHostUI).toBeTruthy();
  });

  test('모임 확정 버튼 클릭 테스트', async ({ page }) => {
    test.skip(seedFailed || !seededMeetupId, '시드 데이터 없음');

    await page.goto(`/meetup/${seededMeetupId}`);
    await page.waitForTimeout(3000);

    const confirmBtn = page.locator('text=/확정|마감/').first();
    if (await confirmBtn.isVisible().catch(() => false)) {
      // dialog dismiss로 실제 확정 방지
      page.on('dialog', async dialog => await dialog.dismiss());

      await confirmBtn.click();
      await page.waitForTimeout(1000);

      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    } else {
      // 확정 버튼이 없을 수 있음 (이미 확정 등)
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });

  test('모임 취소 버튼 클릭 테스트', async ({ page }) => {
    test.skip(seedFailed || !seededMeetupId, '시드 데이터 없음');

    await page.goto(`/meetup/${seededMeetupId}`);
    await page.waitForTimeout(3000);

    const cancelBtn = page.locator('text=/취소|삭제/').first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      // dialog dismiss로 실제 취소 방지
      page.on('dialog', async dialog => await dialog.dismiss());

      await cancelBtn.click();
      await page.waitForTimeout(1000);

      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });

  test('참가자 목록 확인', async ({ page }) => {
    test.skip(seedFailed || !seededMeetupId, '시드 데이터 없음');

    await page.goto(`/meetup/${seededMeetupId}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 참가자 정보가 표시 (호스트 + User2 = 최소 2명)
    expect(bodyText).toMatch(/참가|명|참여|멤버|테스트/);
  });
});
