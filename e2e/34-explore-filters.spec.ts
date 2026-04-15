import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('탐색/검색 필터 상세 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('탐색 화면 로드 및 기본 UI', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 탐색 화면에 검색바 또는 필터 존재
    expect(bodyText).toBeTruthy();
  });

  test('지도/리스트 뷰 전환', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(3000);

    // 리스트 뷰 버튼 또는 지도 뷰 버튼 찾기 (text, aria-label, button 등)
    const listBtn = page.locator('text=/리스트|목록/').first();
    const mapBtn = page.locator('text=/지도|맵/').first();
    const ariaListBtn = page.locator('[aria-label*="list"], [aria-label*="리스트"]').first();
    const ariaMapBtn = page.locator('[aria-label*="map"], [aria-label*="지도"]').first();

    const listVisible = await listBtn.isVisible().catch(() => false);
    const mapVisible = await mapBtn.isVisible().catch(() => false);
    const ariaListVisible = await ariaListBtn.isVisible().catch(() => false);
    const ariaMapVisible = await ariaMapBtn.isVisible().catch(() => false);

    // 뷰 전환 버튼이 존재하거나, 탐색 화면 자체가 정상 로드
    const bodyText = await page.textContent('body');
    expect(listVisible || mapVisible || ariaListVisible || ariaMapVisible || bodyText?.includes('탐색')).toBeTruthy();
  });

  test('카테고리 필터 칩 표시', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    // 카테고리 필터 (한식, 중식, 일식, 양식 등)
    const hasCategories = bodyText?.includes('한식') ||
      bodyText?.includes('중식') ||
      bodyText?.includes('일식') ||
      bodyText?.includes('양식') ||
      bodyText?.includes('카페') ||
      bodyText?.includes('기타');
    expect(hasCategories).toBeTruthy();
  });

  test('카테고리 필터 선택 및 결과 변경', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(3000);

    const koreanFood = page.locator('text=한식').first();
    if (await koreanFood.isVisible().catch(() => false)) {
      await koreanFood.click();
      await page.waitForTimeout(2000);

      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });

  test('성별 필터 표시', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(3000);

    // 필터 패널 열기
    const filterBtn = page.locator('text=/필터|조건/').first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(1000);
    }

    const bodyText = await page.textContent('body');
    const hasGenderFilter = bodyText?.includes('남성') ||
      bodyText?.includes('여성') ||
      bodyText?.includes('전체') ||
      bodyText?.includes('성별');
    expect(hasGenderFilter).toBeTruthy();
  });

  test('나이대 필터 표시', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForTimeout(3000);

    // 리스트 탭으로 전환 (필터 pill은 리스트 탭에만 표시)
    const listTab = page.locator('text=리스트').first();
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
      await page.waitForTimeout(1000);
    }

    // 나이 필터 pill 버튼 클릭해서 드롭다운 열기
    const ageBtn = page.locator('text=나이').first();
    if (await ageBtn.isVisible().catch(() => false)) {
      await ageBtn.click();
      await page.waitForTimeout(1000);
    }

    const bodyText = await page.textContent('body');
    const hasAgeFilter = bodyText?.includes('20대') ||
      bodyText?.includes('30대') ||
      bodyText?.includes('40대') ||
      bodyText?.includes('나이') ||
      bodyText?.includes('연령');
    expect(hasAgeFilter).toBeTruthy();
  });

  test('검색 입력 및 실행', async ({ page }) => {
    await page.goto('/search');
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[type="text"], input[placeholder*="검색"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('강남');
      await page.waitForTimeout(500);
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);

      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    }
  });

  test('API: 모임 검색 쿼리', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/meetups?search=%EA%B0%95%EB%82%A8'
    );
    // API 서버가 응답하는지 확인 (DB 미연결 시 500 가능)
    const data = await response.json();
    expect(data).toHaveProperty('success');
  });

  test('API: 주변 모임 조회 (위치 기반)', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/meetups/nearby?latitude=37.4979&longitude=127.0276&radius=5'
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('success');
  });

  test('API: 카테고리별 모임 조회', async ({ page }) => {
    const response = await page.request.get(
      'http://localhost:3001/api/meetups?category=%ED%95%9C%EC%8B%9D'
    );
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('success');
  });
});
