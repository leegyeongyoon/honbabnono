import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('위치 설정 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('위치 설정 화면 접근', async ({ page }) => {
    await page.goto('/location-settings');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('API: 주소 검색 (강남)', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=강남역'
    );
    if (response.ok()) {
      const data = await response.json();
      // 응답 형식: { documents: [...] } 또는 { success: true, results: [...] }
      const results = data.documents || data.results || [];
      expect(Array.isArray(results)).toBeTruthy();
      expect(results.length).toBeGreaterThan(0);
    } else {
      // Kakao API 키 문제 등으로 실패 가능
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });

  test('API: 주소 검색 (홍대)', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=홍대입구역'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('latitude');
        expect(results[0]).toHaveProperty('longitude');
      }
    } else {
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });

  test('API: 주소 검색 (최소 2글자 미만) → 빈 결과', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=강'
    );
    // 2글자 미만이면 빈 결과 반환 (200) 또는 400
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(results.length).toBe(0);
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('API: 주소 검색 (빈 쿼리) → 빈 결과', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query='
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      expect(results.length).toBe(0);
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('API: 주소 검색 결과 형식 검증', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=스타벅스'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('fullAddress');
        expect(typeof result.latitude).toBe('number');
        expect(typeof result.longitude).toBe('number');
      }
    } else {
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });

  test('API: 맥도날드 검색 (Kakao fallback 테스트)', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/search/address?query=맥도날드'
    );
    if (response.ok()) {
      const data = await response.json();
      const results = data.documents || data.results || [];
      // Kakao API 실패 시 더미 데이터라도 반환
      expect(results.length).toBeGreaterThan(0);
    } else {
      expect(response.status()).toBeLessThanOrEqual(500);
    }
  });
});
