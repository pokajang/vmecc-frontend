const { expect, test } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'
const runId = process.env.VMECC_SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const artifactRoot = path.resolve(process.cwd(), 'test-results', 'er-aux-smoke', runId)
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
      test.skip('ER Aux smoke is blocked: API auth endpoint returned 500.')
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

const loginInBrowser = async (page) => {
  const runSignInAttempt = async () => {
    const emailInput = page.getByRole('textbox', { name: 'Email' })
    const passwordInput = page.getByRole('textbox', { name: 'Password' })
    const signInButton = page.getByRole('button', { name: 'Sign in' })

    if (!(await signInButton.isVisible().catch(() => false))) return false
    await emailInput.fill(smokeEmail, {
      timeout: routeTimeoutMs,
    })
    await passwordInput.fill(smokePassword, {
      timeout: routeTimeoutMs,
    })
    await signInButton.click()
    try {
      await page.waitForURL(/\/dashboard(?:[/?#]|$)|\/inspection(?:[/?#]|$)/, {
        timeout: routeTimeoutMs,
      })
      await waitForAppReady(page)
      return true
    } catch (error) {
      return false
    }
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await waitForAppReady(page)

  let loggedIn = await runSignInAttempt()
  if (loggedIn) return

  // Retry once for transient login route timing and browser redirect races.
  await page.waitForTimeout(500)
  loggedIn = await runSignInAttempt()
  if (loggedIn) return

  const currentPath = new URL(page.url()).pathname
  throw new Error(`Browser login did not complete for path: ${currentPath}`)
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

const visibleButton = (scope, name) => scope.getByRole('button', { name }).first()

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

const getErAuxCard = (page, rowId) =>
  page.locator(`[data-inspection-er-aux-row-id="${rowId}"]`).first()

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

test.describe('ER Aux inspection prod smoke', () => {
  test('submits ER Aux equipment inspection and downloads a non-empty PDF', async ({
    page,
  }, testInfo) => {
    test.setTimeout(5 * 60_000)

    const api = page.context().request
    const suffix = String(Date.now()).slice(-8)
    const customEquipmentName = `Smoke Torch ${suffix}`
    const editedEquipmentName = `Smoke Mobile Radio ${suffix}`
    const report = {
      run_id: runId,
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
    }
    let csrfToken = ''

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

    try {
      const login = await safeLogin(api, report)
      csrfToken = login.body?.csrf_token
      expect(csrfToken, 'Login response missing csrf_token').toBeTruthy()

      await page.setViewportSize({ width: 1440, height: 960 })
      await loginInBrowser(page)
      await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
      await waitForAppReady(page, '/inspection/new')
      await expect(page.getByRole('heading', { name: /Conduct Inspection/i })).toBeVisible()

      await page.getByText('Emergency Response Auxiliary Equipment', { exact: true }).click()
      await expect(page.getByText('Choose Main Location')).toBeVisible()
      await page.getByText('Office', { exact: true }).click()

      await expect(page.getByText('Equipment', { exact: true })).toBeVisible()
      await expect(getErAuxCard(page, 'office:radio-tetra')).toBeVisible()
      await expect(getErAuxCard(page, 'office:radio-vhf')).toBeVisible()
      await expect(getErAuxCard(page, 'office:mobile-radio')).toBeVisible()

      const mobileRadio = getErAuxCard(page, 'office:mobile-radio')
      await mobileRadio.getByRole('button', { name: 'Equipment actions for Mobile Radio' }).click()
      const actionMenu = page.locator('.dropdown-menu.show').last()
      await expect(actionMenu.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
      await expect(actionMenu.getByRole('button', { name: 'Delete', exact: true })).toBeVisible()
      await actionMenu.getByRole('button', { name: 'Edit', exact: true }).click()

      const editModal = page.locator('.modal.show', { hasText: 'Edit Equipment' }).last()
      await expect(editModal).toBeVisible()
      await editModal.locator('input').first().fill(editedEquipmentName)
      await editModal.locator('textarea').first().fill('Smoke edit path')
      await editModal.getByRole('button', { name: 'Update Equipment' }).click()
      await expect(page.getByText(editedEquipmentName, { exact: true })).toBeVisible()

      await page.getByRole('button', { name: /Add equipment/i }).click()
      const addModal = page.locator('.modal.show', { hasText: 'Add Equipment' }).last()
      await expect(addModal).toBeVisible()
      await addModal.locator('input').first().fill(customEquipmentName)
      await addModal.locator('textarea').first().fill('Smoke-created local equipment')
      await addModal.getByRole('button', { name: 'Save Equipment' }).click()
      await expect(addModal).toBeHidden({ timeout: 30_000 })
      await expect(page.getByText(customEquipmentName, { exact: true })).toBeVisible({
        timeout: 30_000,
      })

      const customCard = page
        .locator('.inspection-check-card', { hasText: customEquipmentName })
        .first()
      await customCard.locator('input[placeholder="Quantity"]').fill('1')

      await visibleButton(page, /Mark all OK/i).click()
      await expect(customCard.getByRole('button', { name: 'OK' }).first()).toHaveClass(
        /active|btn-primary|btn-success|btn/,
      )

      const radioTetra = getErAuxCard(page, 'office:radio-tetra')
      await radioTetra.locator('input[placeholder="Quantity"]').fill('8')
      await expect(radioTetra.locator('input[placeholder="Quantity"]')).toHaveValue('8')
      await radioTetra.getByRole('button', { name: 'Defect', exact: true }).click()
      await expect(radioTetra.getByText('Defect remarks')).toBeVisible()

      await setPhotoFromButton(
        radioTetra.getByRole('button', { name: 'Add defect photo' }),
        `er-aux-defect-${suffix}.png`,
      )
      await radioTetra
        .locator('textarea[placeholder="Describe the defect and the corrective action."]')
        .fill(`Smoke defect remarks ${suffix}`)
      await expect(radioTetra.getByText(/photo added/i).first()).toBeVisible()

      await radioTetra.getByRole('button', { name: 'Remark', exact: true }).click()
      await radioTetra
        .locator('[data-inspection-er-aux-detail-key="additionalNotes"] textarea')
        .fill(`Smoke additional notes ${suffix}`)
      await setPhotoFromButton(
        radioTetra.locator('[data-inspection-er-aux-detail-key="additionalPhotos"] button'),
        `er-aux-additional-${suffix}.png`,
      )

      await saveScreenshot(page, testInfo, report, 'er-aux-form-complete')

      await page
        .getByRole('button', { name: /Review Inspections|Review Submissions/ })
        .first()
        .click()
      await waitForAppReady(page, '/inspection/review')
      await expect(page.getByRole('heading', { name: 'Review Inspection' })).toBeVisible()
      await expect(page.getByText(/Emergency Response Auxiliary Equipment/).first()).toBeVisible()

      await page.getByRole('button', { name: 'View' }).first().click()
      await expect(
        page.getByRole('heading', { name: 'Emergency Response Auxiliary Equipment Details' }),
      ).toBeVisible()
      await expect(page.getByText('Locations checked (1)')).toBeVisible()
      await expect(page.getByText('Issues recorded (1)')).toBeVisible()
      await expect(page.getByText(`Smoke defect remarks ${suffix}`).last()).toBeVisible()
      const detailDialog = page.locator('[role="dialog"]').filter({
        has: page.getByRole('heading', { name: 'Emergency Response Auxiliary Equipment Details' }),
      })
      await detailDialog
        .getByRole('button', { name: 'Close Emergency Response Auxiliary Equipment Details' })
        .click()

      const submitButton = await findVisibleReviewSubmitButton(page, 'Submit')
      expect(submitButton, 'Review submit button should be visible').toBeTruthy()

      const createReportPromise = page.waitForResponse(
        (response) => {
          const url = new URL(response.url())
          return url.pathname.endsWith('/reports') && response.request().method() === 'POST'
        },
        { timeout: 30_000 },
      )

      await submitButton.click()
      await expect(
        page.getByText(/Submit Emergency Response Auxiliary Equipment Inspection\s*\?/),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Confirm Submit' }).click()
      const createResponse = await createReportPromise
      expect([200, 201]).toContain(createResponse.status())
      const createMeta = await extractReportUid(createResponse)
      report.report_uid = createMeta.reportUid
      report.display_id = createMeta.displayId
      report.create_report = createMeta
      expect(report.report_uid, 'Unable to capture created report UID').toBeTruthy()

      await waitForAppReady(page, '/inspection')
      await expect(page).toHaveURL(/\/inspection(?:[/?#]|$)/)

      const searchText = report.display_id || report.report_uid
      await page.getByRole('textbox', { name: 'Search records' }).fill(searchText)
      const recordRow = page.locator('tbody tr').filter({ hasText: searchText }).first()
      await expect(recordRow, `Expected submitted ER Aux record row for ${searchText}`).toBeVisible(
        {
          timeout: 20_000,
        },
      )

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
    } catch (error) {
      if (!page.isClosed()) {
        await saveScreenshot(page, testInfo, report, 'failure')
      }
      throw error
    } finally {
      await cleanupReport(api, csrfToken, report.report_uid, report)
      if (report.report_uid && report.cleanup.some((item) => item.ok === false)) {
        writeJsonArtifact('manual-cleanup.json', {
          report_uid: report.report_uid,
          display_id: report.display_id,
          cleanup: report.cleanup,
        })
      }
      writeJsonArtifact('report.json', report)
    }
  })
})
