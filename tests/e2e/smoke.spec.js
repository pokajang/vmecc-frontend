const { expect, test } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'
const routeThrottleMs = 900
const routeReadyTimeoutMs = 30_000
const routeDefaultTimeoutMs = 25_000
const screenshotRoot = path.resolve(process.cwd(), 'test-results', 'smoke')

const ROUTES = [
  { path: '/dashboard', heading: /Dashboard Overview/i },
  { path: '/messages', heading: /Messages/i },
  { path: '/settings', heading: /Settings/i },
  { path: '/settings/role-permissions', heading: /Role Permissions/i },
  { path: '/settings/dashboard-visibility', heading: /Dashboard Visibility/i },
  { path: '/admin/users', heading: /Users/i },
  { path: '/admin/audit', heading: /Audit/i },
  { path: '/admin/feedback-reports', heading: /Feedback Reports/i },
  { path: '/staff/details', heading: /Staff/i },
  { path: '/staff/leave-management/leaves', heading: /Leave/i },
  { path: '/staff/leave-management/set-leaves', heading: /Leave/i },
  { path: '/staff/leave-management/set-holidays', heading: /Leave|Holiday/i },
  { path: '/staff/leave-management/rules', heading: /Leave|Rule/i },
  { path: '/staff/overtime-management/records', heading: /Overtime/i },
  { path: '/staff/overtime-management/rules', heading: /Overtime|Rule/i },
  { path: '/staff/salary-claims/claims', heading: /Claim/i },
  { path: '/staff/salary-claims/salary', heading: /Salary|Claim/i },
  { path: '/staff/set-salary/set-salary', heading: /Salary|Set Salary/i },
  { path: '/staff/set-salary/set-ot-rate', heading: /Overtime|Salary/i },
  { path: '/staff/set-salary/workflow-rules', heading: /Workflow|Rule/i },
  { path: '/staff/set-salary/company-legal', heading: /Company|Legal/i },
  { path: '/staff/set-salary/assignment/new', heading: /Salary|Assignment/i },
  { path: '/staff/shift-settings', heading: /Shift/i },
  { path: '/team/details', heading: /Team/i },
  { path: '/roster', heading: /Roster/i },
  { path: '/roster/overview', heading: /Roster/i },
  { path: '/roster/schedule', heading: /Roster|Schedule/i },
  { path: '/roster/shift-settings', heading: /Shift|Roster/i },
  { path: '/leave', heading: /Leave/i },
  { path: '/leave/new', heading: /Leave/i },
  { path: '/overtime', heading: /Overtime/i },
  { path: '/overtime/new', heading: /Overtime/i },
  { path: '/payroll', heading: /Payroll/i },
  { path: '/payroll/claims', heading: /Payroll|Claim/i },
  { path: '/payroll/claims/new', heading: /Claim|Payroll/i },
  { path: '/payroll/claims/new/expense', heading: /Claim|Expense/i },
  { path: '/payroll/claims/new/salary', heading: /Claim|Salary/i },
  { path: '/payroll/payslips', heading: /Payslip|Pay/i },
  { path: '/inspection', heading: /Inspection|Conduct Inspection/i },
  { path: '/inspection/new', heading: /Inspection|Conduct Inspection/i },
  { path: '/inspection/review', heading: /Review|Inspection/i },
  { path: '/report/erco', heading: /ERCO/i },
  { path: '/report/erco/new', heading: /ERCO/i },
  { path: '/report/drill', heading: /Drill/i },
  { path: '/report/drill/new', heading: /Drill/i },
  { path: '/report/fitness-test', heading: /Fitness Test/i },
  { path: '/report/fitness-test/new', heading: /Fitness Test/i },
  { path: '/profile', heading: /Profile/i },
  { path: '/profile/security', heading: /Profile|Security/i },
]

const routeLogin = async (request) => {
  const loginResponse = await request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { email: smokeEmail, password: smokePassword, remember: true },
  })

  const loginBodyText = await loginResponse.text()
  expect(loginResponse.status(), `Login failed (${loginResponse.status()}): ${loginBodyText}`).toBe(
    200,
  )

  let loginBody = {}
  try {
    loginBody = JSON.parse(loginBodyText)
  } catch {
    throw new Error(`Unable to parse login response: ${loginBodyText}`)
  }

  expect(typeof loginBody?.csrf_token, 'Login response missing csrf_token').toBe('string')
  expect(loginBody.csrf_token).toBeTruthy()
  return loginBody.csrf_token
}

const isTrackedFailedResponse = (response) => {
  if (response.status() < 400) return false
  if (
    response.request().resourceType() === 'stylesheet' ||
    response.request().resourceType() === 'script'
  ) {
    return false
  }
  const requestUrl = response.url()
  if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')) return false
  return true
}

const collectFailureArtifacts = async (page, testInfo, route, notes = []) => {
  if (page.isClosed()) {
    return
  }

  const fileName = `${route.path.replace(/[^a-z0-9-]/gi, '_').replace(/_+/g, '_')}-failure.png`
  fs.mkdirSync(screenshotRoot, { recursive: true })
  const artifactPath = path.join(screenshotRoot, fileName)

  const screenshot = await page.screenshot({ path: artifactPath, fullPage: true })
  await testInfo.attach(fileName, {
    body: screenshot,
    contentType: 'image/png',
  })

  const summary = {
    route: route.path,
    issues: notes,
    screenshot: path.relative(process.cwd(), artifactPath),
  }
  fs.writeFileSync(
    path.join(
      screenshotRoot,
      `${route.path.replace(/[^a-z0-9-]/gi, '_').replace(/_+/g, '_')}-failure.json`,
    ),
    JSON.stringify(summary, null, 2),
  )
}

