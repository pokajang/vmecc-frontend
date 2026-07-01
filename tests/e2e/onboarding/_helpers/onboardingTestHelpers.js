const { expect } = require('@playwright/test')

let cachedApiBaseUrl = null
const pageCredentials = new WeakMap()

const normalizeUrl = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const withoutTrailing = trimmed.endsWith('/') ? trimmed.replace(/\/+$/, '') : trimmed
  const withApiBase = withoutTrailing.replace(/\/api$/, '')
  return `${withApiBase}/api`
}

const addApiBaseCandidate = (candidates, value) => {
  const normalized = normalizeUrl(value)
  if (!normalized) return

  if (!candidates.includes(normalized)) {
    candidates.push(normalized)
  }
}

const getApiBaseCandidates = (page) => {
  const candidates = []

  if (cachedApiBaseUrl) {
    addApiBaseCandidate(candidates, cachedApiBaseUrl)
  }

  if (process.env.VMECC_E2E_API_URL) {
    addApiBaseCandidate(candidates, process.env.VMECC_E2E_API_URL)
  }

  addApiBaseCandidate(candidates, 'http://localhost:8000/api')

  try {
    const origin = new URL(page.url()).origin
    if (origin && origin !== 'null') {
      addApiBaseCandidate(candidates, `${origin}/api`)
    }
  } catch {
    // continue
  }

  try {
    const fallbackBase = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
    const fallbackOrigin = new URL(fallbackBase).origin
    addApiBaseCandidate(candidates, `${fallbackOrigin}/api`)
  } catch {
    // continue
  }

  addApiBaseCandidate(candidates, 'http://localhost:3000/api')

  return candidates
}

const requestWithApiCandidate = async (page, requestHandler) => {
  let lastResponse = null

  const candidates = getApiBaseCandidates(page)
  for (const apiBaseUrl of candidates) {
    try {
      const response = await requestHandler(apiBaseUrl)
      if (!cachedApiBaseUrl && response?.ok?.()) {
        cachedApiBaseUrl = apiBaseUrl
      }

      if (response?.ok?.()) {
        return { response, apiBaseUrl }
      }

      lastResponse = response
    } catch {
      lastResponse = null
    }
  }

  if (lastResponse) return { response: lastResponse, apiBaseUrl: cachedApiBaseUrl }
  return { response: null, apiBaseUrl: cachedApiBaseUrl }
}

const delayMs = async (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const postLogin = async (page, email, password) => {
  const { response, apiBaseUrl } = await requestWithApiCandidate(page, (apiBaseUrl) =>
    page.context().request.post(`${apiBaseUrl}/auth/login`, {
      data: {
        email,
        password,
        remember: true,
      },
      headers: {
        Accept: 'application/json',
      },
    }),
  )

  if (apiBaseUrl) cachedApiBaseUrl = apiBaseUrl
  return response
}

const fetchSessionPayload = async (page) => {
  const { response } = await requestWithApiCandidate(page, (apiBaseUrl) =>
    page.context().request.get(`${apiBaseUrl}/auth/session`, {
      headers: {
        Accept: 'application/json',
      },
    }),
  )

  if (!response || !response.ok()) {
    return null
  }

  const payload = await response.json().catch(() => null)
  return payload
}

const waitForAuthenticatedApiSession = async (page, { timeout = 15000 } = {}) => {
  await expect
    .poll(
      async () => {
        const payload = await fetchSessionPayload(page)
        return Boolean(payload?.user?.id)
      },
      {
        timeout,
        message: 'Expected API session endpoint to report an authenticated user.',
      },
    )
    .toBe(true)
}

const isLoginScreenVisible = async (page, { timeout = 1500 } = {}) => {
  const emailInput = page.getByPlaceholder('Email')
  const passwordInput = page.getByPlaceholder('Password')
  const signInButton = page.getByRole('button', { name: 'Sign in' })

  const [hasEmailInput, hasPasswordInput, hasSignInButton] = await Promise.all([
    emailInput.isVisible({ timeout }).catch(() => false),
    passwordInput.isVisible({ timeout }).catch(() => false),
    signInButton.isVisible({ timeout }).catch(() => false),
  ])

  return hasEmailInput && hasPasswordInput && hasSignInButton
}

const loginThroughUi = async (page, { email, password, timeout = 20000 } = {}) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout })
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await waitForAuthenticatedApiSession(page, { timeout })
  await expect
    .poll(() => isLoginScreenVisible(page, { timeout: 750 }), {
      timeout,
      message: 'Expected the UI login form to disappear after sign-in.',
    })
    .toBe(false)
}

const ensureRouteAccess = async (page, route, { timeout = 20000 } = {}) => {
  await page.goto(route, { waitUntil: 'domcontentloaded' })

  const redirectedToLogin =
    normalizeRoute(new URL(page.url()).pathname) === '/login' ||
    (await isLoginScreenVisible(page, { timeout: 1500 }))

  if (redirectedToLogin) {
    const credentials = pageCredentials.get(page)
    expect(
      credentials,
      `Missing stored onboarding credentials for auth recovery on ${route}.`,
    ).toBeTruthy()

    await loginThroughUi(page, {
      email: credentials.email,
      password: credentials.password,
      timeout,
    })
    await page.goto(route, { waitUntil: 'domcontentloaded' })
  }

  await waitForRoute(page, route, { timeout })
}

