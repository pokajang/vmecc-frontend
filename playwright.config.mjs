import { defineConfig, devices } from '@playwright/test'

const runId = process.env.E2E_RUN_ID || ''
const baseURL = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const apiURL = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const browserName = process.env.VMECC_E2E_BROWSER || 'chromium'

const browserDevices = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
}

if (!Object.hasOwn(browserDevices, browserName)) {
  throw new Error('VMECC_E2E_BROWSER must be one of: chromium, firefox, webkit')
}

const assertControlledOrigin = (value, label) => {
  const url = new URL(value)
  const allowedHostnames = new Set(['127.0.0.1', 'localhost'])
  if (url.protocol !== 'http:' || !allowedHostnames.has(url.hostname) || !url.port) {
    throw new Error(`${label} must use an explicit http://localhost-or-127.0.0.1:<port> origin`)
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
  outputDir: runId
    ? `../.qa/${runId}/evidence/playwright/${browserName}`
    : `../.playwright-output/${browserName}`,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    ...browserDevices[browserName],
    baseURL,
    ...(browserName === 'chromium'
      ? { channel: process.env.VMECC_E2E_BROWSER_CHANNEL || 'chrome' }
      : {}),
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    ...(browserName === 'chromium'
      ? {
          launchOptions: {
            args: ['--host-resolver-rules=EXCLUDE localhost, EXCLUDE 127.0.0.1, MAP * ~NOTFOUND'],
          },
        }
      : {}),
  },
})
