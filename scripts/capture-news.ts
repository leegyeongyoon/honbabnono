/**
 * 노쇼 기사 헤드라인 스크린샷 캡처
 * - 한국경제 (메인)
 * - 서울경제 (보조: 노쇼 위약금 40%)
 * - 더스쿠프 (보조: 업종별 노쇼 빈도)
 *
 * 출력: /tmp/news-screenshots/*.png
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const OUT = '/tmp/news-screenshots';
fs.mkdirSync(OUT, { recursive: true });

const ARTICLES = [
  {
    name: 'hankyung-noshow-44',
    url: 'https://www.hankyung.com/article/2026010165597',
    waitFor: 'h1, h2, .article-title, [class*=title]',
  },
  {
    name: 'sedaily-noshow-65',
    url: 'https://www.sedaily.com/NewsView/2K74UIRW8K',
    waitFor: 'h1, .article_head, .title',
  },
  {
    name: 'sedaily-penalty-40',
    url: 'https://www.sedaily.com/NewsView/2K74UN4HFM',
    waitFor: 'h1, .article_head, .title',
  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 1600 },
    locale: 'ko-KR',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  for (const a of ARTICLES) {
    console.log(`▶ ${a.name}`);
    try {
      await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      // 광고/마케팅 div 숨기기 (시각적 깔끔하게)
      await page.evaluate(() => {
        const selectors = [
          '.banner', '.ad', '[class*="advertisement"]', '[class*="ad-"]',
          '[id*="banner"]', '[id*="googima"]', 'iframe[src*="ads"]',
          '.subscribe', '[class*="subscribe"]',
        ];
        selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => (el as HTMLElement).style.display = 'none'));
      }).catch(() => null);

      // 기사 헤드라인 요소 찾기
      const headlineSelectors = ['h1', '.article_head .title', '.headline', '[class*=article-title]', '[class*=title]'];
      let headlineY = 0;
      for (const sel of headlineSelectors) {
        const elem = await page.locator(sel).first();
        if (await elem.isVisible().catch(() => false)) {
          const box = await elem.boundingBox().catch(() => null);
          if (box && box.y > 0) {
            headlineY = box.y;
            break;
          }
        }
      }

      // 헤드라인부터 본문 일부까지 (헤드라인 시작점 - 30px 부터 1100px 높이)
      const startY = Math.max(0, headlineY - 30);
      await page.screenshot({
        path: path.join(OUT, `${a.name}.png`),
        clip: { x: 0, y: startY, width: 1280, height: 1100 },
      });
      console.log(`   ✓ ${a.name}.png (headline y=${headlineY})`);
    } catch (e: any) {
      console.error(`   ✗ ${a.name}: ${e.message?.slice(0, 100)}`);
    }
  }

  await browser.close();
  console.log(`\n📂 출력: ${OUT}`);
})();
