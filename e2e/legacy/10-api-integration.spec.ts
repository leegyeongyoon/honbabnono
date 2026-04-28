import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001/api';

test.describe('API 통합 테스트', () => {
  test('GET /meetups - 모임 목록 정상 반환', async ({ request }) => {
    const res = await request.get(`${API}/meetups`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.data || data.meetups).toBeTruthy();
  });

  test('GET /meetups/home - 홈 모임 목록 반환', async ({ request }) => {
    const res = await request.get(`${API}/meetups/home`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    const meetups = data.data || data.meetups || [];
    expect(meetups.length).toBeGreaterThan(0);
  });

  test('모임 목록에 보증금 필드 포함', async ({ request }) => {
    const res = await request.get(`${API}/meetups`);
    const data = await res.json();
    const meetups = data.data || data.meetups || [];

    // 모든 모임에 promiseDepositAmount, promiseDepositRequired 필드 존재
    for (const m of meetups) {
      expect(m).toHaveProperty('promiseDepositAmount');
      expect(m).toHaveProperty('promiseDepositRequired');
    }
  });

  test('모임 상세 API 정상 반환', async ({ request }) => {
    const listRes = await request.get(`${API}/meetups`);
    const listData = await listRes.json();
    const meetups = listData.data || listData.meetups || [];

    if (meetups.length > 0) {
      const detailRes = await request.get(`${API}/meetups/${meetups[0].id}`);
      expect(detailRes.status()).toBe(200);
      const detail = await detailRes.json();
      expect(detail.meetup || detail.data).toBeTruthy();
    }
  });

  test('인증 없이 보호된 엔드포인트 접근 시 401', async ({ request }) => {
    const res = await request.post(`${API}/deposits/payment`, {
      data: { amount: 3000, meetupId: 'test', paymentMethod: 'points' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /meetups/active - 활성 모임 조회', async ({ request }) => {
    const res = await request.get(`${API}/meetups/active`);
    expect(res.status()).toBe(200);
  });

  test('GET /meetups/nearby - 주변 모임 조회', async ({ request }) => {
    const res = await request.get(`${API}/meetups/nearby?latitude=37.5665&longitude=126.9780`);
    expect(res.status()).toBe(200);
  });

  test('보증금 모임의 promiseDepositAmount > 0', async ({ request }) => {
    const res = await request.get(`${API}/meetups`);
    const data = await res.json();
    const meetups = data.data || data.meetups || [];

    const depositMeetups = meetups.filter((m: any) => m.promiseDepositRequired);
    for (const m of depositMeetups) {
      expect(m.promiseDepositAmount).toBeGreaterThan(0);
    }
  });
});
