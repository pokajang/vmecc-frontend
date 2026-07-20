import { defineConfig, devices } from '@playwright/test'

const frontendUrl = 'http://127.0.0.1:3011'
const apiUrl = 'http://127.0.0.1:8011/api'
const runId = process.env.E2E_RUN_ID || ''

if (!/^VMECC-QA-\d{8}-\d{6}-[a-z0-9]{6}$/.test(runId)) {
  throw new Error('Report-media E2E requires a valid E2E_RUN_ID and an active guarded lock')
}

process.env.VMECC_E2E_BASE_URL = frontendUrl
process.env.VMECC_E2E_API_URL = apiUrl
process.env.VMECC_E2E_BROWSER_API_URL = apiUrl

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: `../.qa/${runId}/evidence/playwright-report-media`,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: frontendUrl,
    channel: process.env.VMECC_E2E_BROWSER_CHANNEL || 'chrome',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'],
    },
  },
  webServer: [
    {
      command: `powershell -NoProfile -Command "& { & './scripts/Invoke-E2eArtisan.ps1' -RunId '${runId}' -BackendPort 8011 -FrontendPort 3011 -ArtisanArguments @('serve','--host=127.0.0.1','--port=8011') }"`,
      cwd: '../vmecc-backend',
      url: 'http://127.0.0.1:8011',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        REPORT_MEDIA_DRILL_UPLOAD_ENABLED: 'true',
        REPORT_MEDIA_MINIMUM_DISK_FREE_BYTES: '0',
      },
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 3011 --strictPort',
      cwd: '.',
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_URL: apiUrl,
        VMECC_E2E_API_URL: apiUrl,
        VMECC_E2E_BROWSER_API_URL: apiUrl,
        VMECC_E2E_BASE_URL: frontendUrl,
      },
    },
  ],
})