const waitForRouteReady = async (page, route) => {
  await expect(page.locator('#root')).toBeVisible({ timeout: 20_000 })

  await page.waitForFunction(
    () => {
      const rootText = String(document.getElementById('root')?.textContent || '')
      const bodyText = String(document.body?.innerText || '').trim()
      const normalizedBodyText = bodyText.replace(/\s+/g, ' ').trim()
      const isLoading = normalizedBodyText.length <= 160 && /loading/i.test(normalizedBodyText)
      const spinnerVisible = Boolean(document.querySelector('.spinner-border, .spinner-grow'))
      return rootText.trim().length > 0 && !isLoading && !spinnerVisible
    },
    null,
    { timeout: routeReadyTimeoutMs },
  )

  if (route.heading) {
    try {
      await expect(
        page.getByText(route.heading, { exact: false }).first(),
        `Route landmark missing for ${route.path}`,
      ).toBeVisible({ timeout: 8_000 })
    } catch {
      // Landmark assertions are additive and intentionally non-blocking for pages with
      // alternate templates or icon-only titles.
    }
  }
}

test.describe('SMOKE route sweep (manual)', () => {
  test.describe.configure({ mode: 'serial', timeout: 10 * 60_000 })

  test('API CSRF enforcement for unsafe sessioned updates', async ({ request }) => {
    const csrfToken = await routeLogin(request)

    const noTokenResponse = await request.put(`${apiBaseUrl}/profile`, {
      data: { name: 'Smoke Sessionless Update' },
      headers: { Accept: 'application/json' },
    })
    expect(noTokenResponse.status(), 'PUT /api/profile without CSRF should be rejected').toBe(419)

    const withInvalidTokenResponse = await request.put(`${apiBaseUrl}/profile`, {
      data: { name: 'Smoke Invalid Token Update' },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'invalid-token',
      },
    })
    expect(
      withInvalidTokenResponse.status(),
      'PUT /api/profile with invalid CSRF should be rejected',
    ).toBe(419)

    const withTokenResponse = await request.put(`${apiBaseUrl}/profile`, {
      data: { name: 'Smoke CSRF Update' },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    })
    expect(withTokenResponse.status(), 'PUT /api/profile with CSRF should be allowed').toBe(200)
  })

  test('throttled route traversal reaches landmarks without persistent loading', async ({
    page,
  }, testInfo) => {
    page.setDefaultTimeout(routeDefaultTimeoutMs)
    const consoleErrors = []
    const pageErrors = []
    const failedResponses = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          route: new URL(page.url()).pathname,
          message: msg.text(),
        })
      }
    })

    page.on('pageerror', (error) => {
      pageErrors.push({
        route: new URL(page.url()).pathname,
        message: error?.message || String(error),
      })
    })

    page.on('response', (response) => {
      if (!isTrackedFailedResponse(response)) return
      const responseUrl = response.url()
      if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|woff2?)($|\?)/i.test(responseUrl)) return
      failedResponses.push({
        route: new URL(page.url()).pathname,
        status: response.status(),
        url: responseUrl,
      })
    })

    await routeLogin(page.request)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await page.waitForTimeout(routeThrottleMs)
    await waitForRouteReady(page, { path: '/dashboard', heading: /Dashboard Overview/i })

    const failures = []

    for (const route of ROUTES) {
      const beforeConsole = consoleErrors.length
      const beforePageError = pageErrors.length
      const beforeFailureResponse = failedResponses.length

      const notes = []

      try {
        await page.goto(`${baseUrl}${route.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        })
        await page.waitForTimeout(routeThrottleMs)
        await expect(page).not.toHaveURL(/\/login/i, { timeout: 5_000 })
        await waitForRouteReady(page, route)
      } catch (error) {
        notes.push(`Route failure: ${error.message}`)
      }

      const routeConsoleErrors = consoleErrors.slice(beforeConsole)
      const routePageErrors = pageErrors.slice(beforePageError)
      const routeFailedResponses = failedResponses.slice(beforeFailureResponse)

      routeConsoleErrors.forEach(({ message }) => {
        notes.push(`console.error: ${message}`)
      })
      routePageErrors.forEach(({ message }) => {
        notes.push(`pageerror: ${message}`)
      })
      routeFailedResponses.forEach(({ status, url }) => {
        notes.push(`failed request: ${status} ${url}`)
      })

      if (notes.length > 0) {
        await collectFailureArtifacts(page, testInfo, route, notes)
        failures.push({
          route: route.path,
          passed: false,
          notes,
          url: page.url(),
        })
        continue
      }

      failures.push({
        route: route.path,
        passed: true,
        url: page.url(),
      })
    }

    expect(
      failures.filter((item) => !item.passed),
      `Smoke route sweep failed: ${JSON.stringify(failures, null, 2)}`,
    ).toEqual([])
  })
})
