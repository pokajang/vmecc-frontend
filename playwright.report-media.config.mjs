import { defineConfig, devices } from '@playwright/test'

const frontendUrl = 'http://127.0.0.1:3011'
const apiUrl = 'http://127.0.0.1:8011/api'

process.env.VMECC_E2E_BASE_URL = frontendUrl
process.env.VMECC_E2E_API_URL = apiUrl
process.env.VMECC_E2E_BROWSER_API_URL = apiUrl

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '../.playwright-output/report-media',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: frontendUrl,
    channel: process.env.VMECC_E2E_BROWSER_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'php artisan serve --host=127.0.0.1 --port=8011',
      cwd: '../vmecc-backend',
      url: 'http://127.0.0.1:8011',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        APP_URL: 'http://127.0.0.1:8011',
        CORS_ALLOWED_ORIGINS: frontendUrl,
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
