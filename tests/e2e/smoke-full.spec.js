const { expect, test } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const smokePassword = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 20_000)
const apiPacingMs = Number(process.env.VMECC_SMOKE_API_PACING_MS || 650)
const loginCookieNames = ['vmecc_session', 'vmecc_remember']
const artifactRoot = path.resolve(
  process.cwd(),
  '..',
  'qa-artifacts',
  'smoke-full',
  process.env.VMECC_SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-'),
)

const personas = [
  {
    role: 'System Administrator',
    email: 'codex.smoke.sysadmin@vmecc.local',
    mustAllow: [
      'GET stats/payroll',
      'GET users',
      'GET audit-logs',
      'GET settings/role-permissions',
    ],
    mustDeny: [],
    routes: ['/dashboard', '/admin/users', '/settings'],
  },
  {
    role: 'Contract Manager',
    email: 'codex.smoke.contract-manager@vmecc.local',
    mustAllow: ['GET stats/reports', 'GET reports', 'GET rosters', 'GET teams'],
    mustDeny: ['GET audit-logs', 'GET settings/role-permissions', 'POST users'],
    routes: ['/dashboard', '/team/details', '/inspection'],
  },
  {
    role: 'Human Resource',
    email: 'codex.smoke.human-resource@vmecc.local',
    mustAllow: [
      'GET stats/leave',
      'GET users',
      'GET staff/leave/records',
      'GET staff/salary-claims/records',
    ],
    mustDeny: ['GET audit-logs', 'GET settings/role-permissions', 'POST teams'],
    routes: ['/dashboard', '/staff/leave-management/leaves', '/staff/salary-claims/claims'],
  },
  {
    role: 'Finance',
    email: 'codex.smoke.finance@vmecc.local',
    mustAllow: [
      'GET stats/payroll',
      'GET staff/salary-claims/records',
      'GET staff/salary-assignments',
    ],
    mustDeny: ['GET audit-logs', 'GET settings/role-permissions', 'POST teams'],
    routes: ['/dashboard', '/staff/salary-claims/claims'],
  },
  {
    role: 'Admin',
    email: 'codex.smoke.admin-role@vmecc.local',
    mustAllow: ['GET stats/roster', 'GET teams', 'GET rosters', 'GET users'],
    mustDeny: ['GET audit-logs', 'GET settings/role-permissions', 'GET staff/leave/records'],
    routes: ['/dashboard', '/team/details', '/roster/overview'],
  },
  {
    role: 'Incident Commander',
    email: 'codex.smoke.incident-commander@vmecc.local',
    mustAllow: ['GET stats/reports', 'GET teams', 'GET rosters', 'GET reports'],
    mustDeny: [
      'GET audit-logs',
      'GET settings/role-permissions',
      'GET staff/salary-claims/records',
    ],
    routes: ['/dashboard', '/team/details', '/inspection'],
  },
  {
    role: 'Assistant Incident Commander',
    email: 'codex.smoke.assistant-incident-commander@vmecc.local',
    mustAllow: ['GET stats/reports', 'GET teams', 'GET reports'],
    mustDeny: [
      'GET audit-logs',
      'GET settings/role-permissions',
      'GET staff/salary-claims/records',
    ],
    routes: ['/dashboard', '/team/details', '/inspection'],
  },
  {
    role: 'Tactical Response Team',
    email: 'codex.smoke.tactical-response-team@vmecc.local',
    mustAllow: [
      'GET stats/roster',
      'GET teams',
      'GET reports',
      'GET leave',
      'GET overtime',
      'GET payroll/claims',
    ],
    mustDeny: ['GET audit-logs', 'GET settings/role-permissions', 'GET staff/leave/records'],
    routes: ['/dashboard', '/leave', '/inspection'],
  },
  {
    role: 'Client Contract Manager',
    email: 'codex.smoke.client-contract-manager@vmecc.local',
    mustAllow: ['GET teams', 'GET messages/threads'],
    mustDeny: ['GET users', 'GET audit-logs', 'GET leave', 'GET payroll/claims'],
    routes: ['/dashboard', '/messages', '/team/details'],
  },
  {
    role: 'Representative',
    email: 'codex.smoke.representative@vmecc.local',
    mustAllow: ['GET teams', 'GET messages/threads'],
    mustDeny: ['GET users', 'GET audit-logs', 'GET leave', 'GET payroll/claims'],
    routes: ['/dashboard', '/messages', '/team/details'],
  },
]

