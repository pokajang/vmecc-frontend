import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const runId = 'BETA-20260827-173816-era'
const baseUrl = 'http://127.0.0.1:3001'
const artifactDir = path.resolve('.qa', 'beta-tester', runId)
const evidenceDir = path.join(artifactDir, 'evidence')
const results = []

const users = {
  assessor: {
    id: 916,
    name: 'ER Assessment Operator',
    email: 'er.assessment.operator@example.test',
    status: 'active',
    permissions: ['reports.er_assessment.view'],
    roles: ['Tactical Response Team'],
  },
  ercoOnly: {
    id: 917,
    name: 'ERCO Only Operator',
    email: 'erco.only.operator@example.test',
    status: 'active',
    permissions: ['reports.erco.view'],
    roles: ['Tactical Response Team'],
  },
}

const record = (id, status, details = {}) => results.push({ id, status, ...details })
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (page, user) => {
  await page.route(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/api\/.*/, (route) => {
    const request = route.request()
    const requestPath = new URL(request.url()).pathname.replace(/^\/api/, '')
    if (requestPath === '/auth/session') {
      return json(route, { user, csrf_token: 'synthetic-redacted' })
    }
    if (requestPath === '/settings/modules') {
      return json(route, {
        data: { registry: [], configured: {}, effective: {}, fallbackMode: true },
      })
    }
    if (requestPath === '/settings/system-maintenance') {
      return json(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (requestPath.includes('/workflow/notifications')) {
      return json(route, { data: [], meta: { unread_count: 0 } })
    }
    if (requestPath.startsWith('/reports')) {
      return json(route, { data: [], meta: {} })
    }
    return json(route, { data: [], meta: {} })
  })
}

const createPage = async (browser, user, viewport) => {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] }
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) {
      diagnostics.failedRequests.push({ status: response.status(), url: response.url() })
    }
  })
  await installApiStubs(page, user)
  return { context, page, diagnostics }
}

const waitForShell = async (page) => {
  await page.locator('.wrapper').waitFor({ state: 'visible' })
  const remindLater = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (await remindLater.isVisible().catch(() => false)) await remindLater.click()
}

const noOverflow = async (page) =>
  page.evaluate(
    () =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <=
      document.documentElement.clientWidth + 1,
  )

const runPermissionJourneys = async (browser) => {
  {
    const { context, page, diagnostics } = await createPage(browser, users.assessor, {
      width: 1440,
      height: 1000,
    })
    await page.goto(`${baseUrl}/report/er-assessment`)
    await waitForShell(page)
    await page
      .getByRole('button', { name: 'ER Assessment Records', exact: true })
      .waitFor({ state: 'visible' })
    const directAllowed = await page
      .getByRole('button', { name: 'ER Assessment Records', exact: true })
      .isVisible()
    const navVisible = await page
      .getByRole('link', { name: 'ER Assessment', exact: true })
      .isVisible()
      .catch(() => false)
    await page.screenshot({
      path: path.join(evidenceDir, 'permission-assessor-desktop.png'),
      fullPage: true,
    })
    record('PERM-01', directAllowed ? 'passed' : 'failed', { directAllowed })
    record('PERM-02', navVisible ? 'passed' : 'failed', {
      navVisible,
      expected: 'An authorized ER Assessment operator can discover the module in navigation.',
    })
    record('TECH-01', diagnostics.pageErrors.length ? 'failed' : 'passed', diagnostics)
    await context.close()
  }

  {
    const { context, page, diagnostics } = await createPage(browser, users.ercoOnly, {
      width: 1440,
      height: 1000,
    })
    await page.goto(`${baseUrl}/report/erco`)
    await waitForShell(page)
    await page.getByRole('button', { name: 'ERCO Records', exact: true }).waitFor()
    const navVisible = await page
      .getByRole('link', { name: 'ER Assessment', exact: true })
      .isVisible()
      .catch(() => false)
    await page.goto(`${baseUrl}/report/er-assessment`)
    await page.getByText('You do not have permission to access this report page.').waitFor()
    const directDenied = await page
      .getByText('You do not have permission to access this report page.')
      .isVisible()
    await page.screenshot({
      path: path.join(evidenceDir, 'permission-erco-only-denied.png'),
      fullPage: true,
    })
    record('PERM-03', !navVisible ? 'passed' : 'failed', {
      navVisible,
      expected: 'An ERCO-only operator does not see the ER Assessment navigation item.',
    })
    record('PERM-04', directDenied ? 'passed' : 'failed', { directDenied })
    record('TECH-02', diagnostics.pageErrors.length ? 'failed' : 'passed', diagnostics)
    await context.close()
  }
}

