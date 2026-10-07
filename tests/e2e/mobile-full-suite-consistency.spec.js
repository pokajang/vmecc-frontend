const { expect, test } = require('@playwright/test')
const { writeFile } = require('node:fs/promises')
const manifest = require('./module-coverage.manifest.json')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const email = process.env.VMECC_MOBILE_FULL_SUITE_EMAIL || 'codex.smoke.sysadmin@vmecc.local'
const password = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'

const viewports = [
  { key: 'mobile-320', width: 320, height: 700 },
  { key: 'mobile-390', width: 390, height: 844 },
]

const routeEntries = Object.values(
  manifest.modules.reduce((entries, module) => {
    const route = String(module.route || '').trim()
    if (!route || route.includes(':')) return entries
    entries[route] = entries[route] || { route, moduleKeys: [] }
    entries[route].moduleKeys.push(module.key)
    return entries
  }, {}),
)

const dismissIncidentalObstructions = async (page) => {
  for (const label of ['Remind me later', 'Close']) {
    const action = page.getByRole('button', { name: label, exact: true }).first()
    if (await action.isVisible().catch(() => false)) await action.click()
  }
}

const loginThroughUi = async (page) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email address').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
  await dismissIncidentalObstructions(page)
}

const collectMobileMetrics = () => {
  const visible = (element) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return (
      !element.closest('[aria-hidden="true"], [inert]') &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    )
  }
  const interactive = [
    ...document.querySelectorAll(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"]',
    ),
  ].filter(visible)

  return {
    documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    viewportWidth: document.documentElement.clientWidth,
    visibleInteractiveCount: interactive.length,
    undersizedTargets: interactive
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          label: String(
            element.getAttribute('aria-label') || element.textContent || element.tagName,
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 100),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        }
      })
      .filter(({ width, height }) => width < 44 || height < 44),
  }
}

test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 1 })

test('all registered module entry routes remain mobile-renderable', async ({ page }, testInfo) => {
  test.skip(
    process.env.VMECC_MOBILE_FULL_SUITE !== '1',
    'Set VMECC_MOBILE_FULL_SUITE=1 after running the smoke persona seeder.',
  )
  test.setTimeout(12 * 60_000)

  const pageErrors = []
  const consoleErrors = []
  const failedResponses = []
  page.on('pageerror', (error) => pageErrors.push({ page: page.url(), message: error.message }))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push({ page: page.url(), message: message.text() })
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 500) {
      failedResponses.push({ page: page.url(), status: response.status(), url: response.url() })
    }
  })

  await loginThroughUi(page)
  const ledger = []

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const entry of routeEntries) {
      const errorOffsets = {
        page: pageErrors.length,
        console: consoleErrors.length,
        response: failedResponses.length,
      }
      await page.goto(`${baseUrl}${entry.route}`, { waitUntil: 'domcontentloaded' })
      await dismissIncidentalObstructions(page)
      await expect(page).not.toHaveURL(/\/login(?:[/?]|$)/)
      await expect(page.getByText(/Unable to restore session/i)).toHaveCount(0)
      await expect(page.locator('body')).not.toBeEmpty()

      const metrics = await page.evaluate(collectMobileMetrics)
      expect(
        metrics.documentWidth,
        `${entry.route} overflowed ${viewport.key}`,
      ).toBeLessThanOrEqual(metrics.viewportWidth + 1)

      const evidenceName = `${viewport.key}-${entry.moduleKeys.join('_')}`.replace(
        /[^a-z0-9_-]+/gi,
        '-',
      )
      await page.screenshot({
        path: testInfo.outputPath(`${evidenceName}.png`),
        fullPage: true,
      })

      ledger.push({
        ...entry,
        viewport: viewport.key,
        finalPath: new URL(page.url()).pathname,
        metrics,
        pageErrors: pageErrors.slice(errorOffsets.page),
        consoleErrors: consoleErrors.slice(errorOffsets.console),
        failedResponses: failedResponses.slice(errorOffsets.response),
      })
    }
  }

  const ledgerPath = testInfo.outputPath('mobile-full-suite-ledger.json')
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2))
  await testInfo.attach('mobile-full-suite-ledger.json', {
    path: ledgerPath,
    contentType: 'application/json',
  })

  expect(pageErrors, 'Uncaught page errors were observed').toEqual([])
  expect(failedResponses, 'Server errors were observed').toEqual([])
})
