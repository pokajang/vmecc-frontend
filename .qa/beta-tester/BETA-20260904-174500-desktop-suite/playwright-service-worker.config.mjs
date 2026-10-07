import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '../../../tests/e2e',
  outputDir: './service-worker-retry',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000',
    serviceWorkers: 'allow',
  },
})
