const { chromium } = require('@playwright/test')
const { mkdir, writeFile } = require('node:fs/promises')
const path = require('node:path')
const {
  baseUrl,
  browserApiBaseUrl,
  personas,
} = require('../../../tests/e2e/support/reporting-live-auth')

const runId = 'BETA-20260827-142700-otparity'
const outputDir = path.resolve(__dirname, '../../../../.qa', runId, 'evidence', 'live-gate')
const markerFilename = `${runId}-evidence.pdf`
const observations = {
  runId,
  scope: 'Apply Overtime visual-system and mobile workflow alignment against Inspection',
  viewport: { width: 390, height: 844 },
  role: personas.submitter.role,
  screenshots: {},
  overtime: {},
  inspection: {},
  console: [],
  pageErrors: [],
  failedResponses: [],
  recovery: [],
  harness: [
    {
      classification: 'harness invalidation',
      cause: 'Ambiguous duplicate inspection-new test ID in the first disposable run',
      correction: 'Scoped readiness and option interaction to the visible Choose type region',
      productImpact: 'none',
    },
  ],
  testData: {
    attachment: {
      markerFilename,
      serverId: null,
      uploadStatus: null,
      deleteStatus: null,
      cleanup: 'pending',
    },
  },
}

const capture = async (page, name) => {
  const screenshotPath = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  observations.screenshots[name] = screenshotPath
  return screenshotPath
}

const dismissOptionalObstruction = async (page, scope) => {
  const remindLater = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (!(await remindLater.isVisible().catch(() => false))) return

  const dialog = remindLater.locator('xpath=ancestor::*[@role="dialog"][1]')
  const accessibleName =
    (await dialog.getAttribute('aria-label').catch(() => '')) || 'Complete your profile'
  await capture(page, `${scope}-profile-obstruction`)
  await remindLater.click()
  await remindLater.waitFor({ state: 'hidden' })
  observations.recovery.push({
    scope,
    interruptedIntent: 'Continue to Apply Overtime through normal navigation',
    obstruction: accessibleName,
    visibleActions: ['Remind me later'],
    selectedAction: 'Remind me later',
    safetyRationale: 'Optional, non-consequential deferral; no profile data changed',
    dismissalVerified: true,
    backdropVerifiedGone: true,
    resumed: true,
    classification: 'micro-recovery',
  })
}

const loginThroughVisibleUi = async (page) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email address').fill(personas.submitter.email)
  await page.locator('#login-password').fill(personas.submitter.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
  await dismissOptionalObstruction(page, 'post-login')
}

const isolateOvertimeDraft = async (page) => {
  await page.route(`${browserApiBaseUrl}/overtime/draft`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' })
      return
    }
    const body = route.request().postDataJSON?.() || {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...(body.payload || {}), draft_version: 1 } }),
    })
  })
}

const collectTypeMetrics = async (page, rootSelector) =>
  page.locator(rootSelector).evaluate((root) => {
    const visible = (element) => {
      if (
        element.closest('[aria-hidden="true"], [inert]') ||
        element.classList.contains('visually-hidden')
      ) {
        return false
      }
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 1 &&
        rect.height > 1
      )
    }
    const triggers = [...root.querySelectorAll('.mobile-choice-list__trigger')].filter(visible)
    return {
      headings: [...root.querySelectorAll('h1, h2')]
        .filter(visible)
        .map((element) => element.textContent.replace(/\s+/g, ' ').trim()),
      triggerCount: triggers.length,
      triggerRoles: triggers.map((element) => element.getAttribute('role') || 'button'),
      triggerLabels: triggers.map((element) => element.textContent.replace(/\s+/g, ' ').trim()),
      iconCount: triggers.filter((element) =>
        element.querySelector('.mobile-choice-list__icon svg'),
      ).length,
      chevronCount: triggers.filter((element) =>
        element.querySelector('.mobile-choice-list__indicator--action svg'),
      ).length,
      continueCount: [...root.querySelectorAll('button')].filter(
        (button) => visible(button) && button.textContent.trim() === 'Continue',
      ).length,
      radioCount: [...root.querySelectorAll('[role="radio"]')].filter(visible).length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
    }
  })

const collectOvertimeFormMetrics = async (page) =>
  page.getByTestId('overtime-module').evaluate((root) => {
    const visible = (element) => {
      if (
        element.closest('[aria-hidden="true"], [inert]') ||
        element.classList.contains('visually-hidden')
      ) {
        return false
      }
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 1 &&
        rect.height > 1
      )
    }
    const ids = ['overtime-claim-date', 'overtime-start-time', 'overtime-end-time']
    const controls = ids.map((id) => {
      const element = document.getElementById(id)
      const rect = element.getBoundingClientRect()
      return { id, width: Math.round(rect.width), height: Math.round(rect.height) }
    })
    const attachmentTrigger = [...root.querySelectorAll('button')].find(
      (button) => visible(button) && /^(Add|Replace) attachment$/.test(button.textContent.trim()),
    )
    const attachmentRect = attachmentTrigger?.getBoundingClientRect()
    const dateRect = document.getElementById('overtime-claim-date').getBoundingClientRect()
    const actionGroup = root.querySelector('[aria-label="Overtime form actions"]')
    const actionRect = actionGroup.getBoundingClientRect()
    return {
      controls: [
        ...controls,
        {
          id: 'attachment-trigger',
          width: Math.round(attachmentRect?.width || 0),
          height: Math.round(attachmentRect?.height || 0),
        },
      ],
      formColumnWidth: Math.round(dateRect.width),
      actionWidth: Math.round(actionRect.width),
      nativeInputClass: document.getElementById('overtime-attachment')?.className || '',
      nativeInputBox: (() => {
        const rect = document.getElementById('overtime-attachment')?.getBoundingClientRect()
        return { width: Math.round(rect?.width || 0), height: Math.round(rect?.height || 0) }
      })(),
      backCount: [...root.querySelectorAll('button')].filter(
        (button) => visible(button) && button.textContent.trim() === 'Back to overtime',
      ).length,
      plainBackCount: [...root.querySelectorAll('button')].filter(
        (button) => visible(button) && button.textContent.trim() === 'Back',
      ).length,
      saveDraftCount: [...root.querySelectorAll('button')].filter(
        (button) => visible(button) && /save draft/i.test(button.textContent),
      ).length,
      cardCount: [...root.querySelectorAll('.card')].filter(visible).length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
    }
  })

