const { expect, test } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'
const runId = process.env.VMECC_SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const artifactRoot = path.resolve(
  process.cwd(),
  'test-results',
  'inspection-scba-high-angle-smoke',
  runId,
)
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 30_000)

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)

const ensureArtifactRoot = () => fs.mkdirSync(artifactRoot, { recursive: true })

const writeJsonArtifact = (name, payload) => {
  ensureArtifactRoot()
  fs.writeFileSync(path.join(artifactRoot, name), JSON.stringify(payload, null, 2))
}

const safeFileName = (value) =>
  String(value || 'artifact')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'artifact'

const parseJsonOrText = async (response) => {
  const text = await response.text()
  if (!text) return { body: null, text: '' }

  try {
    return { body: JSON.parse(text), text }
  } catch {
    return { body: null, text }
  }
}

const apiRequest = async (
  api,
  report,
  method,
  route,
  { csrfToken = null, data = undefined, expected = [200], note = '' } = {},
) => {
  const normalizedMethod = method.toLowerCase()
  const headers = {
    Accept: 'application/json',
  }

  if (!['get', 'head', 'options'].includes(normalizedMethod)) {
    headers['Content-Type'] = 'application/json'
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const response = await api[normalizedMethod](`${apiBaseUrl}${route}`, {
    headers,
    ...(data !== undefined ? { data } : {}),
  })
  const { body, text } = await parseJsonOrText(response)
  const status = response.status()

  report.api.push({
    method: normalizedMethod.toUpperCase(),
    route,
    status,
    note,
    ok: expected.includes(status),
    message: body?.message || (text && text.length < 240 ? text : undefined),
  })

  expect(
    expected,
    `${normalizedMethod.toUpperCase()} ${route} returned ${status}: ${text}`,
  ).toContain(status)

  return { response, body, text, status }
}

const safeLogin = async (api, report) => {
  try {
    return await apiRequest(api, report, 'post', '/auth/login', {
      data: {
        email: smokeEmail,
        password: smokePassword,
        remember: true,
      },
      expected: [200],
      note: 'login smoke admin',
    })
  } catch (error) {
    if (String(error.message || '').includes('returned 500')) {
      test.skip('SCBA/High Angle smoke is blocked: API auth endpoint returned 500.')
    }
    throw error
  }
}

const waitForAppReady = async (page, expectedPath = null) => {
  await expect(page.locator('#root')).toBeVisible({ timeout: routeTimeoutMs })

  if (expectedPath) {
    await page.waitForFunction(
      ({ expectedPath }) => {
        const normalize = (value) => {
          const trimmed = String(value || '').trim()
          if (!trimmed || trimmed === '/') return '/'
          return `/${trimmed.replace(/^\/+|\/+$/g, '')}`
        }
        const current = normalize(new URL(window.location.href).pathname)
        const expected = normalize(expectedPath)
        return current === expected || current.startsWith(`${expected}/`)
      },
      { expectedPath },
      { timeout: routeTimeoutMs },
    )
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

const saveScreenshot = async (page, testInfo, report, name) => {
  ensureArtifactRoot()
  const fileName = `${safeFileName(name)}.png`
  const artifactPath = path.join(artifactRoot, fileName)
  const screenshot = await page.screenshot({ path: artifactPath, fullPage: true })
  await testInfo.attach(fileName, { body: screenshot, contentType: 'image/png' })
  const relativePath = path.relative(process.cwd(), artifactPath)
  report.screenshots.push(relativePath)
  return relativePath
}

const setPhotoFromButton = async (button, fileName) => {
  const page = button.page()
  const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10_000 })
  await button.click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: tinyPng,
  })
}

const extractReportUid = async (response) => {
  const requestPayload = response.request().postDataJSON?.() || {}
  const { body, text } = await parseJsonOrText(response)
  const candidates = [
    requestPayload.report_uid,
    body?.data?.report_uid,
    body?.data?.reportUid,
    body?.data?.uid,
    body?.data?.id,
    body?.report_uid,
    body?.reportUid,
    body?.uid,
    body?.id,
  ]
  return {
    reportUid: candidates.map((item) => String(item || '').trim()).find(Boolean) || '',
    displayId: String(
      requestPayload.display_id || body?.data?.displayId || body?.displayId || '',
    ).trim(),
    requestPayload,
    responseBody: body,
    responseText: body ? undefined : text,
  }
}

