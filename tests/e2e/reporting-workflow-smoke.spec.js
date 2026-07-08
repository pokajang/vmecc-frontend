const { expect, test } = require('@playwright/test')

const normalizeBaseUrl = (url) => String(url || '').replace(/\/+$/, '')

const browserApiBaseUrl = normalizeBaseUrl(
  process.env.VMECC_E2E_BROWSER_API_URL || process.env.VITE_API_URL || 'http://localhost:8000/api',
)
const apiBaseUrl = normalizeBaseUrl(process.env.VMECC_E2E_API_URL || browserApiBaseUrl)
const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const smokePassword = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 45_000)
const apiOrigin = new URL(apiBaseUrl).origin
const browserApiOrigin = new URL(browserApiBaseUrl).origin
const apiBaseUrls = Array.from(new Set([apiBaseUrl, browserApiBaseUrl]))
const apiCookieOrigins = Array.from(new Set([apiOrigin, browserApiOrigin]))
const sessionCookieNames = ['vmecc_session', 'vmecc_remember']

const personas = {
  settingsAdmin: {
    role: 'System Administrator',
    email: 'codex.smoke.sysadmin@vmecc.local',
    password: smokePassword,
  },
  submitter: {
    role: 'Tactical Response Team',
    email: 'codex.smoke.tactical-response-team@vmecc.local',
    password: smokePassword,
  },
  incidentCommander: {
    role: 'Incident Commander',
    email: 'codex.smoke.incident-commander@vmecc.local',
    password: smokePassword,
  },
  unrelated: {
    role: 'Representative',
    email: 'codex.smoke.representative@vmecc.local',
    password: smokePassword,
  },
}

const managedModules = [
  { key: 'erco', label: 'ERCO', route: '/report/erco', incidentType: 'Fire' },
  { key: 'drill', label: 'Drill', route: '/report/drill', incidentType: 'Drill' },
  {
    key: 'fitness-test',
    label: 'Fitness Test',
    route: '/report/fitness-test',
    incidentType: 'Endurance Test',
  },
]

const shellApiStubDefinitions = [
  {
    path: '/settings/modules',
    body: {
      data: {
        registry: [],
        configured: {},
        effective: {},
        forceAllEnabled: false,
        fallbackMode: true,
      },
    },
  },
  {
    path: '/settings/system-maintenance',
    body: {
      data: {
        enabled: false,
        phase: 'off',
        graceEndsAt: null,
        message: 'System is under maintenance. Please try again later.',
        updatedAt: '',
        updatedByUserId: null,
      },
    },
  },
  { path: '/messages/threads**', body: { data: [] } },
  { path: '/rosters**', body: { data: [] } },
  {
    path: '/settings/shift-windows',
    body: {
      data: {
        normal_start: '08:00',
        normal_end: '17:00',
        day_start: '07:00',
        day_end: '19:00',
        night_start: '19:00',
        night_end: '07:00',
      },
    },
  },
  {
    path: '/overtime/eligibility',
    body: {
      data: {
        eligible: false,
        applicableRoles: ['Tactical Response Team'],
        userRoles: [],
      },
    },
  },
]

const shellApiStubs = apiBaseUrls.flatMap((baseUrl) =>
  shellApiStubDefinitions.map((definition) => ({
    pattern: `${baseUrl}${definition.path}`,
    body: definition.body,
  })),
)

const login = async (request, persona) => {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { email: persona.email, password: persona.password, remember: true },
  })
  const text = await response.text()
  expect(response.status(), `${persona.role} login failed: ${text}`).toBe(200)
  const body = JSON.parse(text)
  expect(body.csrf_token, `${persona.role} login missing CSRF token`).toBeTruthy()
  return { response, csrfToken: body.csrf_token }
}

