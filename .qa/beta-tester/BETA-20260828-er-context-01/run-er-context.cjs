const { chromium } = require('@playwright/test')
const { mkdir, writeFile } = require('node:fs/promises')
const path = require('node:path')
const {
  apiBaseUrl,
  baseUrl,
  loginWithPage,
  personas,
} = require('../../../tests/e2e/support/reporting-live-auth')

const runId = process.env.BETA_RUN_ID || 'BETA-20260828-er-context-01'
const outputDir = process.env.BETA_RUN_ID
  ? path.resolve(__dirname, '..', runId, 'evidence')
  : path.join(__dirname, 'evidence')
const viewport = { width: 390, height: 844 }
const observations = {
  runId,
  environment: { class: 'local', frontend: baseUrl, api: apiBaseUrl },
  browser: { mode: 'headed', channel: 'chrome', workers: 1, slowMo: 175, viewport },
  persona: personas.submitter.role,
  attempts: [],
  console: [],
  pageErrors: [],
  failedResponses: [],
  recovery: [],
}

const screenshot = async (page, name) => {
  const target = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: target, fullPage: true })
  return target
}

const dismissSafeObstruction = async (page, attempt) => {
  const safeActions = ['Remind me later', 'Not now', 'Skip', 'Close']
  for (const actionName of safeActions) {
    const action = page.getByRole('button', { name: actionName, exact: true }).first()
    if (!(await action.isVisible().catch(() => false))) continue
    const dialog = action.locator('xpath=ancestor::*[@role="dialog"][1]')
    if (!(await dialog.isVisible().catch(() => false))) continue
    const dialogName =
      (await dialog.getAttribute('aria-label').catch(() => '')) || 'optional dialog'
    const before = await screenshot(page, `${attempt}-obstruction-before-dismissal`)
    await action.click()
    await action.waitFor({ state: 'hidden' })
    observations.recovery.push({
      attempt,
      obstruction: dialogName,
      action: actionName,
      evidence: before,
      result: 'dialog action hidden; original journey resumed',
      classification: 'micro-recovery',
    })
    return
  }
}

const attachObservers = (page, attempt) => {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      observations.console.push({
        attempt,
        type: message.type(),
        text: message.text().slice(0, 500),
      })
    }
  })
  page.on('pageerror', (error) => {
    observations.pageErrors.push({ attempt, message: error.message.slice(0, 500) })
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      observations.failedResponses.push({
        attempt,
        status: response.status(),
        method: response.request().method(),
        pathname: new URL(response.url()).pathname,
      })
    }
  })
}

const selectWorkingAtHeight = async (page) => {
  const button = page.getByRole('button', { name: /Working at Height/i }).first()
  if (await button.isVisible().catch(() => false)) {
    await button.click()
    return
  }
  await page.getByText('Working at Height', { exact: true }).first().click()
}

