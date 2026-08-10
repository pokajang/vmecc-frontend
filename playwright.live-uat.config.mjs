import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

const expectedBaseUrl = 'https://vmecc.amiosh.com'
const expectedApiUrl = 'https://vmecc-api.amiosh.com/api'
const baseURL = String(process.env.VMECC_LIVE_UAT_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '')
const apiURL = String(process.env.VMECC_LIVE_UAT_API_URL || '')
  .trim()
  .replace(/\/+$/, '')
const runId = String(process.env.E2E_RUN_ID || '').trim()

if (process.env.VMECC_LIVE_UAT !== '1') {
  throw new Error('Live UAT requires VMECC_LIVE_UAT=1')
}
if (process.env.VMECC_LIVE_UAT_READ_ONLY !== '1') {
  throw new Error('Live UAT requires VMECC_LIVE_UAT_READ_ONLY=1')
}
if (baseURL !== expectedBaseUrl) {
  throw new Error(`VMECC_LIVE_UAT_BASE_URL must be exactly ${expectedBaseUrl}`)
}
if (apiURL !== expectedApiUrl) {
  throw new Error(`VMECC_LIVE_UAT_API_URL must be exactly ${expectedApiUrl}`)
}
if (!/^VMECC-QA-\d{8}-\d{6}-[a-z0-9]{6}$/.test(runId)) {
  throw new Error('Live UAT requires E2E_RUN_ID in VMECC-QA-YYYYMMDD-HHMMSS-abcdef format')
}

const outputDir = resolve('..', '.qa', runId, 'evidence', 'playwright', 'live-uat')

export default defineConfig({
  testDir: './tests/e2e/live-uat',
  outputDir,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [['list']],
  use: {
    baseURL,
    serviceWorkers: 'block',
    // Playwright traces retain form-fill actions, so keep them disabled for
    // credentialed production UAT. Sanitized ledgers and screenshots remain.
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'live-mobile-chrome',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        channel: process.env.VMECC_E2E_BROWSER_CHANNEL || 'chrome',
      },
    },
    {
      name: 'live-desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        channel: process.env.VMECC_E2E_BROWSER_CHANNEL || 'chrome',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