const openOvertimeThroughVisibleUi = async (page) => {
  await page.goto(`${baseUrl}/dashboard?theme=light`, { waitUntil: 'domcontentloaded' })
  await dismissOptionalObstruction(page, 'overtime-dashboard')
  await page.getByRole('button', { name: /Open account menu/i }).click()
  await page.getByRole('button', { name: 'Apply Overtime', exact: true }).click()
  await page.getByTestId('overtime-type-selection').waitFor({ state: 'visible' })
}

const runOvertime = async (page) => {
  await openOvertimeThroughVisibleUi(page)
  observations.overtime.entry = 'Mobile Account drawer > Apply Overtime'
  observations.overtime.typeMetrics = await collectTypeMetrics(
    page,
    '[data-testid="overtime-module"]',
  )
  await capture(page, 'overtime-mobile-390-type-selection')

  await page.getByTestId('overtime-type-weekday').click()
  await page.getByTestId('overtime-apply').waitFor({ state: 'visible' })
  observations.overtime.directProgression = true
  observations.overtime.formMetrics = await collectOvertimeFormMetrics(page)
  await capture(page, 'overtime-mobile-390-form')

  await page.getByTestId('overtime-submit-action').click()
  await page.locator('[aria-invalid="true"]').first().waitFor({ state: 'visible' })
  observations.overtime.validationFocus = await page.evaluate(
    () => document.activeElement?.id || '',
  )
  observations.overtime.validationErrors = await page
    .locator('.invalid-feedback:visible')
    .allTextContents()
  await capture(page, 'overtime-mobile-390-validation')

  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add attachment', exact: true }).click()
  const chooser = await chooserPromise
  const uploadResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith('/workflow/attachments') &&
      response.request().method() === 'POST',
  )
  await chooser.setFiles({
    name: markerFilename,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% beta tester synthetic evidence\n'),
  })
  const uploadResponse = await uploadResponsePromise
  observations.testData.attachment.uploadStatus = uploadResponse.status()
  const uploadBody = await uploadResponse.json().catch(() => ({}))
  observations.testData.attachment.serverId = uploadBody?.data?.id || null
  await page.getByText('Evidence ready', { exact: false }).waitFor({ state: 'visible' })
  await capture(page, 'overtime-mobile-390-attachment-ready')

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      /\/workflow\/attachments\/\d+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'DELETE',
  )
  await page.getByRole('button', { name: 'Remove attachment', exact: true }).click()
  const deleteResponse = await deleteResponsePromise
  observations.testData.attachment.deleteStatus = deleteResponse.status()
  await page
    .getByRole('button', { name: 'Add attachment', exact: true })
    .waitFor({ state: 'visible' })
  observations.testData.attachment.cleanup = deleteResponse.ok()
    ? 'deleted through visible UI'
    : 'failed'
  await capture(page, 'overtime-mobile-390-attachment-removed')

  await page.getByRole('button', { name: 'Clear form', exact: true }).click()
  await page.getByTestId('overtime-type-selection').waitFor({ state: 'visible' })
  observations.overtime.clearRecovery = true
}

const openInspectionThroughVisibleUi = async (page) => {
  await page.goto(`${baseUrl}/dashboard?theme=light`, { waitUntil: 'domcontentloaded' })
  await dismissOptionalObstruction(page, 'inspection-dashboard')
  await page.getByRole('button', { name: /Open menu/i }).click()
  await page.getByRole('button', { name: 'Inspection', exact: true }).click()
  await page.getByRole('region', { name: 'Choose type' }).waitFor({ state: 'visible' })
}

const runInspection = async (page) => {
  await openInspectionThroughVisibleUi(page)
  observations.inspection.entry = 'Mobile Menu drawer > Inspection'
  observations.inspection.typeMetrics = await collectTypeMetrics(page, '.inspection-module-page')
  await capture(page, 'inspection-mobile-390-type-selection')

  await page
    .getByRole('region', { name: 'Choose type' })
    .locator('.mobile-choice-list__trigger')
    .first()
    .click()
  await page.waitForURL(/\/inspection\/new(?:[/?]|$)/)
  observations.inspection.directProgression = true
  await capture(page, 'inspection-mobile-390-post-selection')
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
    const context = await browser.newContext({
      viewport: observations.viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await isolateOvertimeDraft(page)
    await loginThroughVisibleUi(page)

    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        observations.console.push({ type: message.type(), text: message.text().slice(0, 300) })
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

    await runOvertime(page)
    await runInspection(page)
    observations.result = 'completed'
    await context.close()
  } catch (error) {
    observations.result = 'failed'
    observations.error = { message: error.message, stack: error.stack }
    throw error
  } finally {
    await writeFile(
      path.join(outputDir, 'visual-parity-observations.json'),
      JSON.stringify(observations, null, 2),
    )
    await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