const methodFor = (entry) => entry.split(' ')[0].toLowerCase()
const routeFor = (entry) => entry.slice(entry.indexOf(' ') + 1)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const writeArtifact = (name, payload) => {
  fs.mkdirSync(artifactRoot, { recursive: true })
  fs.writeFileSync(path.join(artifactRoot, name), JSON.stringify(payload, null, 2))
}

const loginSession = async (request, persona) => {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { email: persona.email, password: smokePassword, remember: true },
  })
  const text = await response.text()
  expect(response.status(), `${persona.role} login failed: ${text}`).toBe(200)
  const body = JSON.parse(text)
  expect(body.csrf_token, `${persona.role} login missing CSRF token`).toBeTruthy()
  return { response, csrfToken: body.csrf_token }
}

const parseSetCookieHeaders = (response) =>
  response
    .headersArray()
    .filter((item) => item.name.toLowerCase() === 'set-cookie')
    .map((item) => item.value)
    .filter(Boolean)

const parseSetCookieValue = (rawCookie) => {
  const parts = String(rawCookie || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
  if (parts.length === 0) return null

  const [rawNameValue, ...attributes] = parts
  const separatorIndex = rawNameValue.indexOf('=')
  if (separatorIndex < 0) return null

  const name = rawNameValue.slice(0, separatorIndex)
  const value = rawNameValue.slice(separatorIndex + 1)
  const cookie = {
    name,
    value,
    secure: false,
    httpOnly: false,
    sameSite: 'Lax',
  }
  let hasDomain = false

  attributes.forEach((attribute) => {
    const [rawKey, ...rawValueParts] = attribute.split('=')
    const key = String(rawKey || '')
      .trim()
      .toLowerCase()
    const valuePart = rawValueParts.join('=').trim()

    if (!key) return

    if (key === 'path') {
      cookie.path = valuePart || '/'
    } else if (key === 'httponly') {
      cookie.httpOnly = true
    } else if (key === 'secure') {
      cookie.secure = true
    } else if (key === 'samesite') {
      const normalizedSameSite = String(valuePart || '')
        .trim()
        .toLowerCase()
      const allowedSameSite = {
        strict: 'Strict',
        lax: 'Lax',
        none: 'None',
      }[normalizedSameSite]

      cookie.sameSite = allowedSameSite || 'Lax'
    } else if (key === 'domain') {
      hasDomain = true
      cookie.domain = valuePart
    } else if (key === 'expires') {
      const epoch = Date.parse(valuePart)
      if (Number.isFinite(epoch)) {
        cookie.expires = epoch / 1000
      }
    } else if (key === 'max-age') {
      const maxAgeSeconds = Number.parseInt(valuePart, 10)
      if (Number.isFinite(maxAgeSeconds)) {
        cookie.expires = Date.now() / 1000 + maxAgeSeconds
      }
    }
  })

  if (hasDomain) {
    if (!cookie.path) {
      cookie.path = '/'
    }
    if (cookie.url) delete cookie.url
  } else {
    if (cookie.domain) delete cookie.domain
    if (cookie.path) delete cookie.path
    cookie.url = baseUrl
  }

  return cookie
}

const syncAuthCookiesToPage = async (page, response) => {
  if (!page?.context) return

  const cookies = parseSetCookieHeaders(response)
    .map(parseSetCookieValue)
    .filter(Boolean)
    .filter((cookie) => loginCookieNames.includes(cookie.name))
    .filter((cookie) => cookie.name && cookie.value)

  if (cookies.length > 0) {
    await page.context().addCookies(cookies)
  }
}

const clearAuthCookiesFromPage = async (page) => {
  if (!page?.context) return
  await page.context().clearCookies()
}

const loginWithPage = async (page, persona) => {
  const { response, csrfToken } = await loginSession(page.request, persona)
  await syncAuthCookiesToPage(page, response)
  return csrfToken
}

const loginUser = async (request, persona) => {
  const { csrfToken } = await loginSession(request, persona)
  return csrfToken
}

const callEndpoint = async (request, entry, csrfToken, body = undefined) => {
  const method = methodFor(entry)
  const route = routeFor(entry)
  const options = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  }
  if (body !== undefined) options.data = body
  const response = await request[method](`${apiBaseUrl}/${route}`, options)
  if (apiPacingMs > 0) await sleep(apiPacingMs)
  return response
}

