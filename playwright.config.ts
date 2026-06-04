import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/legacy/**'],
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  // API(3001) + 웹(3000) 자동 기동 — 이미 떠 있으면 재사용
  webServer: [
    {
      command: 'npm run server',
      port: 3001,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { NODE_ENV: 'test', E2E_LISTEN: 'true' },
    },
    {
      command: 'npm run web',
      port: 3000,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    permissions: ['geolocation'],
    geolocation: { latitude: 37.4979, longitude: 127.0276 },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 430, height: 932 } },
    },
  ],
});
