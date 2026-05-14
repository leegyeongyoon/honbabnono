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

      // 헤드라인 영역 스크린샷 (상단 700px)
      await page.screenshot({
        path: path.join(OUT, `${a.name}.png`),
        clip: { x: 0, y: 0, width: 1280, height: 700 },
      });
      console.log(`   ✓ ${a.name}.png`);
    } catch (e: any) {
      console.error(`   ✗ ${a.name}: ${e.message?.slice(0, 100)}`);
    }
  }

  await browser.close();
  console.log(`\n📂 출력: ${OUT}`);
})();
