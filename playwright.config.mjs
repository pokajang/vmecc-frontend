import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000',
    channel: process.env.VMECC_E2E_BROWSER_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
  },
})
