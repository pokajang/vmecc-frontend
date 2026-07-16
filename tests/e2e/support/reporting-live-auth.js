const { expect } = require('@playwright/test')

const normalizeBaseUrl = (url) => String(url || '').replace(/\/+$/, '')
const browserApiBaseUrl = normalizeBaseUrl(
  process.env.VMECC_E2E_BROWSER_API_URL || process.env.VITE_API_URL || 'http://localhost:8000/api',
)
const apiBaseUrl = normalizeBaseUrl(process.env.VMECC_E2E_API_URL || browserApiBaseUrl)
const baseUrl = normalizeBaseUrl(process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000')
const smokePassword = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'
const apiOrigins = Array.from(
  new Set([new URL(apiBaseUrl).origin, new URL(browserApiBaseUrl).origin]),
)

const personas = {
  submitter: {
    role: 'Tactical Response Team',
    email: 'codex.smoke.tactical-response-team@vmecc.local',
    password: smokePassword,
  },
  unrelated: {
    role: 'Representative',
    email: 'codex.smoke.representative@vmecc.local',
    password: smokePassword,
  },
}

const isSessionCookie = (name) =>
  ['vmecc_session', 'vmecc_remember'].includes(name) ||
  /(?:_session|_remember)$/.test(String(name || ''))

const parseCookie = (rawCookie, origin) => {
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
  if (!isSessionCookie(cookie.name)) return null

  for (const attribute of attributes) {
    const [rawKey, ...rawValueParts] = attribute.split('=')
    const key = String(rawKey || '')
      .trim()
      .toLowerCase()
    const value = rawValueParts.join('=').trim()
    if (key === 'httponly') cookie.httpOnly = true
    else if (key === 'secure') cookie.secure = true
    else if (key === 'samesite') {
      cookie.sameSite = { strict: 'Strict', lax: 'Lax', none: 'None' }[value.toLowerCase()] || 'Lax'
    } else if (key === 'expires') {
      const epoch = Date.parse(value)
      if (Number.isFinite(epoch)) cookie.expires = epoch / 1000
    } else if (key === 'max-age') {
      const seconds = Number.parseInt(value, 10)
      if (Number.isFinite(seconds)) cookie.expires = Date.now() / 1000 + seconds
    }
  }
  return cookie
}

const loginWithPage = async (page, persona = personas.submitter) => {
  await page.context().clearCookies()
  const response = await page.request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { email: persona.email, password: persona.password, remember: true },
  })
  const text = await response.text()
  expect(response.status(), `${persona.role} login failed: ${text}`).toBe(200)
  const body = JSON.parse(text)
  expect(body.csrf_token, `${persona.role} login missing CSRF token`).toBeTruthy()

  const cookies = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .flatMap((header) => apiOrigins.map((origin) => parseCookie(header.value, origin)))
    .filter(Boolean)
  expect(cookies.length, `${persona.role} login did not return a session cookie`).toBeGreaterThan(0)
  await page.context().addCookies(cookies)

  const session = await page.request.get(`${apiBaseUrl}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  expect(session.status(), `${persona.role} session verification failed`).toBe(200)
  const sessionBody = await session.json()
  expect(sessionBody.user?.email).toBe(persona.email)
  expect(
    sessionBody.csrf_token,
    `${persona.role} session verification missing CSRF token`,
  ).toBeTruthy()
  return sessionBody.csrf_token
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

const installAppShellApiStubs = async (page) => {
  const definitions = [
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
      body: { data: { enabled: false, phase: 'off', message: '' } },
    },
    { path: '/messages/threads**', body: { data: [] } },
    { path: '/teams**', body: { data: [] } },
    { path: '/rosters**', body: { data: [] } },
    {
      path: '/settings/shift-windows',
      body: { data: { day_start: '07:00', day_end: '19:00' } },
    },
    { path: '/overtime/eligibility', body: { data: { eligible: false } } },
  ]
  await Promise.all(
    definitions.map(({ path, body }) =>
      page.route(`${browserApiBaseUrl}${path}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
      ),
    ),
  )
}

const dismissIncidentalDialogs = async (page) => {
  for (const dialogName of ['Install VMECC', 'Notifications']) {
    const dialog = page.getByRole('dialog', { name: dialogName })
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Close' }).first().click({ force: true })
    }
  }
}

module.exports = {
  apiBaseUrl,
  apiJson,
  baseUrl,
  browserApiBaseUrl,
  dismissIncidentalDialogs,
  installAppShellApiStubs,
  loginWithPage,
  personas,
}
