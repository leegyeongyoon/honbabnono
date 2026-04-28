import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('모임 상세 화면', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('모임 상세 정보 표시', async ({ page }) => {
    // API에서 모임 ID 가져와서 직접 이동
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    if (meetups.length > 0) {
      await page.goto(`/meetup/${meetups[0].id}`);
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      // 참가자 수 또는 모임 관련 텍스트
      expect(bodyText).toMatch(/명|참|같이먹기/);
    }
  });

  test('성별 제한 모임 - 여성만 표시 및 버튼 비활성화', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    const femaleOnly = meetups.find((m: any) => m.genderPreference === '여성만');
    if (femaleOnly) {
      await page.goto(`/meetup/${femaleOnly.id}`);
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('여성만');
      // 남성 유저이므로 참가 불가 메시지
      expect(bodyText).toContain('전용 약속입니다');
    }
  });

  test('남성만 모임 - 남성 유저 참가 가능', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    const maleOnly = meetups.find((m: any) => m.genderPreference === '남성만');
    if (maleOnly) {
      await page.goto(`/meetup/${maleOnly.id}`);
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent('body');
      // "전용 약속입니다" 없어야 함 (남성이니까 참가 가능)
      const isDisabled = bodyText?.includes('전용 약속입니다');
      expect(isDisabled).toBeFalsy();
    }
  });

  test('보증금 모임 상세에 보증금 정보 표시', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    const depositMeetup = meetups.find((m: any) => m.promiseDepositRequired && m.promiseDepositAmount > 0);
    if (depositMeetup) {
      await page.goto(`/meetup/${depositMeetup.id}`);
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent('body');
      // 보증금 금액 표시
      expect(bodyText).toMatch(/보증금|약속금|\d+.*원/);
    }
  });
});
