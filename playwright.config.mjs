import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // Keep trace artifacts outside the Vite root so they cannot trigger HMR during browser tests.
  outputDir: '../.playwright-output',
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
