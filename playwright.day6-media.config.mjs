import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config.mjs'

const baseURL = 'http://127.0.0.1:4177'

export default defineConfig({
  ...baseConfig,
  testMatch: 'live-uat-day6-media.spec.js',
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4177 --strictPort',
    url: `${baseURL}/tests/e2e/fixtures/day6-media-harness.html`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  use: {
    ...baseConfig.use,
    baseURL,
  },
})
