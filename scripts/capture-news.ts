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
  {
    name: 'herald-siren-order',
    url: 'https://biz.heraldcorp.com/article/10658035',
    waitFor: 'h1, .article-title, [class*=title]',
  },
  {
    name: 'khan-lunch-shift',
    url: 'https://www.khan.co.kr/article/202401120730001',
    waitFor: 'h1, .art_subject, [class*=title]',
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

      // 광고/네비/사이드바 숨기기 → 기사 본문 영역만 깨끗하게
      await page.evaluate(() => {
        const selectors = [
          '.banner', '.ad', '[class*="advertisement"]', '[class*="ad-"]',
          '[id*="banner"]', '[id*="googima"]', 'iframe[src*="ads"]',
          '.subscribe', '[class*="subscribe"]',
          // 사이드바 / 인기뉴스
          'aside', '[class*="sidebar"]', '[class*="popular"]', '[class*="rank"]',
          '[class*="recommend"]', '[class*="related"]', '.r-content',
          // 상단 글로벌 네비 (사이트 헤더)
          'header', '[class*="gnb"]', '[class*="header-"]', '[class*="topbar"]',
          // 카테고리/서브메뉴
          '[class*="category-nav"]', '.category', 'nav',
        ];
        selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => {
          (el as HTMLElement).style.display = 'none';
        }));
      }).catch(() => null);
      await page.waitForTimeout(1000);

      // 기사 본문 컨테이너 찾아 그것만 스크린샷
      const bodySelectors = [
        'article',
        '#articletxt',
        '.article-body',
        '[class*="article-cont"]',
        '[class*="article_body"]',
        '[class*="article-view"]',
        'main',
      ];

      let captured = false;
      for (const sel of bodySelectors) {
        const elem = page.locator(sel).first();
        if (await elem.isVisible().catch(() => false)) {
          const box = await elem.boundingBox().catch(() => null);
          // 충분히 wide + tall할 때만 (좁거나 짧으면 헤드라인/본문 잘림)
          if (box && box.height > 600 && box.width >= 800) {
            await page.screenshot({
              path: path.join(OUT, `${a.name}.png`),
              clip: {
                x: Math.max(0, box.x - 20),
                y: Math.max(0, box.y - 10),
                width: Math.min(1280, box.width + 40),
                height: Math.min(1200, box.height),
              },
            });
            console.log(`   ✓ ${a.name}.png (${sel} ${Math.round(box.width)}×${Math.round(box.height)})`);
            captured = true;
            break;
          }
        }
      }

      // 폴백: 헤드라인(h1) 위치를 찾고 wider clip 캡처
      if (!captured) {
        const h1 = page.locator('h1').first();
        const box = await h1.boundingBox().catch(() => null);
        const startY = box ? Math.max(0, box.y - 30) : 0;
        const startX = box ? Math.max(0, box.x - 30) : 0;
        await page.screenshot({
          path: path.join(OUT, `${a.name}.png`),
          clip: { x: startX, y: startY, width: 1200, height: 1100 },
        });
        console.log(`   ✓ ${a.name}.png (h1-based clip y=${startY})`);
      }
    } catch (e: any) {
      console.error(`   ✗ ${a.name}: ${e.message?.slice(0, 100)}`);
    }
  }

  await browser.close();
  console.log(`\n📂 출력: ${OUT}`);
})();
