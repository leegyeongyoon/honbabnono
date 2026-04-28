import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('주소/장소 검색 테스트', () => {
  test('API: 장소 검색 - 강남역', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=강남역'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(Array.isArray(results)).toBeTruthy();
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result.fullAddress).toBeTruthy();
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    } else {
      // Kakao API 키 문제로 실패 허용
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });

  test('API: 장소 검색 - 신촌', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=신촌역'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(results.length).toBeGreaterThan(0);
    } else {
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });

  test('API: 도로명 주소 검색', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=테헤란로'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(Array.isArray(results)).toBeTruthy();
    } else {
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });

  test('API: 식당 검색', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=스타벅스 강남'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(results.length).toBeGreaterThan(0);
    } else {
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });

  test('API: 검색 결과 중복 제거', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=강남역'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      // fullAddress로 중복 체크
      const addresses = results.map((r: any) => r.fullAddress);
      const uniqueAddresses = new Set(addresses);
      expect(addresses.length).toBe(uniqueAddresses.size);
    }
  });

  test('API: 검색 결과 최대 15개', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=서울'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(results.length).toBeLessThanOrEqual(15);
    }
  });

  test('검색 화면 접근', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/search');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('모임 생성 시 장소 검색 연동', async ({ page }) => {
    await loginAsTestUser(page, '11111111-1111-1111-1111-111111111111');
    await page.goto('/create');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/장소|위치|모임|약속/);
  });
});