const runAttempt = async (browser, attemptNumber) => {
  const attempt = `attempt-${attemptNumber}`
  const marker = `${runId}-${attemptNumber}`
  const expected = {
    company: `${marker} Company`,
    location: `${marker} Location`,
    assessmentType: 'working-at-height',
    scopeOfWork: `${marker} elevated-lighting replacement`,
  }
  const result = { attempt, expected, status: 'started' }
  observations.attempts.push(result)

  const context = await browser.newContext({
    viewport,
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: outputDir, size: viewport },
  })
  const page = await context.newPage()
  attachObservers(page, attempt)

  try {
    await loginWithPage(page, personas.submitter)
    await page.goto(`${baseUrl}/report/er-assessment?theme=light`, {
      waitUntil: 'domcontentloaded',
    })
    await page
      .getByRole('heading', { name: /Conduct ER Assessment/i })
      .waitFor({ state: 'visible' })
    await dismissSafeObstruction(page, attempt)
    result.homeEvidence = await screenshot(page, `${attempt}-01-er-home`)

    await selectWorkingAtHeight(page)
    await page.waitForURL(/\/report\/er-assessment\/new\/setup/)
    await page.getByTestId('er-assessment-report-setup-ready').waitFor({ state: 'visible' })
    await dismissSafeObstruction(page, attempt)
    result.setupRoute = page.url()
    result.setupBeforeEvidence = await screenshot(page, `${attempt}-02-setup-before-entry`)

    const companyInput = page.getByLabel(/Company.*assessed/i)
    const locationInput = page.getByLabel(/Location/i)
    const workActivity = page.getByLabel('Work activity being assessed', { exact: true })
    await companyInput.fill(expected.company)
    await page.getByLabel(/Assessment date/i).fill('2026-08-28')
    await locationInput.fill(expected.location)
    if ((await workActivity.nth(0).inputValue()) !== expected.assessmentType) {
      await workActivity.nth(0).selectOption(expected.assessmentType)
    }
    await workActivity.nth(1).fill(expected.scopeOfWork)
    result.setupInputValues = {
      company: await companyInput.inputValue(),
      location: await locationInput.inputValue(),
      assessmentType: await workActivity.nth(0).inputValue(),
      scopeOfWork: await workActivity.nth(1).inputValue(),
    }
    result.setupFilledEvidence = await screenshot(page, `${attempt}-03-setup-filled`)

    const draftRequestPromise = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname.endsWith('/api/reports/draft') &&
        request.method() === 'POST',
      { timeout: 15000 },
    )
    const draftResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/api/reports/draft') &&
        response.request().method() === 'POST',
      { timeout: 15000 },
    )
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    const [draftRequest, draftResponse] = await Promise.all([
      draftRequestPromise,
      draftResponsePromise,
    ])
    const requestBody = draftRequest.postDataJSON() || {}
    const payload = requestBody.payload || requestBody
    result.draftRequest = {
      status: draftResponse.status(),
      company: payload.company ?? null,
      location: payload.location ?? null,
      assessmentType: payload.assessmentType ?? payload.incidentType ?? null,
      scopeOfWork: payload.scopeOfWork ?? null,
      workflowStep: payload.workflowStep ?? null,
    }

    await page.waitForURL(/\/report\/er-assessment\/new\/requirements/)
    await page
      .getByRole('heading', { name: 'Emergency response readiness' })
      .waitFor({ state: 'visible' })
    result.requirementsRoute = page.url()
    result.requirementsEvidence = await screenshot(page, `${attempt}-04-requirements-context`)
    result.contextImmediately = {
      companyPresent: (await page.getByText(expected.company, { exact: true }).count()) > 0,
      locationPresent: (await page.getByText(expected.location, { exact: true }).count()) > 0,
      dashCount: await page.getByText('-', { exact: true }).count(),
    }

    const firstRequirement = page.getByRole('group', { name: /^Requirement 1:/ })
    const numberBox = await firstRequirement
      .locator('.er-assessment-requirement__number')
      .boundingBox()
    const titleBox = await firstRequirement
      .locator('.er-assessment-requirement-summary__title')
      .boundingBox()
    const remarksAction = firstRequirement.getByRole('button', {
      name: 'Add optional remarks for requirement 1',
    })
    result.requirementCardAudit = {
      numberAndQuestionInline:
        Boolean(numberBox && titleBox) && Math.abs(numberBox.y - titleBox.y) <= 8,
      disclosureElements: await firstRequirement
        .locator('summary, .disclosure-card, .disclosure-card__chevron')
        .count(),
      legacyRemarksText: await firstRequirement
        .getByText('Remarks optional', { exact: true })
        .count(),
      remarksActionVisible: await remarksAction.isVisible(),
    }

    const secondRequirement = page.locator('.er-assessment-requirement[role="group"]').nth(1)
    const firstRequirementBox = await firstRequirement.boundingBox()
    const secondRequirementBox = await secondRequirement.boundingBox()
    const requirementListBox = await page.locator('.er-assessment-requirement-list').boundingBox()
    const remarksBox = await remarksAction.boundingBox()
    const requirementStyle = await firstRequirement.evaluate((element) => {
      const style = window.getComputedStyle(element)
      return {
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
      }
    })
    result.requirementCardAudit.borderless = requirementStyle.borderTopWidth === '0px'
    result.requirementCardAudit.transparentBackground =
      requirementStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
    result.requirementCardAudit.fillsParentWidth =
      Boolean(firstRequirementBox && requirementListBox) &&
      Math.abs(firstRequirementBox.width - requirementListBox.width) <= 2
    result.requirementCardAudit.verticalGap =
      firstRequirementBox && secondRequirementBox
        ? secondRequirementBox.y - (firstRequirementBox.y + firstRequirementBox.height)
        : null
    result.requirementCardAudit.remarksRightAligned =
      Boolean(remarksBox && firstRequirementBox) &&
      Math.abs(
        remarksBox.x + remarksBox.width - (firstRequirementBox.x + firstRequirementBox.width),
      ) <= 2

    const continueButton = page.getByRole('button', { name: 'Continue', exact: true })
    const stickyActions = page.locator('.action-row-thumb--compact-sticky')
    const continueBeforeScroll = await continueButton.boundingBox()
    const stickyPosition = await stickyActions.evaluate(
      (element) => window.getComputedStyle(element).position,
    )
    await page.evaluate(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight)
      await new Promise((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)),
      )
    })
    const continueAfterScroll = await continueButton.boundingBox()
    result.continueActionAudit = {
      position: stickyPosition,
      stableWhileScrolling:
        Boolean(continueBeforeScroll && continueAfterScroll) &&
        Math.abs(continueBeforeScroll.x - continueAfterScroll.x) <= 2 &&
        Math.abs(continueBeforeScroll.y - continueAfterScroll.y) <= 2,
      bottomRight:
        Boolean(continueAfterScroll) &&
        viewport.width - (continueAfterScroll.x + continueAfterScroll.width) <= 24 &&
        continueAfterScroll.y + continueAfterScroll.height < viewport.height,
    }
    await page.evaluate(() => window.scrollTo(0, 0))

    const firstResponse = firstRequirement.getByRole('group', { name: 'Requirement 1 response' })
    const yesSaved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/api/reports/draft') &&
        response.request().method() === 'POST' &&
        response.ok(),
    )
    await firstResponse.getByRole('button', { name: 'Yes', exact: true }).click()
    await yesSaved
    result.requirementCardAudit.yesOpenedDrawer = await page
      .getByRole('dialog', { name: 'Add issue details' })
      .isVisible()
      .catch(() => false)

    await remarksAction.click()
    const optionalDrawer = page.getByRole('dialog', { name: 'Add remarks' })
    await optionalDrawer.waitFor({ state: 'visible' })
    result.requirementCardAudit.manualRemarksOpenedDrawer = true
    await optionalDrawer
      .getByLabel('Remarks (optional)', { exact: true })
      .fill(`${marker} optional remark`)
    const optionalSaved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/api/reports/draft') &&
        response.request().method() === 'POST' &&
        response.ok(),
    )
    await optionalDrawer.getByRole('button', { name: /^Save/i }).click()
    await optionalSaved
    await optionalDrawer.waitFor({ state: 'hidden' })

    await firstResponse.getByRole('button', { name: 'No', exact: true }).click()
    const noDrawer = page.getByRole('dialog', { name: 'Add issue details' })
    await noDrawer.waitFor({ state: 'visible' })
    result.requirementCardAudit.noOpenedDrawer = true
    result.requirementCardAudit.cameraActionVisible = await noDrawer
      .getByRole('button', { name: 'Take photo', exact: true })
      .isVisible()
    await noDrawer.getByLabel(/Gap and immediate action/).fill(`${marker} required gap and action`)
    const noSaved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname.endsWith('/api/reports/draft') &&
        response.request().method() === 'POST' &&
        response.ok(),
    )
    await noDrawer.getByRole('button', { name: /^Save/i }).click()
    await noSaved
    await noDrawer.waitFor({ state: 'hidden' })
    result.requirementCardEvidence = await screenshot(page, `${attempt}-05-requirement-card-audit`)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page
      .getByRole('heading', { name: 'Emergency response readiness' })
      .waitFor({ state: 'visible' })
    result.reloadEvidence = await screenshot(page, `${attempt}-06-requirements-after-reload`)
    result.contextAfterReload = {
      companyPresent: (await page.getByText(expected.company, { exact: true }).count()) > 0,
      locationPresent: (await page.getByText(expected.location, { exact: true }).count()) > 0,
      dashCount: await page.getByText('-', { exact: true }).count(),
    }
    result.status =
      result.contextImmediately.companyPresent && result.contextImmediately.locationPresent
        ? 'passed-immediate-transfer'
        : 'failed-immediate-transfer'
  } catch (error) {
    result.status = 'harness-or-environment-error'
    result.error = { message: error.message, stack: error.stack }
    result.errorEvidence = await screenshot(page, `${attempt}-error`).catch(() => null)
  } finally {
    await context.close()
  }
  return result
}

const main = async () => {
  await mkdir(outputDir, { recursive: true })
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    slowMo: 175,
    args: ['--host-resolver-rules=EXCLUDE localhost, EXCLUDE 127.0.0.1, MAP * ~NOTFOUND'],
  })

  try {
    const first = await runAttempt(browser, 1)
    if (first.status === 'failed-immediate-transfer') {
      observations.recovery.push({
        attempt: 'attempt-2',
        classification: 'product-retry',
        action: 'fresh browser context, re-authentication, and new marker-owned setup values',
      })
      await runAttempt(browser, 2)
    }
  } finally {
    observations.completedAt = new Date().toISOString()
    await writeFile(
      path.join(outputDir, 'observations.json'),
      JSON.stringify(observations, null, 2),
    )
    await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
