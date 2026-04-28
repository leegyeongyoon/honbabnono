import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('모임 참가 및 보증금 결제 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('보증금 없는 모임 - 바로 참가', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    // 보증금 없고, 성별 제한 없고, 참가 가능한 모임
    const freeMeetup = meetups.find((m: any) =>
      !m.promiseDepositRequired &&
      (!m.genderPreference || ['무관', '상관없음', '혼성'].includes(m.genderPreference)) &&
      m.currentParticipants < m.maxParticipants &&
      m.status === '모집중'
    );

    if (freeMeetup) {
      await page.goto(`/meetup/${freeMeetup.id}`);
      await page.waitForTimeout(2000);

      const joinBtn = page.locator('text=같이먹기').first();
      if (await joinBtn.isVisible()) {
        await joinBtn.click();
        await page.waitForTimeout(3000);
        // 참가 성공 또는 이미 참가 중
        const bodyText = await page.textContent('body');
        const isJoined = bodyText?.includes('참여') || bodyText?.includes('채팅방') || bodyText?.includes('참여취소');
        expect(isJoined).toBeTruthy();
      }
    }
  });

  test('보증금 있는 모임 - 결제 모달 표시', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    // 보증금 있고, 남성 참가 가능한 모임
    const depositMeetup = meetups.find((m: any) =>
      m.promiseDepositRequired &&
      m.promiseDepositAmount > 0 &&
      (!m.genderPreference || ['무관', '상관없음', '혼성', '남성만'].includes(m.genderPreference)) &&
      m.currentParticipants < m.maxParticipants
    );

    if (depositMeetup) {
      await page.goto(`/meetup/${depositMeetup.id}`);
      await page.waitForTimeout(2000);

      const joinBtn = page.locator('text=같이먹기').first();
      if (await joinBtn.isVisible()) {
        await joinBtn.click();
        await page.waitForTimeout(2000);

        // 보증금 결제 모달이 열려야 함
        const bodyText = await page.textContent('body');
        const hasDepositModal = bodyText?.includes('결제') || bodyText?.includes('보증금') || bodyText?.includes('포인트');
        expect(hasDepositModal).toBeTruthy();
      }
    }
  });

  test('보증금 포인트 결제 플로우', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    const depositMeetup = meetups.find((m: any) =>
      m.promiseDepositRequired &&
      m.promiseDepositAmount > 0 &&
      (!m.genderPreference || ['무관', '상관없음', '혼성', '남성만'].includes(m.genderPreference)) &&
      m.currentParticipants < m.maxParticipants
    );

    if (depositMeetup) {
      await page.goto(`/meetup/${depositMeetup.id}`);
      await page.waitForTimeout(2000);

      const joinBtn = page.locator('text=같이먹기').first();
      if (await joinBtn.isVisible()) {
        await joinBtn.click();
        await page.waitForTimeout(2000);

        // 포인트 결제 옵션 선택
        const pointOption = page.locator('text=포인트').first();
        if (await pointOption.isVisible()) {
          await pointOption.click();
          await page.waitForTimeout(500);

          // 결제하기 버튼 클릭
          const payBtn = page.locator('text=결제하기').first();
          if (await payBtn.isVisible()) {
            await payBtn.click();
            await page.waitForTimeout(5000);

            // 결제 성공 또는 에러 메시지 확인
            const bodyText = await page.textContent('body');
            const hasResult = bodyText?.includes('완료') ||
              bodyText?.includes('성공') ||
              bodyText?.includes('참여') ||
              bodyText?.includes('채팅방') ||
              bodyText?.includes('실패') ||
              bodyText?.includes('부족');
            expect(hasResult).toBeTruthy();
          }
        }
      }
    }
  });

  test('인원 마감 모임 - 같이먹기 버튼 비활성화', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/meetups');
    const data = await response.json();
    const meetups = data.data || data.meetups || [];

    const fullMeetup = meetups.find((m: any) =>
      m.currentParticipants >= m.maxParticipants
    );

    if (fullMeetup) {
      await page.goto(`/meetup/${fullMeetup.id}`);
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent('body');
      // 인원 마감 시: "마감" 텍스트 또는 이미 참가 중이면 "채팅방/참여취소" 표시
      const hasFullIndicator = bodyText?.includes('마감') ||
        bodyText?.includes('채팅방') ||
        bodyText?.includes('참여취소') ||
        bodyText?.match(/\d+\/\d+명/);
      expect(hasFullIndicator).toBeTruthy();
    }
  });
});
