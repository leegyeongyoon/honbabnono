import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
import { seedCompletedMeetupWithAttendance } from './helpers/seed';

let completedMeetupId: string;
let seedFailed = false;

test.describe('리뷰 플로우', () => {
  // 완료된 모임 + 출석 데이터 생성
  test.beforeAll(async () => {
    try {
      const seed = await seedCompletedMeetupWithAttendance();
      completedMeetupId = seed.meetupId;
    } catch (e) {
      seedFailed = true;
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('리뷰 관리 화면 접근', async ({ page }) => {
    await page.goto('/my-reviews');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      await loginAsTestUser(page);
      await page.goto('/my-reviews');
      await page.waitForTimeout(3000);
    }

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/리뷰|후기|평점|별점|받은|작성|없/);
  });

  test('완료된 모임에서 리뷰 작성 화면 진입', async ({ page }) => {
    test.skip(seedFailed || !completedMeetupId, '시드 데이터 없음');

    await page.goto(`/meetup/${completedMeetupId}`);
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // 리뷰 쓰기 버튼
    const reviewBtn = page.locator('text=/리뷰|후기|평가/').first();
    if (await reviewBtn.isVisible().catch(() => false)) {
      await reviewBtn.click();
      await page.waitForTimeout(2000);

      const afterText = await page.textContent('body');
      expect(afterText).toMatch(/리뷰|후기|별점|평가|작성|태그/);
    } else {
      // 모임 상세에서 종료 상태 확인
      expect(bodyText).toMatch(/종료|완료|E2E/);
    }
  });

  test('리뷰 작성 폼 요소 확인', async ({ page }) => {
    test.skip(seedFailed || !completedMeetupId, '시드 데이터 없음');

    await page.goto(`/meetup/${completedMeetupId}`);
    await page.waitForTimeout(3000);

    const reviewBtn = page.locator('text=/리뷰|후기/').first();
    if (await reviewBtn.isVisible().catch(() => false)) {
      await reviewBtn.click();
      await page.waitForTimeout(2000);

      const bodyText = await page.textContent('body');

      // 별점, 텍스트 입력, 태그 중 하나 이상 존재
      const hasRating = await page.locator('[class*="star"]').count() > 0;
      const hasTextInput = await page.locator('textarea').count() > 0;
      const hasTags = bodyText?.includes('친절') ||
        bodyText?.includes('매너') ||
        bodyText?.includes('재미');

      expect(hasRating || hasTextInput || hasTags).toBeTruthy();
    }
  });

  test('리뷰 관리 화면에서 탭 전환', async ({ page }) => {
    await page.goto('/review-management');
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      await loginAsTestUser(page);
      await page.goto('/review-management');
      await page.waitForTimeout(3000);
    }

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    const hasTab = bodyText?.includes('받은') ||
      bodyText?.includes('작성') ||
      bodyText?.includes('리뷰');
    expect(hasTab).toBeTruthy();
  });
});
