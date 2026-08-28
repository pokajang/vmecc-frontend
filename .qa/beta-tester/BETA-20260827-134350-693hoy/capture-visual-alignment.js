const { chromium } = require('@playwright/test')
const { mkdir, writeFile } = require('node:fs/promises')
const path = require('node:path')
const {
  apiBaseUrl,
  baseUrl,
  loginWithPage,
  personas,
} = require('../../../tests/e2e/support/reporting-live-auth')

const runId = 'BETA-20260827-134350-693hoy'
const outputDir = path.resolve(__dirname, '../../../../.qa', runId, 'evidence', 'live-alignment')

const viewports = [
  { key: 'mobile-390', width: 390, height: 844, isMobile: true },
  { key: 'desktop-1440', width: 1440, height: 1000, isMobile: false },
]

const observations = {
  runId,
  pages: [],
  console: [],
  pageErrors: [],
  failedResponses: [],
  recovery: [],
}

const attachObservers = (page, scope) => {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      observations.console.push({ scope, type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => {
    observations.pageErrors.push({ scope, message: error.message })
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      observations.failedResponses.push({
        scope,
        status: response.status(),
        method: response.request().method(),
        pathname: new URL(response.url()).pathname,
      })
    }
  })
}

const dismissOptionalObstruction = async (page, scope) => {
  const remindLater = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (!(await remindLater.isVisible().catch(() => false))) return

  const dialog = remindLater.locator('xpath=ancestor::*[@role="dialog"][1]')
  const dialogName = await dialog.getAttribute('aria-label').catch(() => '')
  await remindLater.click()
  await remindLater.waitFor({ state: 'hidden' })
  observations.recovery.push({
    scope,
    obstruction: dialogName || 'Complete your profile',
    action: 'Remind me later',
    classification: 'micro-recovery',
    result: 'dialog hidden and original journey resumed',
  })
}

const installStableSession = async (page, sessionBody) => {
  await page.route(`${apiBaseUrl}/auth/session`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionBody),
    }),
  )
}

const isolateOvertimeDraft = async (page) => {
  await page.route(`${apiBaseUrl}/overtime/draft`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' })
      return
    }

    const body = route.request().postDataJSON() || {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { ...(body.payload || {}), draft_version: 1 },
      }),
    })
  })
}

const capture = async (page, name) => {
  const screenshotPath = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  return screenshotPath
}

const collectMetrics = async (page, rootSelector) =>
  page.locator(rootSelector).evaluate((root) => {
    const visible = (element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      )
    }
    const controls = [...root.querySelectorAll('button, input, select, textarea, [role="radio"]')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          label: String(
            element.getAttribute('aria-label') ||
              element.textContent ||
              element.getAttribute('name') ||
              '',
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120),
          role: element.getAttribute('role') || element.tagName.toLowerCase(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })

    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      controls,
      undersizedControls: controls.filter(({ width, height }) => width < 44 || height < 44),
      headings: [...root.querySelectorAll('h1, h2, h3')]
        .filter(visible)
        .map((element) => element.textContent.replace(/\s+/g, ' ').trim()),
      cardCount: [...root.querySelectorAll('.card')].filter(visible).length,
      actionGroups: [...root.querySelectorAll('.workflow-stage-actions__group')]
        .filter(visible)
        .map((element) => ({
          className: element.className,
          labels: [...element.querySelectorAll('button')]
            .filter(visible)
            .map((button) => button.textContent.replace(/\s+/g, ' ').trim()),
        })),
    }
  })

