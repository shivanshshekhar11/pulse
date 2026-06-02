import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// The seed always sets the NovaPay web dev key to this literal value.
// In CI, docker compose brings up a fresh DB and the seed re-creates it.
const TEST_API_KEY = 'ps_test_your_api_key_here';
const API_URL      = process.env.NEXT_PUBLIC_PULSE_URL || 'http://127.0.0.1:4000';
const APP_URL      = 'http://127.0.0.1:3003';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: APP_URL,
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
      // Start the Fastify API. In CI, postgres/redis are already running via
      // docker compose. We inject credentials so env.ts picks them up directly
      // without relying on .env.development being present.
      command: 'pnpm --filter @pulse-flags/api dev',
      url: `${API_URL}/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://pulse:pulse@localhost:5432/pulse',
        REDIS_URL:    process.env.REDIS_URL    || 'redis://localhost:6379',
        API_PORT:     '4000',
        NODE_ENV:     'test',
        // Must be ≥ 32 chars to pass Zod validation in env.ts
        JWT_SECRET:         'test-jwt-secret-change-in-production-min-32-chars',
        JWT_REFRESH_SECRET: 'test-refresh-secret-change-in-production-min-32',
        ALLOWED_ORIGINS: `http://localhost:3003,http://127.0.0.1:3003`,
      },
    },
    {
      // Start the example Next.js app. NEXT_PUBLIC_* vars are read at startup in
      // dev mode, so we can inject the seeded API key directly here.
      command: 'pnpm run dev',
      url: APP_URL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: {
        NEXT_PUBLIC_PULSE_URL:     API_URL,
        NEXT_PUBLIC_API_URL:       API_URL,
        // This key is hard-coded in seed.ts for the NovaPay web development env
        NEXT_PUBLIC_PULSE_API_KEY: process.env.NEXT_PUBLIC_PULSE_API_KEY || TEST_API_KEY,
      },
    },
  ],
});
