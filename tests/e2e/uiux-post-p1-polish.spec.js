const { devices, expect, test } = require('@playwright/test')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const password = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'
const authCookieNames = new Set(['vmecc_session', 'vmecc_remember'])

const parseAuthCookie = (header) => {
  const [nameValue] = String(header || '').split(';')
  const separator = nameValue.indexOf('=')
  if (separator < 1) return null
  const name = nameValue.slice(0, separator)
  if (!authCookieNames.has(name)) return null
  return { name, value: nameValue.slice(separator + 1), url: baseUrl }
}

const login = async (page, email) => {
  const response = await page.request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { email, password, remember: true },
  })
  expect(response.status(), `Unable to authenticate ${email}`).toBe(200)

  const cookies = response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value }) => parseAuthCookie(value))
    .filter(Boolean)
  expect(cookies.length, `No auth cookies returned for ${email}`).toBeGreaterThan(0)
  await page.context().addCookies(cookies)
}

const openRoute = async (page, route) => {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.body')).toBeVisible()
  await expect(page).not.toHaveURL(/\/login(?:[/?]|$)/)
}

const expectNoHorizontalOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
}

test.describe('Post-P1 UI/UX polish', () => {
  test.describe.configure({ timeout: 90_000 })

  test('mobile leave management has clear search scope and coarse-pointer targets', async ({
    browser,
  }) => {
    const context = await browser.newContext({ ...devices['Pixel 5'], baseURL: baseUrl })
    const page = await context.newPage()
    await login(page, 'codex.smoke.human-resource@vmecc.local')
    await openRoute(page, '/staff/leave-management/set-leaves')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Staff Leave Management' }),
    ).toBeVisible()
    await expect(page.getByLabel('Leave management section')).toBeVisible()
    await expect(page.locator('.table-filter-mobile-search')).toHaveAttribute(
      'placeholder',
      'Search assignments',
    )

    for (const control of [
      page.getByRole('button', { name: 'Open filters' }),
      page.getByRole('button', { name: 'Assign entitlement' }),
    ]) {
      const box = await control.boundingBox()
      expect(box?.width || 0).toBeGreaterThanOrEqual(44)
      expect(box?.height || 0).toBeGreaterThanOrEqual(44)
    }

    await expect(page.locator('.pwa-install-banner')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await context.close()
  })

  test('operational routes do not trigger profile onboarding', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['Pixel 5'], baseURL: baseUrl })
    const page = await context.newPage()
    await login(page, 'codex.smoke.tactical-response-team@vmecc.local')
    await openRoute(page, '/leave')

    await expect(page.getByRole('heading', { level: 1, name: 'Leave' })).toBeVisible()
    await page.waitForTimeout(2200)
    await expect(page.getByText(/Welcome,/)).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await context.close()
  })

  test('desktop navigation and payroll terminology remain route-correct', async ({ page }) => {
    await login(page, 'codex.smoke.sysadmin@vmecc.local')
    await openRoute(page, '/staff/set-salary/set-salary')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Payroll Configuration' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Payroll Configuration' })).toHaveClass(/active/)
    await expect(page.getByText('Payroll Records', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Teams and Scheduling', { exact: true })).toBeVisible()
    await expect(page.getByText('Administration', { exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('messages exposes a compact semantic page heading', async ({ page }) => {
    await login(page, 'codex.smoke.representative@vmecc.local')
    await openRoute(page, '/messages')

    await page.waitForFunction(
      () =>
        document.querySelector('h1') ||
        document.body.textContent?.includes('This module is currently disabled.'),
    )
    test.skip(
      await page.getByText('This module is currently disabled.').isVisible(),
      'Messages is disabled in the current local module-activation fixture.',
    )
    await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Create chat' })).toBeVisible()
  })
})
