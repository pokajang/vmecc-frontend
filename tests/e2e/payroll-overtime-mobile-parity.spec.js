const { expect, test } = require('@playwright/test')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const email = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.sysadmin@vmecc.local'
const password = process.env.VMECC_SMOKE_PASSWORD || 'SmokeRole!2026'
const authCookieNames = new Set(['vmecc_session', 'vmecc_remember'])

const parseAuthCookie = (header) => {
  const [nameValue] = String(header || '').split(';')
  const separator = nameValue.indexOf('=')
  if (separator < 1) return null
  const name = nameValue.slice(0, separator)
  if (!authCookieNames.has(name)) return null
  return { name, value: nameValue.slice(separator + 1), url: baseUrl }
}

const login = async (page) => {
  const response = await page.request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { email, password, remember: true },
  })
  expect(response.status()).toBe(200)

  const cookies = response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value }) => parseAuthCookie(value))
    .filter(Boolean)
  expect(cookies.length).toBeGreaterThan(0)
  await page.context().addCookies(cookies)
}

const routes = [
  '/overtime',
  '/overtime/new',
  '/payroll',
  '/payroll/claims/new/salary',
  '/staff/overtime-management/records',
  '/staff/salary-claims/claims',
  '/staff/set-salary/set-ot-rate',
  '/staff/set-salary/workflow-rules',
  '/staff/set-salary/company-legal',
  '/staff/set-salary/assignment/new',
]

const expectNoHorizontalOverflow = async (page, route) => {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }))
  expect(
    metrics.document,
    `${route} overflowed the ${metrics.viewport}px viewport`,
  ).toBeLessThanOrEqual(metrics.viewport + 1)
}

test.describe('payroll and overtime mobile parity', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('core employee, reviewer, and configuration routes stay structured and overflow-free', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000)
    await login(page)
    await page.route(`${apiBaseUrl}/overtime/eligibility`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            eligible: true,
            applicableRoles: ['System Admin'],
            userRoles: ['System Admin'],
          },
        }),
      }),
    )
    await page.route(`${apiBaseUrl}/settings/modules`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { registry: [], configured: {}, effective: {}, fallbackMode: true },
        }),
      }),
    )

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport)
      for (const route of routes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
        await expect(page).not.toHaveURL(/\/login(?:[/?]|$)/)
        await expect(page.locator('#root')).not.toBeEmpty()
        await expect(page.getByText(/Checking overtime eligibility/i)).toHaveCount(0, {
          timeout: 30_000,
        })
        await expect(
          page.locator('h1').first(),
          `${route} should expose a page heading`,
        ).toBeVisible()
        await expectNoHorizontalOverflow(page, route)
      }
    }

    const undersizedWorkflowActions = await page
      .locator(
        '.workflow-step-action:visible, .action-row-thumb--compact-sticky button:visible, .workflow-attachment-action:visible',
      )
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              label: element.getAttribute('aria-label') || element.textContent?.trim(),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }
          })
          .filter(({ width, height }) => width < 44 || height < 44),
      )
    expect(undersizedWorkflowActions).toEqual([])

    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.locator('h1').first()).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath('payroll-overtime-mobile-parity.png'),
      fullPage: true,
    })
  })
})