const runRecoveryJourney = async (browser) => {
  const { context, page, diagnostics } = await createPage(browser, users.assessor, {
    width: 1440,
    height: 1000,
  })
  await page.goto(`${baseUrl}/report/er-assessment/new/setup`)
  await waitForShell(page)
  await page.getByTestId('er-assessment-report-setup-ready').waitFor()

  await page.getByLabel('Company', { exact: true }).fill(`${runId} VMECC`)
  await page.getByLabel('Date', { exact: true }).fill('2026-08-27')
  await page.getByLabel('Location', { exact: true }).fill('Synthetic Process Area')
  await page.getByLabel('Assessment type', { exact: true }).selectOption('working-at-height')
  await page.getByLabel('Scope of work', { exact: true }).fill('Synthetic elevated-light task.')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('heading', { name: 'Emergency response readiness' }).waitFor()

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  const backPreserved =
    (await page.getByLabel('Company', { exact: true }).inputValue()) === `${runId} VMECC`
  record('REC-01', backPreserved ? 'passed' : 'failed', { backPreserved })

  const recordsTab = page.getByRole('button', { name: 'ER Assessment Records', exact: true })
  await recordsTab.click()
  const unsavedTitle = page.getByText('Discard Unsaved Changes', { exact: true })
  await unsavedTitle.waitFor()
  await page.screenshot({
    path: path.join(evidenceDir, 'unsaved-change-dialog-desktop.png'),
    fullPage: true,
  })
  await page.getByLabel('Confirmation actions').getByRole('button', { name: 'Cancel' }).click()
  const cancelPreserved =
    (await page.getByLabel('Company', { exact: true }).inputValue()) === `${runId} VMECC`
  record('REC-02', cancelPreserved ? 'passed' : 'failed', { cancelPreserved })

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  const noButtons = page.getByRole('button', { name: 'No', exact: true })
  const yesButtons = page.getByRole('button', { name: 'Yes', exact: true })
  await noButtons.first().focus()
  await page.keyboard.press('Space')
  const keyboardSelected = (await noButtons.first().getAttribute('aria-pressed')) === 'true'
  for (let index = 1; index < (await yesButtons.count()); index += 1) {
    await yesButtons.nth(index).click()
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByText('Explain the gap and immediate action required.').waitFor()
  const focusedOnRecoveryField = await page.evaluate(
    () => document.activeElement?.id === 'era-remarks-0',
  )
  record('KEY-01', keyboardSelected ? 'passed' : 'failed', { keyboardSelected })
  record('REC-03', focusedOnRecoveryField ? 'passed' : 'failed', { focusedOnRecoveryField })
  await page.getByLabel(/Remarks \(required\)/).fill('Synthetic gap isolated before work starts.')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('heading', { name: 'Rescue planning' }).waitFor()

  await page.getByLabel('Rescue plan', { exact: true }).fill('Synthetic plan retained in the form.')
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click()
  const saveOutcome = await Promise.race([
    page
      .getByText('Draft saved', { exact: true })
      .first()
      .waitFor()
      .then(() => 'saved'),
    page
      .getByText(/Draft persistence is not connected/)
      .waitFor()
      .then(() => 'not-connected'),
  ])
  const saveFailureRetained =
    (await page.getByLabel('Rescue plan', { exact: true }).inputValue()) ===
    'Synthetic plan retained in the form.'
  record('REC-04', saveFailureRetained ? 'passed' : 'failed', {
    saveFailureRetained,
    saveOutcome,
  })
  await page.screenshot({
    path: path.join(evidenceDir, 'draft-failure-recovery-desktop.png'),
    fullPage: true,
  })
  record('TECH-03', diagnostics.pageErrors.length ? 'failed' : 'passed', diagnostics)
  await context.close()
}

const runMobileJourney = async (browser) => {
  const { context, page, diagnostics } = await createPage(browser, users.assessor, {
    width: 320,
    height: 568,
  })
  await page.goto(`${baseUrl}/report/er-assessment`)
  await waitForShell(page)
  await page.getByTestId('er-assessment-report-mobile-home').waitFor()
  const choices = page.getByTestId('er-assessment-report-mobile-type-selection').locator('button')
  const choiceCount = await choices.count()
  const choiceBoxes = await choices.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { width: box.width, height: box.height }
    }),
  )
  const touchTargetsPass = choiceBoxes.every((box) => box.height >= 44 && box.width >= 44)
  const homeNoOverflow = await noOverflow(page)
  await page.screenshot({
    path: path.join(evidenceDir, 'mobile-home-320.png'),
    fullPage: true,
  })
  await choices.first().click()
  await page.getByTestId('er-assessment-report-setup-ready').waitFor()
  const setupNoOverflow = await noOverflow(page)
  const selectedType = await page.getByLabel('Assessment type', { exact: true }).inputValue()
  record('MOB-01', choiceCount === 5 ? 'passed' : 'failed', { choiceCount })
  record('MOB-02', homeNoOverflow && setupNoOverflow ? 'passed' : 'failed', {
    homeNoOverflow,
    setupNoOverflow,
  })
  record('MOB-03', touchTargetsPass ? 'passed' : 'failed', { choiceBoxes })
  record('MOB-04', selectedType === 'working-at-height' ? 'passed' : 'failed', { selectedType })
  record('TECH-04', diagnostics.pageErrors.length ? 'failed' : 'passed', diagnostics)
  await context.close()
}

await fs.mkdir(evidenceDir, { recursive: true })
const browser = await chromium.launch({ headless: false, channel: 'chrome', slowMo: 125 })
try {
  await runPermissionJourneys(browser)
  await runRecoveryJourney(browser)
  await runMobileJourney(browser)
} finally {
  await browser.close()
}

await fs.writeFile(
  path.join(artifactDir, 'coverage-ledger.json'),
  `${JSON.stringify({ runId, results }, null, 2)}\n`,
  'utf8',
)

const failed = results.filter((item) => item.status === 'failed')
console.log(JSON.stringify({ runId, passed: results.length - failed.length, failed }, null, 2))