const openOvertimeThroughVisibleUi = async (page, viewport) => {
  await page.goto(`${baseUrl}/dashboard?theme=light`, { waitUntil: 'domcontentloaded' })
  await dismissOptionalObstruction(page, `overtime-${viewport.key}-dashboard`)

  if (viewport.isMobile) {
    await page.getByRole('button', { name: /Open account menu/i }).click()
    await page.getByRole('button', { name: 'Apply Overtime', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Account', exact: true }).click()
    await page.getByRole('button', { name: 'Apply Overtime', exact: true }).click()
  }

  await page.getByTestId('overtime-type-selection').waitFor({ state: 'visible' })
}

const runOvertime = async (browser, storageState, sessionBody, viewport) => {
  const context = await browser.newContext({
    storageState,
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  })
  const page = await context.newPage()
  const scope = `overtime-${viewport.key}`
  attachObservers(page, scope)
  await installStableSession(page, sessionBody)
  await isolateOvertimeDraft(page)
  await openOvertimeThroughVisibleUi(page, viewport)

  const typeEvidence = await capture(page, `${scope}-type-selection`)
  const typeMetrics = await collectMetrics(page, '[data-testid="overtime-module"]')

  await page.getByTestId('overtime-type-weekday').click()
  await page.getByTestId('overtime-type-continue').click()
  await page.getByTestId('overtime-apply').waitFor({ state: 'visible' })
  const formEvidence = await capture(page, `${scope}-form`)
  const formMetrics = await collectMetrics(page, '[data-testid="overtime-module"]')

  await page.getByTestId('overtime-submit-action').click()
  await page.locator('[aria-invalid="true"]').first().waitFor({ state: 'visible' })
  const validationEvidence = await capture(page, `${scope}-validation`)
  const focusedField = await page.evaluate(() => document.activeElement?.id || '')

  observations.pages.push({
    scope,
    route: page.url(),
    entry: viewport.isMobile ? 'Account drawer > Apply Overtime' : 'Account menu > Apply Overtime',
    typeEvidence,
    formEvidence,
    validationEvidence,
    focusedField,
    backActionCount: await page
      .getByRole('button', { name: 'Back to overtime', exact: true })
      .count(),
    plainBackCount: await page.getByRole('button', { name: 'Back', exact: true }).count(),
    saveDraftCount: await page.getByRole('button', { name: /Save Draft/i }).count(),
    typeMetrics,
    formMetrics,
  })

  await context.close()
}

const openInspectionThroughVisibleUi = async (page, viewport) => {
  await page.goto(`${baseUrl}/dashboard?theme=light`, { waitUntil: 'domcontentloaded' })
  await dismissOptionalObstruction(page, `inspection-${viewport.key}-dashboard`)

  if (viewport.isMobile) {
    await page.getByRole('button', { name: /Open menu/i }).click()
    await page.getByRole('button', { name: 'Inspection', exact: true }).click()
  } else {
    await page.getByRole('link', { name: 'Inspection', exact: true }).click()
    await page.getByRole('button', { name: 'Conduct Inspection', exact: true }).click()
  }

  await page
    .getByText(/Choose type/i)
    .first()
    .waitFor({ state: 'visible' })
}

const runInspection = async (browser, storageState, sessionBody, viewport) => {
  const context = await browser.newContext({
    storageState,
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  })
  const page = await context.newPage()
  const scope = `inspection-${viewport.key}`
  attachObservers(page, scope)
  await installStableSession(page, sessionBody)
  await openInspectionThroughVisibleUi(page, viewport)

  const typeEvidence = await capture(page, `${scope}-type-selection`)
  const typeMetrics = await collectMetrics(page, '.inspection-module-page')
  await page.getByRole('radiogroup').getByRole('radio').first().click()
  await page.getByRole('list', { name: 'Inspection setup summary' }).waitFor({ state: 'visible' })
  const setupEvidence = await capture(page, `${scope}-setup-summary`)
  const setupMetrics = await collectMetrics(page, '.inspection-module-page')

  observations.pages.push({
    scope,
    route: page.url(),
    entry: viewport.isMobile
      ? 'Menu drawer > Inspection > Conduct Inspection'
      : 'Sidebar > Inspection > Conduct Inspection',
    typeEvidence,
    setupEvidence,
    typeMetrics,
    setupMetrics,
  })

  await context.close()
}

const main = async () => {
  await mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 150,
    args: ['--host-resolver-rules=EXCLUDE localhost, EXCLUDE 127.0.0.1, MAP * ~NOTFOUND'],
  })

  try {
    const authContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const authPage = await authContext.newPage()
    await loginWithPage(authPage, personas.submitter)
    const sessionResponse = await authPage.request.get(`${apiBaseUrl}/auth/session`, {
      headers: { Accept: 'application/json' },
    })
    const sessionBody = await sessionResponse.json()
    const storageState = await authContext.storageState()
    await authContext.close()

    for (const viewport of viewports) {
      await runOvertime(browser, storageState, sessionBody, viewport)
      await runInspection(browser, storageState, sessionBody, viewport)
    }

    observations.result = 'completed'
  } catch (error) {
    observations.result = 'failed'
    observations.error = { message: error.message, stack: error.stack }
    throw error
  } finally {
    await writeFile(
      path.join(outputDir, 'live-alignment-observations.json'),
      JSON.stringify(observations, null, 2),
    )
    await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
