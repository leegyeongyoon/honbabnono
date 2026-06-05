import { test, expect } from '@playwright/test';

// 프로덕션 점주 앱 로그인 실패 진단 (DBG=1 전용)
test.describe('점주 로그인 디버그', () => {
  test.skip(process.env.DBG === undefined, 'DBG=1 전용');
  test.setTimeout(90000);

  test('실제 로그인 플로우 + 에러 캡처', async ({ page }) => {
    const failures: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
    page.on('requestfailed', (r) => failures.push(`FAIL ${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
    page.on('response', (r) => {
      if (r.status() >= 400) failures.push(`HTTP${r.status()} ${r.request().method()} ${r.url()}`);
    });

    console.log('=== 1) merchant.eattable.kr 접속 ===');
    const resp = await page.goto('https://merchant.eattable.kr/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => { console.log('goto 실패:', e.message); return null; });
    console.log('초기 페이지 status:', resp?.status());
    await page.waitForTimeout(3000);

    // 어떤 JS 번들을 로드하는지
    const scripts = await page.$$eval('script[src]', (els) => els.map((e) => (e as HTMLScriptElement).src));
    console.log('로드된 스크립트:', JSON.stringify(scripts));

    // 로그인 폼 찾아서 입력
    console.log('=== 2) 로그인 폼 입력 ===');
    const emailInput = page.locator('input[type="email"], input[name="email"], input[type="text"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    const hasForm = await emailInput.count() > 0 && await pwInput.count() > 0;
    console.log('로그인 폼 존재:', hasForm);

    if (hasForm) {
      await emailInput.fill('demo.merchant@eattable.kr');
      await pwInput.fill('Demo1234!');
      const loginBtn = page.locator('button[type="submit"], button:has-text("로그인")').first();
      await loginBtn.click();
      await page.waitForTimeout(5000);
      console.log('로그인 후 URL:', page.url());
      // 에러 메시지 화면에 있나
      const bodyText = await page.locator('body').innerText();
      const errMatch = bodyText.match(/서버에 연결할 수 없습니다|로그인.*실패|오류|에러|error/i);
      console.log('화면 에러 텍스트:', errMatch ? errMatch[0] : '없음');
    }

    console.log('=== 3) 실패한 네트워크 요청 ===');
    failures.forEach((f) => console.log('  ' + f));
    console.log('=== 4) 콘솔 에러 ===');
    consoleErrors.slice(0, 15).forEach((e) => console.log('  ' + e));

    expect(true).toBe(true); // 항상 통과 — 로그 수집이 목적
  });
});
