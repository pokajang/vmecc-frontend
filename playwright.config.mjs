import { defineConfig, devices } from '@playwright/test'

const runId = process.env.E2E_RUN_ID || ''
const baseURL = process.env.VMECC_E2E_BASE_URL || 'http://127.0.0.1:3000'
const apiURL = process.env.VMECC_E2E_API_URL || 'http://127.0.0.1:8000/api'

const assertControlledOrigin = (value, label) => {
  const url = new URL(value)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port) {
    throw new Error(`${label} must use an explicit http://127.0.0.1:<port> origin`)
  }
}

if (process.env.VMECC_SYSTEM_QA === '1') {
  if (!/^VMECC-QA-\d{8}-\d{6}-[a-z0-9]{6}$/.test(runId)) {
    throw new Error('VMECC_SYSTEM_QA requires a valid E2E_RUN_ID')
  }
  assertControlledOrigin(baseURL, 'VMECC_E2E_BASE_URL')
  assertControlledOrigin(apiURL, 'VMECC_E2E_API_URL')
}

export default defineConfig({
  testDir: './tests/e2e',
  // Keep trace artifacts outside the Vite root so they cannot trigger HMR during browser tests.
  outputDir: runId ? `../.qa/${runId}/evidence/playwright` : '../.playwright-output',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    channel: process.env.VMECC_E2E_BROWSER_CHANNEL || 'chrome',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
    },
  },
})
