const fs = require('node:fs')
const path = require('node:path')

const FRONTEND_ORIGIN = 'https://vmecc.amiosh.com'
const API_BASE_URL = 'https://vmecc-api.amiosh.com/api'
const API_ORIGIN = new URL(API_BASE_URL).origin
const AUTH_LOGIN_URL = `${API_BASE_URL}/auth/login`
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const LEDGER_STATUSES = new Set([
  'passed',
  'failed',
  'permission-blocked',
  'data-blocked',
  'feature-disabled',
  'redirect-verified',
  'controlled-only',
])

const PERSONAS = {
  trt: {
    role: 'Tactical Response Team',
    emailVariable: 'VMECC_LIVE_UAT_TRT_EMAIL',
    passwordVariable: 'VMECC_LIVE_UAT_TRT_PASSWORD',
  },
  incidentCommander: {
    role: 'Incident Commander',
    emailVariable: 'VMECC_LIVE_UAT_INCIDENT_COMMANDER_EMAIL',
    passwordVariable: 'VMECC_LIVE_UAT_INCIDENT_COMMANDER_PASSWORD',
  },
  contractManager: {
    role: 'Contract Manager',
    emailVariable: 'VMECC_LIVE_UAT_CONTRACT_MANAGER_EMAIL',
    passwordVariable: 'VMECC_LIVE_UAT_CONTRACT_MANAGER_PASSWORD',
  },
  humanResource: {
    role: 'Human Resource',
    emailVariable: 'VMECC_LIVE_UAT_HUMAN_RESOURCE_EMAIL',
    passwordVariable: 'VMECC_LIVE_UAT_HUMAN_RESOURCE_PASSWORD',
  },
  finance: {
    role: 'Finance',
    emailVariable: 'VMECC_LIVE_UAT_FINANCE_EMAIL',
    passwordVariable: 'VMECC_LIVE_UAT_FINANCE_PASSWORD',
  },
  sysadmin: {
    role: 'System Administrator',
    emailVariable: 'VMECC_LIVE_UAT_SYSADMIN_EMAIL',
    passwordVariable: 'VMECC_LIVE_UAT_SYSADMIN_PASSWORD',
  },
}

const normalizeMethod = (method) =>
  String(method || 'GET')
    .trim()
    .toUpperCase()

const redactDiagnostic = (value) => {
  let output = String(value || '')
  output = output.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
  output = output.replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted-token]')
  output = output.replace(
    /([?&](?:token|password|code|csrf|session|email)=)[^&#\s]*/gi,
    '$1[redacted]',
  )
  output = output.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    '[redacted-uuid]',
  )
  output = output.replace(/\b\d{7,}\b/g, '[redacted-id]')
  return output
}

const sanitizeRequestUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl)
    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(key, '[redacted]')
    }
    url.hash = ''
    return redactDiagnostic(url.href)
  } catch {
    return redactDiagnostic(rawUrl)
  }
}

const classifyLiveUatRequest = ({ url, method }) => {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return 'block-origin'
  }

  const normalizedMethod = normalizeMethod(method)
  if (![FRONTEND_ORIGIN, API_ORIGIN].includes(parsed.origin)) return 'block-origin'
  if (SAFE_METHODS.has(normalizedMethod)) return 'allow-safe-method'
  if (normalizedMethod === 'POST' && parsed.href === AUTH_LOGIN_URL) return 'allow-auth-login'
  return 'block-mutation'
}

const installReadOnlyRequestGuard = async (context) => {
  const violations = []
  const handler = async (route) => {
    const request = route.request()
    const classification = classifyLiveUatRequest({ url: request.url(), method: request.method() })
    if (classification.startsWith('allow-')) {
      await route.fallback()
      return
    }
    violations.push({
      classification,
      method: normalizeMethod(request.method()),
      url: sanitizeRequestUrl(request.url()),
    })
    await route.abort('blockedbyclient')
  }

  await context.route('**/*', handler)
  return {
    violations,
    async dispose() {
      await context.unroute('**/*', handler)
    },
  }
}

const assertNoReadOnlyViolations = (violations) => {
  if (!Array.isArray(violations) || violations.length === 0) return
  const summary = violations
    .map((violation) => `${violation.classification}: ${violation.method} ${violation.url}`)
    .join('\n')
  throw new Error(`Live UAT read-only guard blocked request(s):\n${summary}`)
}

const getPersonaCredentials = (personaKey, environment = process.env) => {
  const persona = PERSONAS[personaKey]
  if (!persona) throw new Error(`Unknown live UAT persona: ${personaKey}`)
  const missing = [persona.emailVariable, persona.passwordVariable].filter(
    (variable) => !String(environment[variable] || '').trim(),
  )
  if (missing.length > 0) {
    throw new Error(`Missing live UAT credential variables: ${missing.join(', ')}`)
  }
  return {
    key: personaKey,
    role: persona.role,
    email: environment[persona.emailVariable],
    password: environment[persona.passwordVariable],
  }
}

const gotoApprovedRoute = async (page, route, options = {}) => {
  const target = new URL(route, FRONTEND_ORIGIN)
  if (target.origin !== FRONTEND_ORIGIN) {
    throw new Error(`Refusing live UAT navigation outside ${FRONTEND_ORIGIN}`)
  }
  return page.goto(target.href, { waitUntil: 'domcontentloaded', ...options })
}

