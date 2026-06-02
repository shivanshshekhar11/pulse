import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3003',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @pulse-flags/api dev',
      url: 'http://127.0.0.1:4000/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm run dev',
      url: 'http://127.0.0.1:3003',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
