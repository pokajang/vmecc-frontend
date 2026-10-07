const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')

const runId =
  process.env.VMECC_PERSONAL_UAT_RUN_ID || 'BETA-20260903-175000-personal-workflows-final'
const artifactDir = __dirname
const source = fs.readFileSync(
  path.resolve(process.cwd(), 'tests/e2e/employee-application-workflow-parity.spec.js'),
  'utf8',
)
const email =
  process.env.VMECC_APPLICATION_UAT_EMAIL ||
  source.match(/VMECC_APPLICATION_UAT_EMAIL \|\| '([^']+)'/)?.[1]
const password =
  process.env.VMECC_SMOKE_RBAC_PASSWORD ||
  source.match(/VMECC_SMOKE_RBAC_PASSWORD \|\| '([^']+)'/)?.[1]
const baseUrl = 'http://localhost:3000'
const results = []
const created = []
const cleanup = []
const network = []
const consoleErrors = []
const recoveries = [
  {
    classification: 'harness invalidation',
    cause: 'Initial overtime date was in the future relative to the server date.',
    correction: 'Use 2026-09-03 and restart the visible journey from a clean browser context.',
  },
  {
    classification: 'harness invalidation',
    cause: 'The first Salary detail oracle stopped at the mounted container before async records hydrated.',
    correction: 'Wait for the submitted record identifier inside the detail view and reject a terminal not-found state.',
  },
]

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const addResult = (journey, status, detail = {}) => results.push({ journey, status, ...detail })
const shot = (page, name) =>
  page.screenshot({ path: path.join(artifactDir, `${runId}-${name}.png`), fullPage: true })
const dismissObstruction = async (page) => {
  const control = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (!(await control.isVisible().catch(() => false))) return
  await control.click()
  await control.waitFor({ state: 'hidden' })
  const visibleDialogs = await page.locator('[role="dialog"]:visible').count()
  assert(visibleDialogs === 0, 'Onboarding obstruction remained after dismissal')
}
const recordSubmission = async (response, type) => {
  const payload = await response.json().catch(() => ({}))
  const record = payload?.data || payload
  const id = record?.display_id || record?.displayId || record?.id
  assert(id, `${type} response did not include a record identifier`)
  const entry = { type, id: String(id), internalId: record?.id || null }
  created.push(entry)
  return entry
}
const reopen = async (page, route, id, testId) => {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  await dismissObstruction(page)
  const search = page.locator('input[placeholder^="Search"]:visible').first()
  if (await search.isVisible().catch(() => false)) await search.fill(id)
  const summaryControl = page.getByRole('button', {
    name: new RegExp(`^Open .*${id}.*(?:summary)?$`, 'i'),
  })
  await summaryControl.first().waitFor({ state: 'visible', timeout: 30000 })
  await summaryControl.first().click()
  const detail = page.getByTestId(testId)
  await detail.waitFor({ state: 'visible', timeout: 30000 })
  await detail.getByText(id, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 })
  assert(
    (await detail.getByText(/record not found/i).count()) === 0,
    `${id} remained in a not-found detail state`,
  )
}
const cancelCurrentRecord = async (page, type, id) => {
  await page.getByRole('button', { name: 'More actions', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().click()
  const confirmLabel =
    type === 'leave' ? 'Cancel leave' : type === 'overtime' ? 'Cancel Claim' : 'Cancel claim'
  const responsePrefix =
    type === 'leave'
      ? '/api/leave/'
      : type === 'overtime'
        ? '/api/overtime/'
        : '/api/payroll/claims/'
  const responsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname
    return (
      pathname.startsWith(responsePrefix) &&
      pathname.endsWith('/cancel') &&
      response.request().method() === 'POST'
    )
  })
  await page.getByRole('button', { name: confirmLabel, exact: true }).click()
  const response = await responsePromise
  assert([200, 204].includes(response.status()), `${type} cancellation returned ${response.status()}`)
  await page.getByText('Cancelled', { exact: true }).first().waitFor({ state: 'visible' })
  cleanup.push({ type, id, result: 'cancelled through UI', method: 'POST' })
}