const parseCookie = (rawCookie, origin = apiOrigin) => {
  const [nameValue, ...attributes] = String(rawCookie || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
  const separatorIndex = String(nameValue || '').indexOf('=')
  if (separatorIndex < 0) return null

  const cookie = {
    name: nameValue.slice(0, separatorIndex),
    value: nameValue.slice(separatorIndex + 1),
    url: origin,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }

  attributes.forEach((attribute) => {
    const [rawKey, ...rawValueParts] = attribute.split('=')
    const key = String(rawKey || '')
      .trim()
      .toLowerCase()
    const value = rawValueParts.join('=').trim()
    if (key === 'path') {
      // Host-only cookies created with `url` do not need an explicit path.
    } else if (key === 'httponly') {
      cookie.httpOnly = true
    } else if (key === 'secure') {
      cookie.secure = true
    } else if (key === 'samesite') {
      cookie.sameSite = { strict: 'Strict', lax: 'Lax', none: 'None' }[value.toLowerCase()] || 'Lax'
    } else if (key === 'expires') {
      const epoch = Date.parse(value)
      if (Number.isFinite(epoch)) cookie.expires = epoch / 1000
    } else if (key === 'max-age') {
      const maxAgeSeconds = Number.parseInt(value, 10)
      if (Number.isFinite(maxAgeSeconds)) cookie.expires = Date.now() / 1000 + maxAgeSeconds
    }
  })

  return sessionCookieNames.includes(cookie.name) ? cookie : null
}

const loginWithPage = async (page, persona) => {
  await page.context().clearCookies()
  const { response } = await login(page.request, persona)
  const cookies = response
    .headersArray()
    .filter((item) => item.name.toLowerCase() === 'set-cookie')
    .flatMap((item) => apiCookieOrigins.map((origin) => parseCookie(item.value, origin)))
    .filter(Boolean)

  expect(cookies.length, `${persona.role} login did not return session cookies`).toBeGreaterThan(0)
  await page.context().addCookies(cookies)

  const session = await page.request.get(`${apiBaseUrl}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  const text = await session.text()
  expect(session.status(), `${persona.role} browser session failed: ${text}`).toBe(200)
  const body = JSON.parse(text)
  expect(body.user?.email).toBe(persona.email)
  return body.csrf_token
}

const installAppShellApiStubs = async (page) => {
  await Promise.all(
    shellApiStubs.map(({ pattern, body }) =>
      page.route(pattern, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        }),
      ),
    ),
  )
}

const apiJson = async (request, method, path, csrfToken, data = undefined) => {
  const response = await request[method](`${apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    ...(data !== undefined ? { data } : {}),
  })
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text }
  }
  return { response, body, text }
}

const waitForAppReady = async (page, expectedPath) => {
  await expect(page.locator('#root')).toBeVisible({ timeout: routeTimeoutMs })
  await page.waitForFunction(
    ({ expectedPath }) => {
      const currentPath = new URL(window.location.href).pathname
      const pathMatches =
        currentPath === expectedPath ||
        currentPath.startsWith(`${expectedPath}/`) ||
        expectedPath === '/'
      const bodyText = String(document.body?.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
      const spinnerVisible = Boolean(document.querySelector('.spinner-border, .spinner-grow'))
      const loadingOnly = bodyText.length <= 160 && /loading/i.test(bodyText)
      const pageShellReady =
        !loadingOnly &&
        Boolean(
          document.querySelector(
            '.wrapper, .app-main, main, [data-testid="reporting-settings-module"]',
          ),
        )
      return pathMatches && bodyText.length > 0 && !spinnerVisible && pageShellReady
    },
    { expectedPath },
    { timeout: routeTimeoutMs },
  )
}

const assertNoUnreadCount500 = (failedResponses) => {
  const unreadCountFailures = failedResponses.filter((item) =>
    item.url.includes('/workflow/notifications/unread-count'),
  )
  expect(
    unreadCountFailures,
    `Unread count failures: ${JSON.stringify(unreadCountFailures, null, 2)}`,
  ).toEqual([])
}

const createReport = async ({ request, csrfToken, module, displayId, status = 'Submitted' }) => {
  const { response, body, text } = await apiJson(request, 'post', '/reports', csrfToken, {
    display_id: displayId,
    report_type: module.key,
    status,
    payload: {
      incidentType: module.incidentType,
      location: `Smoke ${module.label} Location`,
      description: `Reporting workflow browser smoke for ${module.label}.`,
    },
  })

  expect(response.status(), `Create ${module.label} report failed: ${text}`).toBe(201)
  expect(body.data?.id, `Create ${module.label} response missing id`).toBeTruthy()
  return body.data
}

const dismissIncidentalDialogs = async (page) => {
  for (const dialogName of ['Install VMECC', 'Notifications']) {
    const dialog = page.getByRole('dialog', { name: dialogName })
    if (await dialog.isVisible().catch(() => false)) {
      await dialog
        .getByRole('button', { name: 'Close' })
        .first()
        .click({ force: true, timeout: 2000 })
        .catch(async () => {
          await page.keyboard.press('Escape').catch(() => {})
        })
      await expect(dialog)
        .toBeHidden({ timeout: 2000 })
        .catch(() => {})
    }
  }
}

const openAllRecords = async (page, module) => {
  await page.goto(`${baseUrl}${module.route}`, { waitUntil: 'domcontentloaded' })
  await waitForAppReady(page, module.route)
  await dismissIncidentalDialogs(page)
  const allScopeButton = page
    .getByRole('group', { name: 'Record scope' })
    .getByRole('button', { name: 'All' })
  const allRecordsResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/reports?') &&
      response.url().includes(`reportType=${encodeURIComponent(module.key)}`) &&
      response.url().includes('scope=all'),
  )
  await allScopeButton.click()
  await expect(allScopeButton).toHaveAttribute('aria-pressed', 'true')
  expect((await allRecordsResponse).status()).toBe(200)
  await dismissIncidentalDialogs(page)
}