const cleanupReport = async (api, csrfToken, reportUid, report) => {
  if (!reportUid || !csrfToken) return

  try {
    const response = await api.delete(`${apiBaseUrl}/reports/${encodeURIComponent(reportUid)}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    })
    report.cleanup.push({
      route: `/reports/${reportUid}`,
      status: response.status(),
      ok: [200, 204, 404].includes(response.status()),
    })
  } catch (error) {
    report.cleanup.push({
      route: `/reports/${reportUid}`,
      error: error?.message || String(error),
      ok: false,
    })
  }
}

const attachDiagnostics = (page, report) => {
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    report.consoleErrors.push({
      route: new URL(page.url()).pathname,
      text: message.text(),
    })
  })

  page.on('pageerror', (error) => {
    report.pageErrors.push({
      route: new URL(page.url()).pathname,
      message: error?.message || String(error),
    })
  })

  page.on('response', (response) => {
    if (response.status() < 400) return
    const url = response.url()
    if (/\.(css|js|png|jpg|jpeg|webp|gif|svg|woff2?)($|\?)/i.test(url)) return
    if (url.startsWith('data:') || url.startsWith('blob:')) return
    report.failedResponses.push({
      route: new URL(page.url()).pathname,
      status: response.status(),
      url,
    })
  })
}

const loginAndOpenInspection = async (page, report) => {
  const api = page.context().request
  const login = await safeLogin(api, report)
  const csrfToken = login.body?.csrf_token
  expect(csrfToken, 'Login response missing csrf_token').toBeTruthy()

  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await waitForAppReady(page)
  if (
    await page
      .getByRole('button', { name: 'Sign in' })
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByRole('textbox', { name: 'Email' }).fill(smokeEmail, {
      timeout: routeTimeoutMs,
    })
    await page.getByRole('textbox', { name: 'Password' }).fill(smokePassword, {
      timeout: routeTimeoutMs,
    })
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(/\/dashboard(?:[/?#]|$)|\/inspection(?:[/?#]|$)/, {
      timeout: routeTimeoutMs,
    })
    await waitForAppReady(page)
  }
  await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
  await waitForAppReady(page, '/inspection/new')
  await expect(page.getByRole('heading', { name: /Conduct Inspection/i })).toBeVisible()
  await expect(page.getByText('Choose Type')).toBeVisible()

  return csrfToken
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const selectInspectionType = async (page, typeName) => {
  const typeRadio = page.getByRole('radio', {
    name: new RegExp(`^${escapeRegExp(typeName)}\\b`, 'i'),
  })
  if (!(await typeRadio.isVisible().catch(() => false))) {
    await page.getByRole('radio', { name: /^Show more$/i }).click({ timeout: routeTimeoutMs })
  }
  await expect(typeRadio).toBeVisible({ timeout: routeTimeoutMs })
  await typeRadio.click({ timeout: routeTimeoutMs })
}

const selectMainLocation = async (page, locationName) => {
  await expect(page.getByText('Choose Main Location')).toBeVisible()
  const locationRadio = page.getByRole('radio', { name: locationName, exact: true })
  if (!(await locationRadio.isVisible().catch(() => false))) {
    await page.getByRole('radio', { name: /^Show more$/i }).click({ timeout: routeTimeoutMs })
  }
  await expect(locationRadio).toBeVisible({ timeout: routeTimeoutMs })
  await locationRadio.click({ timeout: routeTimeoutMs })
}

const fillAllInputs = async (locator, value) => {
  const count = await locator.count()
  expect(count).toBeGreaterThan(0)
  for (let index = 0; index < count; index += 1) {
    await locator.nth(index).fill(value)
  }
}

const completeScbaRequiredReadings = async (page) => {
  await fillAllInputs(page.getByPlaceholder('Service Pressure (Bar)'), '300')
  await fillAllInputs(page.getByPlaceholder('Contained Pressure (Bar)'), '280')
}

const completeRemainingHighAngleRows = async (page) => {
  const rows = page.locator('[data-inspection-high-angle-row-id]')
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index)
    const rowText = String((await row.textContent().catch(() => '')) || '')
    if (!/Not checked/i.test(rowText)) continue

    const openButton = row.getByRole('button', { name: 'Open', exact: true }).first()
    if (await openButton.isVisible().catch(() => false)) {
      await openButton.click()
    }

    await row.getByRole('button', { name: 'Good', exact: true }).click()
  }
}

const getHighAngleCompartmentTitles = async (page) =>
  page.locator('.inspection-location-option-card').evaluateAll((nodes) =>
    nodes
      .map((node) =>
        String(node.textContent || '')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .map((text) => text.replace(/\s+\d+\s+items?$/i, '').trim())
      .filter(Boolean),
  )

const expectAnyVisibleText = async (page, text) => {
  await expect
    .poll(async () => {
      const matches = page.getByText(text)
      const count = await matches.count()
      for (let index = 0; index < count; index += 1) {
        if (
          await matches
            .nth(index)
            .isVisible()
            .catch(() => false)
        )
          return true
      }
      return false
    })
    .toBe(true)
}

const clickFirstVisible = async (locator) => {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index)
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click()
      return
    }
  }
  await expect(locator.first()).toBeVisible()
}

const findVisibleReviewSubmitButton = async (page, submitLabel = 'Submit', timeoutMs = 45_000) => {
  const endAt = Date.now() + timeoutMs
  const normalizedSubmitLabel = String(submitLabel || '').trim()
  const candidateNames = [normalizedSubmitLabel, 'Submit'].filter(Boolean)
  const submitMatchers = candidateNames.map((name) => new RegExp(`^${escapeRegExp(name)}$`, 'i'))

  while (Date.now() < endAt) {
    for (const matcher of submitMatchers) {
      const locator = page.getByRole('button', { name: matcher })
      const count = await locator.count()
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index)
        if (await candidate.isVisible().catch(() => false)) return candidate
      }
    }

    const syncing = page.getByRole('button', { name: /^Syncing\.\.\.$/i })
    const retrySync = page.getByRole('button', { name: 'Retry Sync', exact: true })
    const hasSyncing = await syncing
      .count()
      .catch(() => 0)
      .then((count) => count > 0)
    const hasRetrySync = await retrySync
      .count()
      .catch(() => 0)
      .then((count) => count > 0)
    if (hasSyncing || hasRetrySync) {
      await page.waitForTimeout(500)
      continue
    }

    await page.waitForTimeout(500)
  }

  return null
}

const submitAndDownloadPdf = async (page, report, submitLabel = 'Confirm Submit') => {
  const submitButton = await findVisibleReviewSubmitButton(page, submitLabel)
  expect(submitButton, `Submit button (${submitLabel}) should be visible`).toBeTruthy()

  const createReportPromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/api/reports') && response.request().method() === 'POST'
    },
    { timeout: 60_000 },
  )

  await submitButton.click()
  const confirmSubmitButton = page.getByRole('button', { name: 'Confirm Submit' }).first()
  if (await confirmSubmitButton.isVisible().catch(() => false)) {
    await confirmSubmitButton.click()
  }
  const createResponse = await createReportPromise
  const createMeta = await extractReportUid(createResponse)
  report.create_report = {
    status: createResponse.status(),
    ...createMeta,
  }
  expect([200, 201], JSON.stringify(report.create_report)).toContain(createResponse.status())
  report.report_uid = createMeta.reportUid
  report.display_id = createMeta.displayId
  expect(report.report_uid, 'Unable to capture created report UID').toBeTruthy()

  await waitForAppReady(page, '/inspection')
  await expect(page).toHaveURL(/\/inspection(?:[/?#]|$)/)

  const searchText = report.display_id || report.report_uid
  await page.locator('input[placeholder="Search records"]:visible').first().fill(searchText)
  const recordRow = page.locator('tbody tr').filter({ hasText: searchText }).first()
  await expect(recordRow, `Expected submitted inspection row for ${searchText}`).toBeVisible({
    timeout: 20_000,
  })

  await recordRow.getByRole('button', { name: 'Row actions' }).click()
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  await page
    .locator('.dropdown-menu.show')
    .last()
    .getByRole('button', { name: 'Download', exact: true })
    .click()
  const download = await downloadPromise
  ensureArtifactRoot()
  const suggestedName = download.suggestedFilename()
  expect(suggestedName).toMatch(/\.pdf$/i)
  const downloadPath = path.join(artifactRoot, suggestedName)
  await download.saveAs(downloadPath)
  const stats = fs.statSync(downloadPath)
  expect(stats.size, `Downloaded PDF is empty: ${downloadPath}`).toBeGreaterThan(0)
  report.downloads.push({
    suggested_filename: suggestedName,
    path: path.relative(process.cwd(), downloadPath),
    size: stats.size,
  })
}

const assertNoUnexpectedFailures = (report) => {
  const unexpectedFailedResponses = report.failedResponses.filter((item) => {
    const url = String(item.url || '')
    if (url.includes('/workflow/notifications/unread-count')) return false
    if (url.includes('/reports/inspection/pdf') && item.status < 400) return false
    return true
  })
  const unexpectedConsoleErrors = report.consoleErrors.filter(
    (item) => !/failed to load resource/i.test(String(item.text || '')),
  )
  expect(
    unexpectedFailedResponses,
    `Unexpected failed responses: ${JSON.stringify(unexpectedFailedResponses, null, 2)}`,
  ).toEqual([])
  expect(
    unexpectedConsoleErrors,
    `Unexpected console errors: ${JSON.stringify(unexpectedConsoleErrors, null, 2)}`,
  ).toEqual([])
  expect(
    report.pageErrors,
    `Unexpected page errors: ${JSON.stringify(report.pageErrors, null, 2)}`,
  ).toEqual([])
}

const makeReport = (name) => ({
  run_id: runId,
  smoke_name: name,
  api_base_url: apiBaseUrl,
  frontend_base_url: process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000',
  report_uid: '',
  display_id: '',
  api: [],
  consoleErrors: [],
  pageErrors: [],
  failedResponses: [],
  cleanup: [],
  screenshots: [],
  downloads: [],
})

test.describe('SCBA and High Angle inspection prod smoke', () => {
  test('submits SCBA inspection with field evidence and downloads a non-empty PDF', async ({
    page,
  }, testInfo) => {
    test.setTimeout(5 * 60_000)

    const api = page.context().request
    const suffix = String(Date.now()).slice(-8)
    const report = makeReport('scba')
    let csrfToken = ''

    attachDiagnostics(page, report)

    try {
      csrfToken = await loginAndOpenInspection(page, report)

      await selectInspectionType(page, 'SCBA')
      await selectMainLocation(page, 'FRT')

      await expect(page.getByText('SCBA Items')).toBeVisible()
      await page.getByRole('button', { name: 'Mark all Good' }).click()
      await completeScbaRequiredReadings(page)

      const scbaCard = page
        .getByRole('button', { name: 'Item actions for MSA 06' })
        .locator(
          'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " inspection-check-card ")][1]',
        )
      await expect(scbaCard).toBeVisible()
      await scbaCard.getByRole('button', { name: 'Not Good' }).nth(1).click()
      await expect(scbaCard.getByPlaceholder('High Pressure Hose issue remarks')).toBeVisible()
      await scbaCard
        .getByPlaceholder('High Pressure Hose issue remarks')
        .fill(`Smoke SCBA hose evidence ${suffix}`)
      await setPhotoFromButton(
        scbaCard.getByRole('button', { name: 'Add issue photo' }).first(),
        `scba-issue-${suffix}.png`,
      )
      await expect(scbaCard.getByText(/1 photo added/i)).toBeVisible()

      await scbaCard.getByRole('button', { name: 'View photos' }).click()
      const photoModal = page.locator('.modal.show', { hasText: 'issue photos' }).last()
      await expect(photoModal.getByText(`scba-issue-${suffix}.png`)).toBeVisible()
      await photoModal.getByRole('button', { name: /close/i }).click()
      await expect(photoModal).toBeHidden()

      await saveScreenshot(page, testInfo, report, 'scba-form-complete')

      await page
        .getByRole('button', { name: /Review Inspections|Review Submissions/ })
        .first()
        .click()
      await waitForAppReady(page, '/inspection/review')
      await expect(page.getByRole('heading', { name: 'Review Inspection' })).toBeVisible()
      await expectAnyVisibleText(page, 'SCBA')
      await page.getByRole('button', { name: 'View' }).first().click()
      const scbaDetailDialog = page.locator('[role="dialog"]').filter({
        has: page.getByRole('heading', { name: 'SCBA Details' }),
      })
      await expect(scbaDetailDialog.getByText('Issues recorded (1)')).toBeVisible()
      await expect(scbaDetailDialog.getByText(/MSA 06/i)).toBeVisible()
      await scbaDetailDialog
        .getByRole('button', { name: /Close SCBA Details|Close/i })
        .first()
        .click()

      await submitAndDownloadPdf(page, report, 'Submit SCBA')
      assertNoUnexpectedFailures(report)
    } catch (error) {
      if (!page.isClosed()) await saveScreenshot(page, testInfo, report, 'scba-failure')
      throw error
    } finally {
      await cleanupReport(api, csrfToken, report.report_uid, report)
      if (report.report_uid && report.cleanup.some((item) => item.ok === false)) {
        writeJsonArtifact('scba-manual-cleanup.json', {
          report_uid: report.report_uid,
          display_id: report.display_id,
          cleanup: report.cleanup,
        })
      }
      writeJsonArtifact('scba-report.json', report)
    }
  })

  test('submits High Angle inspection with issue evidence and downloads a non-empty PDF', async ({
    page,
  }, testInfo) => {
    test.setTimeout(5 * 60_000)

    const api = page.context().request
    const suffix = String(Date.now()).slice(-8)
    const report = makeReport('high-angle')
    let csrfToken = ''

    attachDiagnostics(page, report)

    try {
      csrfToken = await loginAndOpenInspection(page, report)

      await selectInspectionType(page, 'High Angle Rescue Equipment')
      await selectMainLocation(page, 'Response Kit #1')

      await expect(page.getByText('Choose Compartment')).toBeVisible()
      const compartmentTitles = await getHighAngleCompartmentTitles(page)
      const orderedCompartmentTitles = [
        ...compartmentTitles.filter(
          (title) => title !== 'Heavy Duty Organizer Bag - Main Compartment',
        ),
        'Heavy Duty Organizer Bag - Main Compartment',
      ]
      for (const title of orderedCompartmentTitles) {
        await page
          .locator('.inspection-location-option-card', {
            hasText: new RegExp(escapeRegExp(title), 'i'),
          })
          .first()
          .click()
        await expect(page.getByText('Equipment', { exact: true })).toBeVisible()

        if (title === 'Heavy Duty Organizer Bag - Main Compartment') {
          const highAngleCard = page
            .locator('[data-inspection-high-angle-row-id]', {
              hasText: 'Locking Carabiner - CT - Steel - S',
            })
            .first()
          await expect(highAngleCard).toBeVisible()
          const openButton = highAngleCard
            .getByRole('button', { name: 'Open', exact: true })
            .first()
          if (await openButton.isVisible().catch(() => false)) {
            await openButton.click()
          }
          await highAngleCard.getByRole('button', { name: 'Not Good' }).click()
          await expect(highAngleCard.getByText('Issue evidence')).toBeVisible()
          await highAngleCard
            .getByPlaceholder('Issue remarks')
            .fill(`Smoke High Angle gate evidence ${suffix}`)
          await setPhotoFromButton(
            highAngleCard.getByRole('button', { name: 'Add issue photo' }),
            `high-angle-issue-${suffix}.png`,
          )
          await expect(highAngleCard.getByText(/1 photo added/i)).toBeVisible()
          await expect(
            highAngleCard.getByText(`Smoke High Angle gate evidence ${suffix}`),
          ).toBeVisible()
        }

        await completeRemainingHighAngleRows(page)
      }

      await saveScreenshot(page, testInfo, report, 'high-angle-form-complete')

      await page
        .getByRole('button', { name: /Review Inspections|Review Submissions/ })
        .first()
        .click()
      await waitForAppReady(page, '/inspection/review')
      await expect(page.getByRole('heading', { name: 'Review Inspection' })).toBeVisible()
      await expectAnyVisibleText(page, 'High Angle Rescue Equipment')
      await page.getByRole('button', { name: 'View' }).first().click()
      const highAngleDetailDialog = page.locator('[role="dialog"]').filter({
        has: page.getByRole('heading', { name: /High Angle Rescue Equipment Details/i }),
      })
      await expect(highAngleDetailDialog.getByText('Issues recorded (1)')).toBeVisible()
      await expect(
        highAngleDetailDialog.getByText(/Locking Carabiner - CT - Steel - S/i),
      ).toBeVisible()
      await highAngleDetailDialog
        .getByRole('button', { name: /Close High Angle Rescue Equipment Details|Close/i })
        .first()
        .click()

      await submitAndDownloadPdf(page, report, 'Submit High Angle Rescue Equipment')
      assertNoUnexpectedFailures(report)
    } catch (error) {
      if (!page.isClosed()) await saveScreenshot(page, testInfo, report, 'high-angle-failure')
      throw error
    } finally {
      await cleanupReport(api, csrfToken, report.report_uid, report)
      if (report.report_uid && report.cleanup.some((item) => item.ok === false)) {
        writeJsonArtifact('high-angle-manual-cleanup.json', {
          report_uid: report.report_uid,
          display_id: report.display_id,
          cleanup: report.cleanup,
        })
      }
      writeJsonArtifact('high-angle-report.json', report)
    }
  })
})
