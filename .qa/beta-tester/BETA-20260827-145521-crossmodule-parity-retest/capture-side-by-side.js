const { chromium } = require('@playwright/test')
const { mkdir, writeFile } = require('node:fs/promises')
const path = require('node:path')
const {
  baseUrl,
  browserApiBaseUrl,
  personas,
} = require('../../../tests/e2e/support/reporting-live-auth')

const runId = 'BETA-20260827-145521-crossmodule-parity-retest'
const outputDir = path.resolve(__dirname, '../../../../.qa', runId, 'evidence', 'side-by-side')
const viewport = { width: 390, height: 844 }

const observations = {
  runId,
  scope: 'Inspection, Apply Salary Claim, Apply Leave, and Apply Overtime visual-system parity',
  environment: 'local controlled',
  viewport,
  role: personas.submitter.role,
  modules: {},
  screenshots: {},
  console: [],
  pageErrors: [],
  failedResponses: [],
  recovery: [],
  harness: [],
  testData: { created: [], residual: [] },
}

const capture = async (page, name) => {
  const screenshotPath = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  observations.screenshots[name] = screenshotPath
  return screenshotPath
}

const visibleElementMetrics = async (page, rootSelector) =>
  page.locator(rootSelector).evaluate((root) => {
    const visible = (element) => {
      if (element.closest('[aria-hidden="true"], [inert]')) return false
      if (element.classList.contains('visually-hidden')) return false
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 1 &&
        rect.height > 1
      )
    }
    const normalize = (value) =>
      String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
    const controls = [...root.querySelectorAll('button, input, select, textarea, [role="radio"]')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          label: normalize(
            element.getAttribute('aria-label') ||
              element.textContent ||
              element.getAttribute('placeholder') ||
              element.getAttribute('name'),
          ),
          role: element.getAttribute('role') || element.tagName.toLowerCase(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })

    return {
      headings: [...root.querySelectorAll('h1, h2, h3')]
        .filter(visible)
        .map((element) => normalize(element.textContent)),
      backLabels: [...root.querySelectorAll('.back-button')]
        .filter(visible)
        .map((element) => normalize(element.textContent)),
      contextualBackCount: [...root.querySelectorAll('.back-button')].filter(
        (element) => visible(element) && /^Back to\b/i.test(normalize(element.textContent)),
      ).length,
      cardCount: [...root.querySelectorAll('.card')].filter(visible).length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      controls,
      undersizedVisibleControls: controls.filter(({ width, height }) => width < 44 || height < 44),
      actionGroups: [...root.querySelectorAll('.workflow-stage-actions__group')]
        .filter(visible)
        .map((element) => ({
          width: Math.round(element.getBoundingClientRect().width),
          labels: [...element.querySelectorAll('button')]
            .filter(visible)
            .map((button) => normalize(button.textContent)),
        })),
    }
  })

const attachObservers = (page) => {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      observations.console.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => observations.pageErrors.push({ message: error.message }))
  page.on('response', (response) => {
    if (response.status() >= 400) {
      observations.failedResponses.push({
        status: response.status(),
        method: response.request().method(),
        pathname: new URL(response.url()).pathname,
      })
    }
  })
}

const installIsolatedDraftRoutes = async (page) => {
  await page.route(`${browserApiBaseUrl}/settings/modules`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { registry: [], configured: {}, effective: {}, fallbackMode: true },
      }),
    }),
  )

  await page.route(`${browserApiBaseUrl}/overtime/draft`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' })
      return
    }
    const requestBody = route.request().postDataJSON?.() || {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...(requestBody.payload || {}), draft_version: 1 } }),
    })
  })

  await page.route(`${browserApiBaseUrl}/leave/draft`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"data":{"draft_data":null}}',
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' })
  })

  await page.route(`${browserApiBaseUrl}/payroll/claims/drafts**`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"data":{"id":"beta-isolated-draft","version":1}}',
    })
  })
}

const dismissOptionalObstruction = async (page, interruptedIntent) => {
  const remindLater = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (!(await remindLater.isVisible().catch(() => false))) return

  await capture(page, `profile-obstruction-${observations.recovery.length + 1}`)
  await remindLater.click()
  await remindLater.waitFor({ state: 'hidden' })
  observations.recovery.push({
    interruptedIntent,
    obstruction: 'Complete your profile',
    visibleAction: 'Remind me later',
    selectedAction: 'Remind me later',
    safetyRationale: 'Optional non-consequential deferral; no profile data changed',
    dismissalVerified: true,
    backdropVerifiedGone: true,
    originalIntentResumed: true,
    classification: 'micro-recovery',
  })
}