const openRowActions = async (page, displayId) => {
  const row = page.locator('tbody tr', { hasText: displayId }).first()
  await expect(row, `Missing row ${displayId}`).toBeVisible({ timeout: routeTimeoutMs })
  await row.getByLabel('Row actions').click()
  const menu = page.locator('.row-actions-menu[aria-hidden="false"]').first()
  await expect(menu).toBeVisible()
  return menu
}

const submitWorkflowModal = async (page, action, remarks) => {
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(`${action} Report`)).toBeVisible()
  await dialog.getByPlaceholder('Add your remarks').fill(remarks)
  await dialog.getByLabel(/I confirm this report workflow action is accurate/i).check()
  await dialog.getByRole('button', { name: action }).click()
}

test.describe('Reporting workflow browser smoke', () => {
  test.describe.configure({ mode: 'serial', timeout: 8 * 60_000 })

  test('settings tabs remain visually coherent and sidebar-active across modules', async ({
    page,
  }) => {
    const failedResponses = []
    page.on('response', (response) => {
      if (response.status() >= 500) {
        failedResponses.push({ status: response.status(), url: response.url(), page: page.url() })
      }
    })

    await loginWithPage(page, personas.settingsAdmin)
    await installAppShellApiStubs(page)

    for (const module of [{ key: 'inspection', label: 'Inspection' }, ...managedModules]) {
      await page.goto(`${baseUrl}/reporting-settings/${module.key}`, {
        waitUntil: 'domcontentloaded',
      })
      await waitForAppReady(page, `/reporting-settings/${module.key}`)

      await expect(page.getByRole('heading', { name: 'Reporting Settings' })).toBeVisible()
      await expect(page.getByTestId('reporting-settings-rules')).toBeVisible()
      await expect(page.getByText(`${module.label} Workflow Rules`)).toBeVisible()
      await expect(page.getByRole('link', { name: 'Reporting Settings' })).toHaveClass(/active/)
      await expect(page.getByTestId('reporting-settings-nav').getByText(module.label)).toBeVisible()
    }

    await page.getByRole('button', { name: /edit/i }).click()
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url() === `${apiBaseUrl}/settings/reporting-workflow-rules` &&
        response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: /^save$/i }).click()
    expect((await saveResponse).status()).toBe(200)
    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible()

    assertNoUnreadCount500(failedResponses)
  })

  test('ERCO, Drill, and Fitness Test complete browser review and approval flow', async ({
    page,
  }) => {
    const failedResponses = []
    page.on('response', (response) => {
      if (response.status() >= 500) {
        failedResponses.push({ status: response.status(), url: response.url(), page: page.url() })
      }
    })

    const runId = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14)
    for (const module of managedModules) {
      const submitterCsrfToken = await loginWithPage(page, personas.submitter)

      await createReport({
        request: page.request,
        csrfToken: submitterCsrfToken,
        module,
        displayId: `${module.key.toUpperCase()}-SMOKE-DRAFT-${runId}`,
        status: 'Draft',
      })
      const submitted = await createReport({
        request: page.request,
        csrfToken: submitterCsrfToken,
        module,
        displayId: `${module.key.toUpperCase()}-SMOKE-${runId}`,
      })

      await loginWithPage(page, personas.incidentCommander)
      await installAppShellApiStubs(page)

      const unreadCount = await page.request.get(
        `${apiBaseUrl}/workflow/notifications/unread-count`,
        { headers: { Accept: 'application/json' } },
      )
      expect(unreadCount.status(), `${module.label} unread-count failed`).toBe(200)

      await openAllRecords(page, module)
      await expect(page.locator('tbody tr', { hasText: submitted.displayId }).first()).toBeVisible({
        timeout: routeTimeoutMs,
      })

      const reviewMenu = await openRowActions(page, submitted.displayId)
      await expect(reviewMenu.getByRole('button', { name: 'Review' })).toBeEnabled()
      await reviewMenu.getByRole('button', { name: 'Review' }).click()
      await submitWorkflowModal(page, 'Review', `Browser smoke reviewed ${module.label}`)
      await expect(page.getByText(/moved to Reviewed/i)).toBeVisible({ timeout: routeTimeoutMs })

      await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({
        timeout: routeTimeoutMs,
      })
      await page.getByRole('button', { name: 'Approve' }).click()
      await submitWorkflowModal(page, 'Approve', `Browser smoke approved ${module.label}`)

      const final = await apiJson(
        page.request,
        'get',
        `/reports/${encodeURIComponent(submitted.id)}`,
        null,
      )
      expect(final.response.status(), `${module.label} final fetch failed`).toBe(200)
      expect(final.body.data?.status).toBe('Approved')
      expect(final.body.data?.workflowStage).toBe('done')
    }

    assertNoUnreadCount500(failedResponses)
  })

  test('reject path and unrelated-user authorization remain blocked', async ({ page }) => {
    const failedResponses = []
    page.on('response', (response) => {
      if (response.status() >= 500) {
        failedResponses.push({ status: response.status(), url: response.url(), page: page.url() })
      }
    })

    const runId = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14)
    const module = managedModules[0]
    const submitterCsrfToken = await loginWithPage(page, personas.submitter)
    const submitted = await createReport({
      request: page.request,
      csrfToken: submitterCsrfToken,
      module,
      displayId: `ERCO-SMOKE-REJECT-${runId}`,
    })

    const unrelatedCsrfToken = await loginWithPage(page, personas.unrelated)
    await installAppShellApiStubs(page)
    const forbidden = await apiJson(
      page.request,
      'post',
      `/reports/${encodeURIComponent(submitted.id)}/review`,
      unrelatedCsrfToken,
      { version: submitted.version, remarks: 'Unauthorized browser smoke attempt.' },
    )
    expect(forbidden.response.status()).toBe(403)

    await loginWithPage(page, personas.incidentCommander)
    await installAppShellApiStubs(page)
    await openAllRecords(page, module)
    const rejectMenu = await openRowActions(page, submitted.displayId)
    await rejectMenu.getByRole('button', { name: 'Reject' }).click()
    await submitWorkflowModal(page, 'Reject', 'Browser smoke rejection path.')

    const rejected = await apiJson(
      page.request,
      'get',
      `/reports/${encodeURIComponent(submitted.id)}`,
      null,
    )
    expect(rejected.response.status()).toBe(200)
    expect(rejected.body.data?.status).toBe('Rejected')
    expect(rejected.body.data?.workflowStage).toBe('done')

    await loginWithPage(page, personas.submitter)
    await installAppShellApiStubs(page)
    const ownerUnreadCount = await page.request.get(
      `${apiBaseUrl}/workflow/notifications/unread-count`,
      { headers: { Accept: 'application/json' } },
    )
    expect(ownerUnreadCount.status()).toBe(200)

    assertNoUnreadCount500(failedResponses)
  })
})
