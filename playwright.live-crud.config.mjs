import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'
import { requireControlledCrudEnvironment } from './tests/e2e/live-uat/live-crud-support.js'

const { runId } = requireControlledCrudEnvironment()

export default defineConfig({
  testDir: './tests/e2e/live-crud',
  outputDir: resolve('..', '.qa', runId, 'evidence', 'playwright', 'live-crud'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'https://vmecc.amiosh.com',
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'live-crud-mobile-chrome',
      use: { ...devices['iPhone 13'], browserName: 'chromium', channel: 'chrome' },
    },
    {
      name: 'live-crud-desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