const expectAllowed = (status) => [200, 201, 204].includes(status)
const expectDenied = (status) => [401, 403, 404, 419].includes(status)
const isRateLimited = (status) => status === 429

const isDashboardRoute = (url) => /\/dashboard(?:[/?]|$)/.test(url)
const normalizeRoutePath = (path) => {
  const trimmed = String(path || '').trim() || ''
  if (!trimmed || trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`
}
const isExpectedRoute = (currentPath, expectedRoute) => {
  const normalizedExpected = normalizeRoutePath(expectedRoute)
  const normalizedCurrent = normalizeRoutePath(currentPath)

  if (normalizedExpected === '/') {
    return true
  }

  if (normalizedExpected === '/dashboard') {
    return normalizedCurrent === '/dashboard' || normalizedCurrent.startsWith('/dashboard/')
  }

  return (
    normalizedCurrent === normalizedExpected ||
    normalizedCurrent.startsWith(`${normalizedExpected}/`)
  )
}
const hasDashboardSettledState = () => {
  const overview = document.querySelector('[data-testid="dashboard-overview"]')
  if (!overview) return false
  const actionQueue = document.querySelector('[data-testid="dashboard-action-queue"]')
  if (!actionQueue) return false
  const actionQueueLoading = document.querySelector(
    '[data-testid="dashboard-action-queue-loading"]',
  )
  if (actionQueueLoading) return false
  const dashboardLoadingElements = document.querySelectorAll(
    '[data-testid^="dashboard-"][data-testid$="-loading"]',
  )
  if (dashboardLoadingElements.length > 0) return false

  return true
}

const waitForAppReady = async (page, expectedRoute = null) => {
  await expect(page.locator('#root')).toBeVisible({ timeout: routeTimeoutMs })
  const expectedPath = normalizeRoutePath(expectedRoute)

  await page.waitForFunction(
    ({ expectedPath }) => {
      const currentPath = new URL(window.location.href).pathname
      const normalize = (value) => {
        const trimmed = String(value || '').trim() || ''
        if (!trimmed || trimmed === '/') return '/'
        return `/${trimmed.replace(/^\/+|\/+$/g, '')}`
      }
      const normalizedCurrent = normalize(currentPath)
      const normalizedExpected = normalize(expectedPath)

      if (normalizedExpected === '/') {
        return true
      }

      if (normalizedExpected === '/dashboard') {
        return normalizedCurrent === '/dashboard' || normalizedCurrent.startsWith('/dashboard/')
      }

      return (
        normalizedCurrent === normalizedExpected ||
        normalizedCurrent.startsWith(`${normalizedExpected}/`)
      )
    },
    { expectedPath },
    { timeout: routeTimeoutMs },
  )

  const currentPath = new URL(page.url()).pathname

  if (isDashboardRoute(currentPath) && isExpectedRoute(currentPath, expectedPath)) {
    await page.waitForFunction(hasDashboardSettledState, null, { timeout: routeTimeoutMs })
    return
  }

  await page.waitForFunction(
    () => {
      const bodyText = String(document.body?.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
      const spinnerVisible = Boolean(document.querySelector('.spinner-border, .spinner-grow'))
      const loadingOnly = bodyText.length <= 160 && /loading/i.test(bodyText)
      return bodyText.length > 0 && !spinnerVisible && !loadingOnly
    },
    null,
    { timeout: routeTimeoutMs },
  )
}

const waitForNotificationHeader = async (page) => {
  await expect(page.locator('#root')).toBeVisible({ timeout: routeTimeoutMs })
  await expect(page.getByLabel('Notifications').first()).toBeVisible({ timeout: routeTimeoutMs })
}

const responseSnippet = async (response) => {
  const text = await response.text()
  return text.length > 1000 ? `${text.slice(0, 1000)}... [truncated ${text.length} chars]` : text
}

const recordFailure = async (roleResult, { endpoint, expected, response }) => {
  const status = response.status()
  roleResult.failures.push({
    endpoint,
    expected,
    status,
    body:
      status === 429
        ? 'Rate limited during local smoke. Clear Laravel cache/rate limiter or increase VMECC_SMOKE_API_PACING_MS before rerun.'
        : await responseSnippet(response),
  })
}

test.describe('FULL SMOKE repo-wide RBAC and notification harness', () => {
  test.describe.configure({ timeout: 15 * 60_000 })

  test('all smoke personas can authenticate and expose expected sessions', async ({ request }) => {
    const results = []
    for (const persona of personas) {
      const csrfToken = await loginUser(request, persona)
      const session = await request.get(`${apiBaseUrl}/auth/session`, {
        headers: { Accept: 'application/json' },
      })
      const body = await session.json()
      expect(session.status(), `${persona.role} session failed`).toBe(200)
      expect(body.user?.email).toBe(persona.email)
      expect(body.user?.roles || [], `${persona.role} missing role`).toContain(persona.role)
      expect(body.csrf_token || csrfToken, `${persona.role} missing session CSRF`).toBeTruthy()
      results.push({
        role: persona.role,
        email: persona.email,
        permissions: body.user?.permissions || [],
        role_assignments: body.user?.role_assignments || [],
      })
      await request.post(`${apiBaseUrl}/auth/logout`, {
        headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken },
      })
    }
    writeArtifact('personas-session.json', results)
  })

  test('API RBAC matrix allows and denies representative endpoint families', async ({
    request,
  }) => {
    const matrix = []

    for (const persona of personas) {
      const csrfToken = await loginUser(request, persona)
      const roleResult = { role: persona.role, allowed: [], denied: [], failures: [] }

      for (const entry of persona.mustAllow) {
        const response = await callEndpoint(request, entry, csrfToken)
        const status = response.status()
        roleResult.allowed.push({ endpoint: entry, status })
        if (isRateLimited(status) || !expectAllowed(status)) {
          await recordFailure(roleResult, { endpoint: entry, expected: 'allowed', response })
        }
      }

      for (const entry of persona.mustDeny) {
        const response = await callEndpoint(
          request,
          entry,
          csrfToken,
          entry.startsWith('POST ') ? {} : undefined,
        )
        const status = response.status()
        roleResult.denied.push({ endpoint: entry, status })
        if (isRateLimited(status) || !expectDenied(status)) {
          await recordFailure(roleResult, { endpoint: entry, expected: 'denied', response })
        }
      }

      const noCsrf = await request.put(`${apiBaseUrl}/profile`, {
        data: { name: `CSRF Blocked ${persona.role}` },
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      })
      if (apiPacingMs > 0) await sleep(apiPacingMs)
      roleResult.csrf = { missingTokenStatus: noCsrf.status() }
      if (isRateLimited(noCsrf.status()) || noCsrf.status() !== 419) {
        roleResult.failures.push({
          endpoint: 'PUT profile',
          expected: '419 missing CSRF',
          status: noCsrf.status(),
          body:
            noCsrf.status() === 429
              ? 'Rate limited during local smoke. Clear Laravel cache/rate limiter or increase VMECC_SMOKE_API_PACING_MS before rerun.'
              : undefined,
        })
      }

      matrix.push(roleResult)
      await request.post(`${apiBaseUrl}/auth/logout`, {
        headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken },
      })
    }

    writeArtifact('api-rbac-matrix.json', matrix)
    const failures = matrix.flatMap((row) =>
      row.failures.map((failure) => ({ role: row.role, ...failure })),
    )
    expect(failures, `API RBAC failures: ${JSON.stringify(failures, null, 2)}`).toEqual([])
  })

  test('UI route sweep loads allowed persona routes without persistent errors', async ({
    page,
  }) => {
    test.skip(
      process.env.VMECC_SMOKE_INCLUDE_UI_SWEEP !== '1',
      'Set VMECC_SMOKE_INCLUDE_UI_SWEEP=1 to run the longer browser route sweep.',
    )

    const results = []
    const consoleErrors = []
    const pageErrors = []
    const failedResponses = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push({ url: page.url(), message: msg.text() })
    })
    page.on('pageerror', (error) => pageErrors.push({ url: page.url(), message: error.message }))
    page.on('response', (response) => {
      const url = response.url()
      if (response.status() >= 500 && !/\.(css|js|png|jpg|jpeg|svg|woff2?)($|\?)/i.test(url)) {
        failedResponses.push({ url, status: response.status(), page: page.url() })
      }
    })

    for (const persona of personas) {
      const csrfToken = await loginWithPage(page, persona)
      for (const route of persona.routes) {
        const beforeConsole = consoleErrors.length
        const beforeErrors = pageErrors.length
        const beforeResponses = failedResponses.length
        const result = { role: persona.role, route, passed: true, notes: [] }

        try {
          await page.goto(`${baseUrl}${route}`, {
            waitUntil: 'domcontentloaded',
            timeout: routeTimeoutMs,
          })
          await waitForAppReady(page, route)
          await expect(page).not.toHaveURL(/\/login/i)
        } catch (error) {
          result.passed = false
          result.notes.push(error.message)
          fs.mkdirSync(artifactRoot, { recursive: true })
          const fileName =
            `${persona.role}-${route}`.replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.png'
          await page
            .screenshot({ path: path.join(artifactRoot, fileName), fullPage: true })
            .catch(() => {})
          result.screenshot = fileName
        }

        consoleErrors.slice(beforeConsole).forEach((item) => {
          result.passed = false
          result.notes.push(`console.error: ${item.message}`)
        })
        pageErrors.slice(beforeErrors).forEach((item) => {
          result.passed = false
          result.notes.push(`pageerror: ${item.message}`)
        })
        failedResponses.slice(beforeResponses).forEach((item) => {
          result.passed = false
          result.notes.push(`failed response: ${item.status} ${item.url}`)
        })

        results.push(result)
      }

      await page.request.post(`${apiBaseUrl}/auth/logout`, {
        headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken },
      })
    }

    writeArtifact('ui-route-rbac-sweep.json', results)
    const failures = results.filter((item) => !item.passed)
    expect(failures, `UI route failures: ${JSON.stringify(failures, null, 2)}`).toEqual([])
  })

  test('workflow notification unread count, badge, mark-read, and persistence smoke', async ({
    page,
  }) => {
    const persona = personas.find((item) => item.role === 'Human Resource')
    let csrfToken = await loginWithPage(page, persona)

    const countBefore = await page.request.get(
      `${apiBaseUrl}/workflow/notifications/unread-count`,
      {
        headers: { Accept: 'application/json' },
      },
    )
    expect(countBefore.status()).toBe(200)
    const beforeBody = await countBefore.json()
    const beforeCount = Number(beforeBody.data?.count || beforeBody.count || 0)
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' })
    await waitForNotificationHeader(page)
    if (beforeCount > 0) {
      await expect(page.locator('.header-alert-badge').first()).toContainText(String(beforeCount))
    } else {
      await expect(page.locator('.header-alert-badge')).toHaveCount(0)
    }

    if (beforeCount === 0) {
      writeArtifact('workflow-notification-smoke.json', {
        role: persona.role,
        beforeCount,
        markedReadNotificationId: null,
        afterCount: null,
      })
      return
    }

    const browserSession = await page.request.get(`${apiBaseUrl}/auth/session`, {
      headers: { Accept: 'application/json' },
    })
    expect(browserSession.status()).toBe(200)
    csrfToken = (await browserSession.json())?.csrf_token || csrfToken

    const notifications = await page.request.get(
      `${apiBaseUrl}/workflow/notifications?unread_only=1&limit=10`,
      {
        headers: { Accept: 'application/json' },
      },
    )
    expect(notifications.status()).toBe(200)
    const notificationsBody = await notifications.json()
    const firstNotification = notificationsBody.data?.[0]
    expect(firstNotification?.id, 'Missing seeded unread notification').toBeTruthy()

    const markRead = await page.request.post(
      `${apiBaseUrl}/workflow/notifications/${firstNotification.id}/read`,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      },
    )
    expect(markRead.status()).toBe(200)

    const countAfter = await page.request.get(`${apiBaseUrl}/workflow/notifications/unread-count`, {
      headers: { Accept: 'application/json' },
    })
    expect(countAfter.status()).toBe(200)
    const afterBody = await countAfter.json()
    const afterCount = Number(afterBody.data?.count || afterBody.count || 0)
    expect(afterCount).toBe(Math.max(0, beforeCount - 1))

    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForNotificationHeader(page)
    if (afterCount > 0) {
      await expect(page.locator('.header-alert-badge').first()).toContainText(String(afterCount))
    } else {
      await expect(page.locator('.header-alert-badge')).toHaveCount(0)
    }

    writeArtifact('workflow-notification-smoke.json', {
      role: persona.role,
      beforeCount,
      markedReadNotificationId: firstNotification.id,
      afterCount,
    })
  })
})