const loginThroughApi = async (page, { email, password }) => {
  pageCredentials.set(page, { email, password })

  let loginResponse = await postLogin(page, email, password)
  expect(loginResponse, `No login response for ${email}`).toBeTruthy()

  if (!loginResponse.ok()) {
    await delayMs(500)
    loginResponse = await postLogin(page, email, password)
    expect(loginResponse, `No login response for ${email} after retry`).toBeTruthy()
  }

  const responseBody = await loginResponse.text()
  expect(loginResponse.ok(), `Login failed for ${email}: ${responseBody}`).toBe(true)

  await waitForAuthenticatedApiSession(page, { timeout: 12000 })
}

const normalizeRoute = (route) => {
  const path = new URL(`http://localhost${String(route || '').trim()}`).pathname
  const normalized = `/${path}`.replace(/^\/+/, '/').replace(/\/$/, '')
  return normalized || '/'
}

const waitForRoute = async (page, route, { timeout = 20000 } = {}) => {
  const expected = normalizeRoute(route)
  await expect
    .poll(() => normalizeRoute(new URL(page.url()).pathname), {
      timeout,
      message: `Expected pathname to be ${expected}`,
    })
    .toBe(expected)
}

const dismissStartupTutorialPrompt = async (page, { timeout = 2000 } = {}) => {
  const promptRoot = page.locator('.onboarding-tour-prompt')
  const skipButton = page.getByRole('button', { name: 'Skip' })
  const hasPrompt = await promptRoot.isVisible({ timeout }).catch(() => false)

  if (!hasPrompt) return

  await skipButton.click({ timeout })
}

const waitForAuthenticatedShell = async (
  page,
  { heading = /Dashboard Overview|Home/i, route = '/dashboard', timeout = 20000 } = {},
) => {
  await waitForAuthenticatedApiSession(page, { timeout })
  await ensureRouteAccess(page, route, { timeout })

  const headingLocator = page.getByRole('heading', { name: heading })
  const dashboardModuleLocator = page.locator('[data-tour-id="dashboard-module"]')
  const shellToggleLocator = page.getByRole('button', { name: 'Toggle sidebar' })

  // Use heading check first, then fall back to a stable dashboard shell anchor when
  // permission or module-visibility variance makes the exact heading unavailable.
  await expect
    .poll(
      async () => {
        if (await headingLocator.count()) {
          return headingLocator
            .first()
            .isVisible()
            .catch(() => false)
        }

        if (await dashboardModuleLocator.count()) {
          return dashboardModuleLocator
            .first()
            .isVisible()
            .catch(() => false)
        }

        if (await shellToggleLocator.count()) {
          return shellToggleLocator
            .first()
            .isVisible()
            .catch(() => false)
        }

        return false
      },
      {
        timeout,
        message:
          'Expected an authenticated dashboard shell heading or dashboard module anchor to be visible.',
      },
    )
    .toBe(true)

  await dismissStartupTutorialPrompt(page)
}

const waitForModuleAnchor = async (page, moduleSelector, { timeout = 20000 } = {}) => {
  await expect(page.locator(moduleSelector)).toBeVisible({ timeout })
}

const goToRouteAndWaitForModule = async (page, { route, moduleSelector, timeout = 30000 } = {}) => {
  await ensureRouteAccess(page, route, { timeout })
  await waitForModuleAnchor(page, moduleSelector, { timeout })
}

const startReplayTour = async (
  page,
  { eventName, source = 'tutorial_hub', route = null, moduleSelector = null, timeout = 30000 } = {},
) => {
  if (route && moduleSelector) {
    await goToRouteAndWaitForModule(page, { route, moduleSelector, timeout })
  }

  if (route && !moduleSelector) {
    await page.goto(route)
    await waitForRoute(page, route, { timeout })
  }

  await page.evaluate(
    ({ eventName, detail }) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }))
    },
    {
      eventName,
      detail: {
        source,
      },
    },
  )

  if (route) {
    await waitForRoute(page, route, { timeout })
  }

  if (moduleSelector) {
    await waitForModuleAnchor(page, moduleSelector, { timeout })
  }
}

const startRequestTour = async (
  page,
  { eventName, source = 'tutorial_hub', route = null, moduleSelector = null, timeout = 30000 } = {},
) => {
  await startReplayTour(page, {
    eventName,
    source,
    route,
    moduleSelector,
    timeout,
  })
}

module.exports = {
  dismissStartupTutorialPrompt,
  goToRouteAndWaitForModule,
  loginThroughApi,
  startReplayTour,
  startRequestTour,
  waitForAuthenticatedShell,
  waitForModuleAnchor,
}