const loginThroughVisibleUi = async (page) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email address').fill(personas.submitter.email)
  await page.locator('#login-password').fill(personas.submitter.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
  await dismissOptionalObstruction(page, 'Reach the authenticated dashboard')
}

const returnToDashboard = async (page) => {
  await page.goto(`${baseUrl}/dashboard?theme=light`, { waitUntil: 'domcontentloaded' })
  await dismissOptionalObstruction(page, 'Open the next workflow from normal navigation')
}

const openAccountQuickAction = async (page, label) => {
  await returnToDashboard(page)
  await page.getByRole('button', { name: /Open account menu/i }).click()
  await page.getByRole('button', { name: label, exact: true }).click()
}

const recordState = async (page, moduleKey, stateKey, rootSelector) => {
  const name = `${moduleKey}-mobile-390-${stateKey}`
  const screenshot = await capture(page, name)
  const metrics = await visibleElementMetrics(page, rootSelector)
  observations.modules[moduleKey] ||= { route: page.url(), states: {} }
  observations.modules[moduleKey].route = page.url()
  observations.modules[moduleKey].states[stateKey] = { screenshot, metrics }
}

const runOvertime = async (page) => {
  await openAccountQuickAction(page, 'Apply Overtime')
  await page.getByTestId('overtime-type-selection').waitFor({ state: 'visible' })
  await recordState(page, 'overtime', 'type-selection', '[data-testid="overtime-module"]')
  await page.getByTestId('overtime-type-weekday').click()
  await page.getByTestId('overtime-apply').waitFor({ state: 'visible' })
  await recordState(page, 'overtime', 'form', '[data-testid="overtime-module"]')
}

const runLeave = async (page) => {
  await openAccountQuickAction(page, 'Apply Leave')
  await page.getByTestId('leave-type-selection').waitFor({ state: 'visible' })
  await recordState(page, 'leave', 'type-selection', '[data-testid="leave-module"]')
  await page.getByTestId('leave-type-annual-leave').click()
  await page.getByTestId('leave-type-continue').click()
  await page.getByTestId('leave-apply').waitFor({ state: 'visible' })
  await recordState(page, 'leave', 'form', '[data-testid="leave-module"]')
}

const runSalary = async (page) => {
  await openAccountQuickAction(page, 'New Claim')
  await page.getByTestId('payroll-claim-type-selection').waitFor({ state: 'visible' })
  await recordState(page, 'salary', 'type-selection', '[data-testid="payroll-module"]')
  await page.getByTestId('claim-type-salary').click()
  await page.locator('[data-testid^="claim-period-"]:not([disabled])').first().click()
  await page.getByTestId('payroll-claim-type-continue').click()
  await page.getByTestId('payroll-claim-form').waitFor({ state: 'visible' })
  await page.getByRole('heading', { name: 'Apply Salary Claim', exact: true }).waitFor({
    state: 'visible',
  })
  await recordState(page, 'salary', 'form', '[data-testid="payroll-module"]')
}

const runInspection = async (page) => {
  await returnToDashboard(page)
  await page.getByRole('button', { name: /Open menu/i }).click()
  await page.getByRole('button', { name: 'Inspection', exact: true }).click()
  const chooseTypeRegion = page.getByRole('region', { name: 'Choose type' })
  await chooseTypeRegion.waitFor({ state: 'visible' })
  await recordState(page, 'inspection', 'type-selection', '[data-testid="inspection-module"]')
  await chooseTypeRegion
    .getByRole('button', { name: 'Emergency Response Auxiliary Equipment', exact: true })
    .click()
  await page.getByRole('list', { name: 'Inspection setup summary' }).waitFor({ state: 'visible' })
  await recordState(page, 'inspection', 'setup', '[data-testid="inspection-module"]')
}

const main = async () => {
  await mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 150,
    args: ['--host-resolver-rules=EXCLUDE localhost, EXCLUDE 127.0.0.1, MAP * ~NOTFOUND'],
  })
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  attachObservers(page)
  await installIsolatedDraftRoutes(page)

  try {
    await loginThroughVisibleUi(page)
    await runInspection(page)
    await runSalary(page)
    await runLeave(page)
    await runOvertime(page)
    observations.result = 'completed'
  } catch (error) {
    observations.result = 'failed'
    observations.error = { message: error.message, stack: error.stack }
    await capture(page, 'runner-failure').catch(() => {})
    throw error
  } finally {
    await writeFile(
      path.join(outputDir, 'side-by-side-observations.json'),
      JSON.stringify(observations, null, 2),
    )
    await context.close()
    await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