;(async () => {
  assert(email && password, 'Local synthetic test credentials are unavailable')
  const browser = await chromium.launch({ headless: false, slowMo: 125 })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/api/')) {
      network.push({ method: response.request().method(), path: url.pathname, status: response.status() })
    }
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    await dismissObstruction(page)
    addResult('authentication and single-session reuse', 'passed')

    await page.goto(`${baseUrl}/leave/new`, { waitUntil: 'domcontentloaded' })
    await dismissObstruction(page)
    await page.getByTestId('leave-type-annual-leave').click()
    await page.getByRole('button', { name: 'Submit request', exact: true }).click()
    await page.getByText('Validation error', { exact: true }).waitFor()
    await page.locator('#leave-start-date').fill('2026-09-15')
    await page.locator('#leave-end-date').fill('2026-09-15')
    await page.locator('#leave-reason').fill(`${runId} synthetic leave request`)
    await page.getByRole('button', { name: 'Submit request', exact: true }).click()
    await page.getByText('Confirm leave request', { exact: true }).waitFor()
    assert(
      (await page.getByText('Validation error', { exact: true }).count()) === 0,
      'Resolved Leave validation feedback remained behind confirmation',
    )
    await shot(page, 'leave-confirm-mobile-390')
    const leaveResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/leave' &&
        response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    const leaveResponse = await leaveResponsePromise
    assert([200, 201].includes(leaveResponse.status()), `Leave submission returned ${leaveResponse.status()}`)
    const leaveRecord = await recordSubmission(leaveResponse, 'leave')
    await page.waitForURL(/\/leave$/)
    await page.getByText(/It is pending approval\./i).first().waitFor({ state: 'visible' })
    await reopen(page, '/leave', leaveRecord.id, 'leave-detail')
    await shot(page, 'leave-detail-mobile-390')
    addResult('leave validation, submit, persist, and reopen', 'passed', { recordId: leaveRecord.id })
    await cancelCurrentRecord(page, 'leave', leaveRecord.id)

    await page.goto(`${baseUrl}/overtime/new`, { waitUntil: 'domcontentloaded' })
    await dismissObstruction(page)
    await page.getByTestId('overtime-type-weekday').click()
    await page.getByRole('button', { name: 'Submit request', exact: true }).click()
    await page.getByText('Check your entries', { exact: true }).waitFor()
    await page.locator('#overtime-claim-date').fill('2026-09-03')
    await page.locator('#overtime-start-time').fill('18:00')
    await page.locator('#overtime-end-time').fill('20:00')
    await page.locator('#overtime-reason').fill(`${runId} synthetic overtime request`)
    await page.getByRole('button', { name: 'Submit request', exact: true }).click()
    await page.getByText('Confirm overtime claim', { exact: true }).waitFor()
    assert(
      (await page.getByText('Check your entries', { exact: true }).count()) === 0,
      'Resolved Overtime validation feedback remained behind confirmation',
    )
    await shot(page, 'overtime-confirm-mobile-390')
    const overtimeResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/overtime' &&
        response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Confirm submission', exact: true }).click()
    const overtimeResponse = await overtimeResponsePromise
    assert(
      [200, 201].includes(overtimeResponse.status()),
      `Overtime submission returned ${overtimeResponse.status()}`,
    )
    const overtimeRecord = await recordSubmission(overtimeResponse, 'overtime')
    await page.waitForURL(/\/overtime$/)
    await page.getByText(/It is pending approval\./i).first().waitFor({ state: 'visible' })
    await reopen(page, '/overtime', overtimeRecord.id, 'overtime-detail')
    await shot(page, 'overtime-detail-mobile-390')
    addResult('overtime validation, submit, persist, and reopen', 'passed', {
      recordId: overtimeRecord.id,
    })
    await cancelCurrentRecord(page, 'overtime', overtimeRecord.id)

    await page.goto(`${baseUrl}/payroll/claims/new`, { waitUntil: 'domcontentloaded' })
    await dismissObstruction(page)
    await page.getByTestId('claim-type-salary').click()
    await page.locator('[data-testid^="claim-period-"]:not([disabled])').first().click()
    await page.getByTestId('payroll-claim-type-continue').click()
    await page.getByTestId('payroll-claim-form').waitFor({ state: 'visible', timeout: 30000 })
    await page.locator('#salary-payout-confirmed').waitFor({ state: 'visible', timeout: 30000 })
    await page.locator('#salary-payout-confirmed').check()
    await page.getByRole('button', { name: 'Submit request', exact: true }).click()
    await page.getByText('Submit Salary Payout Confirmation', { exact: true }).waitFor()
    await page.locator('#salary-submit-declaration').check()
    await shot(page, 'salary-confirm-mobile-390')
    const salaryResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/payroll/claims' &&
        response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Confirm Submit', exact: true }).click()
    const salaryResponse = await salaryResponsePromise
    assert([200, 201].includes(salaryResponse.status()), `Salary submission returned ${salaryResponse.status()}`)
    const salaryRecord = await recordSubmission(salaryResponse, 'salary')
    await page.getByRole('heading', { name: 'Claim submitted', exact: true }).waitFor({
      state: 'visible',
    })
    await page.getByText(/It remains subject to approval\./i).waitFor({ state: 'visible' })
    const submittedClaimActions = page.getByRole('group', { name: 'Submitted claim actions' })
    const submittedActionMetrics = await submittedClaimActions.getByRole('button').evaluateAll(
      (buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect()
          return { label: button.textContent.trim(), top: rect.top, width: rect.width, height: rect.height }
        }),
    )
    assert(
      submittedActionMetrics.map(({ label }) => label).join('|') ===
        'Go to claims list|Create another claim',
      'Mobile submitted-claim actions are not primary-first.',
    )
    assert(
      submittedActionMetrics.every(({ height }) => height >= 44),
      'Mobile submitted-claim actions do not retain 44px touch targets.',
    )
    assert(
      Math.abs(submittedActionMetrics[0].width - submittedActionMetrics[1].width) <= 1.5 &&
        submittedActionMetrics[0].top < submittedActionMetrics[1].top,
      'Mobile submitted-claim actions are not stacked at a consistent width.',
    )
    await page.getByRole('button', { name: 'Go to claims list', exact: true }).click()
    await reopen(page, '/payroll', salaryRecord.id, 'payroll-claim-detail')
    await shot(page, 'salary-detail-mobile-390')
    addResult('salary preview, submit, persist, and reopen', 'passed', { recordId: salaryRecord.id })

    await page.setViewportSize({ width: 1440, height: 1000 })
    await reopen(page, '/payroll', salaryRecord.id, 'payroll-claim-detail')
    await shot(page, 'salary-detail-desktop-1440')
    addResult('salary record desktop parity', 'passed')
    await page.setViewportSize({ width: 390, height: 844 })
    await cancelCurrentRecord(page, 'salary', salaryRecord.id)

    const forbiddenAdminRateCalls = network.filter(
      (entry) => entry.path === '/api/settings/overtime-rate-settings',
    )
    assert(forbiddenAdminRateCalls.length === 0, 'Salary form requested admin-only overtime settings')
    addResult('employee payroll permission boundary', 'passed', {
      adminRateRequests: forbiddenAdminRateCalls.length,
    })

    const unexpectedFailures = network.filter(
      (entry) => entry.status >= 400 && entry.path !== '/api/auth/session',
    )
    assert(unexpectedFailures.length === 0, 'Unexpected API failures were observed')
    addResult('network and console health', consoleErrors.length === 0 ? 'passed' : 'failed', {
      unexpectedFailures,
      consoleErrorCount: consoleErrors.length,
    })
  } catch (error) {
    await shot(page, 'failure').catch(() => {})
    addResult('run', 'failed', { message: error.message })
  } finally {
    fs.writeFileSync(
      path.join(artifactDir, `${runId}-results.json`),
      JSON.stringify(
        { runId, results, created, cleanup, network, consoleErrors, recoveries },
        null,
        2,
      ),
    )
    await context.close()
    await browser.close()
  }

  process.exitCode = results.some((item) => ['failed', 'blocked'].includes(item.status)) ? 1 : 0
})()