const waitForApplicationReady = async (page) => {
  await page.locator('#root').waitFor({ state: 'visible' })
  await page.waitForFunction(() => {
    const root = document.querySelector('#root')
    if (!root) return false
    const text = String(root.textContent || '')
    return !/Loading application|Restoring session/i.test(text)
  })
}

const dismissIncidentalDialogs = async (page) => {
  for (const name of ['Install VMECC', 'Notifications']) {
    const dialog = page.getByRole('dialog', { name })
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Close' }).first().click()
    }
  }
}

const loginPersonaThroughUi = async (page, personaKey) => {
  const credentials = getPersonaCredentials(personaKey)
  await page.context().clearCookies()
  await gotoApprovedRoute(page, '/login')
  await waitForApplicationReady(page)
  await page.getByLabel('Email address').fill(credentials.email)
  await page.getByLabel('Password', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((url) => url.origin === FRONTEND_ORIGIN && url.pathname !== '/login')
  await waitForApplicationReady(page)
  return { key: credentials.key, role: credentials.role }
}

const collectJourneyDiagnostics = (page) => {
  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    serverErrors: [],
  }
  const onConsole = (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(redactDiagnostic(message.text()))
  }
  const onPageError = (error) => diagnostics.pageErrors.push(redactDiagnostic(error?.message))
  const onRequestFailed = (request) => {
    const errorText = request.failure()?.errorText || ''
    if (/blockedbyclient/i.test(errorText)) return
    diagnostics.failedRequests.push({
      method: request.method(),
      url: sanitizeRequestUrl(request.url()),
      error: redactDiagnostic(errorText),
    })
  }
  const onResponse = (response) => {
    if (response.status() < 500) return
    diagnostics.serverErrors.push({
      status: response.status(),
      url: sanitizeRequestUrl(response.url()),
    })
  }
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('requestfailed', onRequestFailed)
  page.on('response', onResponse)

  return {
    diagnostics,
    dispose() {
      page.off('console', onConsole)
      page.off('pageerror', onPageError)
      page.off('requestfailed', onRequestFailed)
      page.off('response', onResponse)
    },
  }
}

const measureHorizontalOverflow = (page, selector = 'html') =>
  page.locator(selector).evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflow: Math.max(0, element.scrollWidth - element.clientWidth),
  }))

const measureTouchTargets = (page, selector = 'button, a, input, select, textarea') =>
  page.locator(selector).evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return (
          style.visibility !== 'hidden' && style.display !== 'none' && rect.width && rect.height
        )
      })
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          name: String(element.getAttribute('aria-label') || element.textContent || '').trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })
      .filter((target) => target.width < 44 || target.height < 44),
  )

const captureEvidenceScreenshot = async (page, testInfo, label) => {
  const filename = `${String(label || 'evidence').replace(/[^a-z0-9-]+/gi, '-')}.png`
  const outputPath = testInfo.outputPath(filename)
  await page.screenshot({ path: outputPath, fullPage: true })
  await testInfo.attach(label, { path: outputPath, contentType: 'image/png' })
  return path.relative(testInfo.outputDir, outputPath).replaceAll('\\', '/')
}

const normalizeLedgerEntry = (entry) => {
  if (!LEDGER_STATUSES.has(entry?.status)) {
    throw new Error(`Invalid live UAT ledger status: ${entry?.status}`)
  }
  return {
    routeId: String(entry.routeId || ''),
    routePattern: String(entry.routePattern || ''),
    persona: String(entry.persona || 'unauthenticated'),
    viewport: String(entry.viewport || ''),
    status: entry.status,
    evidence: Array.isArray(entry.evidence) ? entry.evidence.map(redactDiagnostic).sort() : [],
    notes: redactDiagnostic(entry.notes || ''),
  }
}

const serializeLedger = (entries) => {
  const normalized = entries
    .map(normalizeLedgerEntry)
    .sort((left, right) =>
      [left.routeId, left.persona, left.viewport, left.status]
        .join('|')
        .localeCompare([right.routeId, right.persona, right.viewport, right.status].join('|')),
    )
  return `${JSON.stringify({ schemaVersion: 1, entries: normalized }, null, 2)}\n`
}

const writeLiveUatLedger = (testInfo, entries) => {
  const ledgerPath = testInfo.outputPath('live-uat-ledger.json')
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true })
  fs.writeFileSync(ledgerPath, serializeLedger(entries), 'utf8')
  return ledgerPath
}

module.exports = {
  API_BASE_URL,
  API_ORIGIN,
  AUTH_LOGIN_URL,
  FRONTEND_ORIGIN,
  PERSONAS,
  assertNoReadOnlyViolations,
  captureEvidenceScreenshot,
  classifyLiveUatRequest,
  collectJourneyDiagnostics,
  dismissIncidentalDialogs,
  getPersonaCredentials,
  gotoApprovedRoute,
  installReadOnlyRequestGuard,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  measureTouchTargets,
  redactDiagnostic,
  sanitizeRequestUrl,
  serializeLedger,
  waitForApplicationReady,
  writeLiveUatLedger,
}
