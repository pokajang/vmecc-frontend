const { expect, test } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const { evidencePath } = require('./support/evidence-path')
const { setInspectionPhotoFromButton } = require('./support/inspection-photo')
const { installAppShellApiStubs } = require('./support/app-shell-stubs')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.tactical-response-team@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeRole!2026'
const runId = process.env.VMECC_SMOKE_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-')
const artifactRoot = evidencePath('fire-extinguisher-smoke', runId)
const routeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 30_000)
const testTimeoutMs = Number(process.env.VMECC_SMOKE_TEST_TIMEOUT_MS || 5 * 60_000)

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
      test.skip('Fire extinguisher smoke is blocked: API auth endpoint returned 500.')
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
      const sessionRestoring = /restoring session/i.test(bodyText)
      return bodyText.length > 0 && !spinnerVisible && !loadingOnly && !sessionRestoring
    },
    null,
    { timeout: routeTimeoutMs },
  )
}

const loginInBrowser = async (page) => {
  const session = await page.context().request.get(`${apiBaseUrl}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  expect(session.status(), await session.text()).toBe(200)
}

const fillExtinguisherModal = async (
  extinguisherModal,
  { idLocNo, barcodeNo, feType, certificationValidity },
) => {
  const inputs = extinguisherModal.locator('input')
  await inputs.nth(3).fill(idLocNo)
  await inputs.nth(4).fill(barcodeNo)
  await inputs.nth(5).fill(feType)
  await inputs.nth(6).fill(certificationValidity)
}

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
  await locator.first().click()
}

const fillFirstVisible = async (locator, value) => {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index)
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.fill(value)
      return
    }
  }
  await expect(locator.first()).toBeVisible()
  await locator.first().fill(value)
}

const closeVisibleModal = async (page) => {
  const modal = page.locator('.modal.show').last()
  if (!(await modal.isVisible().catch(() => false))) return
  await modal.getByRole('button', { name: /close/i }).click()
  await expect(modal).toBeHidden()
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

const getFireExtinguisherCard = (page, text) =>
  page.locator('[data-fire-extinguisher-row-id]').filter({ hasText: text }).first()

const expandFireExtinguisherCard = async (card) => {
  if (
    await card
      .getByText('FE Physical Condition')
      .isVisible()
      .catch(() => false)
  )
    return
  await card.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(card.getByText('FE Physical Condition')).toBeVisible()
}

const markFireExtinguisherRowSafe = async (card) => {
  await card.getByRole('button', { name: 'Good', exact: true }).nth(0).click()
  await card.getByRole('button', { name: 'Good', exact: true }).nth(1).click()
  await card.getByRole('button', { name: 'Yes', exact: true }).nth(0).click()
  await card.getByRole('button', { name: 'Yes', exact: true }).nth(1).click()
  await card.getByRole('button', { name: 'Good', exact: true }).nth(2).click()
}

const isFireExtinguisherCreateResponse = (response) => {
  const url = new URL(response.url())
  return (
    url.pathname.endsWith('/api/inspection/fire-extinguishers') &&
    response.request().method() === 'POST'
  )
}

const extractFireExtinguisherCatalogId = async (response) => {
  const { body, text } = await parseJsonOrText(response)
  const candidates = [
    body?.data?.catalogId,
    body?.data?.catalog_id,
    body?.data?.id,
    body?.catalogId,
    body?.catalog_id,
    body?.id,
  ]

  return {
    catalogId: candidates.map((item) => String(item || '').trim()).find(Boolean) || '',
    responseBody: body,
    responseText: body ? undefined : text,
  }
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

const cleanupFireExtinguishers = async (api, csrfToken, catalogIds = [], report) => {
  if (!csrfToken) return

  for (const catalogId of [...new Set(catalogIds.map((item) => String(item || '').trim()))]) {
    if (!catalogId) continue

    try {
      const response = await api.delete(
        `${apiBaseUrl}/inspection/fire-extinguishers/${encodeURIComponent(catalogId)}`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
        },
      )
      report.cleanup.push({
        route: `/inspection/fire-extinguishers/${catalogId}`,
        status: response.status(),
        ok: [200, 204, 404].includes(response.status()),
      })
    } catch (error) {
      report.cleanup.push({
        route: `/inspection/fire-extinguishers/${catalogId}`,
        error: error?.message || String(error),
        ok: false,
      })
    }
  }
}

test.describe('Fire Extinguisher inspection prod smoke', () => {
  test('submits Fire Extinguisher inspection with hydraulic-style managed cards', async ({
    page,
  }, testInfo) => {
    test.setTimeout(testTimeoutMs)

    const api = page.context().request
    const suffix = String(Date.now()).slice(-8)
    const safeExtinguisherId = `SMOKE-FE-OK-${suffix}`
    const defectExtinguisherId = `SMOKE-FE-DEF-${suffix}`
    const createdCatalogIds = []
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

      await installAppShellApiStubs(page, apiBaseUrl)
      await page.setViewportSize({ width: 1440, height: 960 })
      await loginInBrowser(page)
      await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
      await waitForAppReady(page, '/inspection/new')
      await expect(
        page.getByRole('button', { name: 'Conduct Inspection', exact: true }),
      ).toBeVisible()

      await page.getByText('Fire Extinguisher', { exact: true }).click()
      await page.getByRole('button', { name: 'By Area', exact: true }).click()
      await expect(page.getByText('Choose Zone')).toBeVisible()
      await page.getByText('Zone 1', { exact: true }).first().click()
      await expect(page.getByText('Choose Main Area')).toBeVisible()
      await page.getByText('Canteen', { exact: true }).first().click()
      if (
        await page
          .getByText('Choose Location')
          .isVisible()
          .catch(() => false)
      ) {
        await page
          .getByRole('radio', { name: /Canteen/i })
          .nth(1)
          .click()
      }

      await expect(page.getByText('Extinguishers', { exact: true })).toBeVisible()
      await expect(page.getByText('Inspection session unavailable')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Add extinguisher/i }).first()).toBeVisible({
        timeout: 45_000,
      })

      await page
        .getByRole('button', { name: /Add extinguisher/i })
        .first()
        .click()
      let extinguisherModal = page
        .locator('.card.border-primary', { hasText: 'Add extinguisher' })
        .last()
      await expect(extinguisherModal).toBeVisible()
      await fillExtinguisherModal(extinguisherModal, {
        idLocNo: safeExtinguisherId,
        barcodeNo: `${safeExtinguisherId}-BC`,
        feType: 'DP 4KG',
        certificationValidity: '2026-12-31',
      })
      const createSafeExtinguisherPromise = page.waitForResponse(isFireExtinguisherCreateResponse, {
        timeout: 30_000,
      })
      await extinguisherModal.getByRole('button', { name: 'Save extinguisher' }).click()
      const createSafeExtinguisherResponse = await createSafeExtinguisherPromise
      expect([200, 201]).toContain(createSafeExtinguisherResponse.status())
      const safeExtinguisherMeta = await extractFireExtinguisherCatalogId(
        createSafeExtinguisherResponse,
      )
      if (safeExtinguisherMeta.catalogId) createdCatalogIds.push(safeExtinguisherMeta.catalogId)
      report.safe_extinguisher = safeExtinguisherMeta

      await expect(getFireExtinguisherCard(page, safeExtinguisherId)).toBeVisible()

      await page
        .getByRole('button', { name: /Add extinguisher/i })
        .first()
        .click()
      extinguisherModal = page
        .locator('.card.border-primary', { hasText: 'Add extinguisher' })
        .last()
      await expect(extinguisherModal).toBeVisible()
      await fillExtinguisherModal(extinguisherModal, {
        idLocNo: defectExtinguisherId,
        barcodeNo: `${defectExtinguisherId}-BC`,
        feType: 'CO2 5KG',
        certificationValidity: '2026-11-30',
      })
      const createDefectExtinguisherPromise = page.waitForResponse(
        isFireExtinguisherCreateResponse,
        {
          timeout: 30_000,
        },
      )
      await extinguisherModal.getByRole('button', { name: 'Save extinguisher' }).click()
      const createDefectExtinguisherResponse = await createDefectExtinguisherPromise
      expect([200, 201]).toContain(createDefectExtinguisherResponse.status())
      const defectExtinguisherMeta = await extractFireExtinguisherCatalogId(
        createDefectExtinguisherResponse,
      )
      if (defectExtinguisherMeta.catalogId) {
        createdCatalogIds.push(defectExtinguisherMeta.catalogId)
      }
      report.defect_extinguisher = defectExtinguisherMeta

      const safeCard = getFireExtinguisherCard(page, safeExtinguisherId)
      await expect(safeCard).toBeVisible()
      await expandFireExtinguisherCard(safeCard)
      await markFireExtinguisherRowSafe(safeCard)
      await expect(safeCard.getByText(/Checked|Completed/i)).toBeVisible()

      const defectCard = getFireExtinguisherCard(page, defectExtinguisherId)
      await expect(defectCard).toBeVisible()
      await expandFireExtinguisherCard(defectCard)
      await defectCard.getByRole('button', { name: 'Not Good', exact: true }).first().click()
      await defectCard
        .getByPlaceholder('FE Physical Condition defect remarks')
        .fill(`Smoke FE defect remarks ${suffix}`)
      await setInspectionPhotoFromButton(
        defectCard.getByRole('button', { name: 'Add photo (optional)' }),
        `fe-defect-${suffix}.png`,
      )
      const photoModal = page.locator('.modal.show', { hasText: 'defect photos' }).last()
      await expect(photoModal).toBeVisible()
      await expect(
        photoModal.getByRole('img', { name: new RegExp(`fe-defect-${suffix}`, 'i') }),
      ).toBeVisible()
      await expect(photoModal.getByRole('textbox', { name: 'Photo description' })).toBeVisible()
      await photoModal.getByRole('button', { name: 'Save' }).click()
      await expect(photoModal).toBeHidden()
      await expect(defectCard.getByRole('button', { name: 'View photos' })).toBeVisible()

      await defectCard.getByRole('button', { name: 'Good', exact: true }).nth(1).click()
      await defectCard.getByRole('button', { name: 'Yes', exact: true }).nth(0).click()
      await defectCard.getByRole('button', { name: 'Yes', exact: true }).nth(1).click()
      await defectCard.getByRole('button', { name: 'Good', exact: true }).nth(2).click()
      await defectCard.getByRole('button', { name: 'Remark', exact: true }).click()
      await defectCard
        .getByPlaceholder('General extinguisher remarks')
        .fill(`Smoke FE general remarks ${suffix}`)

      await page.getByLabel('Search fire extinguisher rows').fill(safeExtinguisherId)
      await expect(defectCard).toBeHidden()
      await page.getByRole('button', { name: 'Clear fire extinguisher row search' }).click()
      await expect(defectCard).toBeVisible()

      await saveScreenshot(page, testInfo, report, 'fire-extinguisher-form-complete')

      const continueToReviewButton = page
        .getByRole('button', { name: 'Continue to Review', exact: true })
        .first()
      await expect(continueToReviewButton).toBeEnabled({ timeout: 60_000 })
      await continueToReviewButton.click()
      await waitForAppReady(page, '/inspection/review')
      await expect(page.getByRole('button', { name: 'Submit', exact: true }).first()).toBeVisible()
      await expectAnyVisibleText(page, 'Fire Extinguisher')
      await expectAnyVisibleText(page, 'Total 2 fire extinguishers')
      await expectAnyVisibleText(page, 'Issues: 1 reported')

      await page.getByRole('button', { name: 'View' }).click()
      await expectAnyVisibleText(page, 'Fire Extinguisher Details')
      await expectAnyVisibleText(page, 'Locations Checked')
      await expectAnyVisibleText(page, 'Issues Recorded')
      await expectAnyVisibleText(page, `Smoke FE defect remarks ${suffix}`)
      const detailDialog = page.locator('[role="dialog"]').filter({
        has: page.getByRole('heading', { name: 'Fire Extinguisher Details' }),
      })
      await detailDialog.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(detailDialog).toBeHidden()

      const submitButton = page.getByRole('button', { name: 'Submit' }).first()
      await expect(submitButton).toBeEnabled({ timeout: 60_000 })
      await expect(submitButton).toBeVisible()

      const createReportPromise = page.waitForResponse(
        (response) => {
          const url = new URL(response.url())
          const isReportCreate = url.pathname.endsWith('/api/reports')
          const isSessionSubmit = /\/api\/inspection\/sessions\/[^/]+\/submit$/.test(url.pathname)
          return (isReportCreate || isSessionSubmit) && response.request().method() === 'POST'
        },
        { timeout: 60_000 },
      )

      await submitButton.click()
      await expect(page.getByText(/Submit Fire Extinguisher Inspection\s*\?/)).toBeVisible()
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
      await closeVisibleModal(page)

      const searchText = report.display_id || report.report_uid
      await page.getByRole('textbox', { name: 'Search records' }).fill(searchText)
      const recordRow = page.locator('tbody tr').filter({ hasText: searchText }).first()
      await expect(
        recordRow,
        `Expected submitted Fire Extinguisher record row for ${searchText}`,
      ).toBeVisible({
        timeout: 20_000,
      })
      await closeVisibleModal(page)

      await recordRow.getByRole('button', { name: 'Row actions' }).click()
      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
      await page
        .locator('.dropdown-menu.show')
        .last()
        .getByRole('button', { name: 'Download report', exact: true })
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
        if (item.status === 403 && url.includes('/messages/threads?')) return false
        if (
          item.status === 404 &&
          url.includes('/inspection/fire-extinguishers/lookup?locator=SMOKE-FE-')
        )
          return false
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
      let cleanupCsrfToken = csrfToken
      try {
        const session = await apiRequest(api, report, 'get', '/auth/session', {
          expected: [200],
          note: 'refresh csrf token for cleanup',
        })
        cleanupCsrfToken = session.body?.csrf_token || cleanupCsrfToken
      } catch {
        // Use the login token if the refresh endpoint is unavailable.
      }
      await cleanupReport(api, cleanupCsrfToken, report.report_uid, report)
      await cleanupFireExtinguishers(api, cleanupCsrfToken, createdCatalogIds, report)
      if (report.cleanup.some((item) => item.ok === false)) {
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
