const fs = require('node:fs')
const path = require('node:path')
const { expect, test } = require('@playwright/test')
const {
  API_BASE_URL,
  API_ORIGIN,
  AUTH_LOGIN_URL,
  FRONTEND_ORIGIN,
  collectJourneyDiagnostics,
  dismissIncidentalDialogs,
  gotoApprovedRoute,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  measureTouchTargets,
  redactDiagnostic,
  waitForApplicationReady,
  waitForRouteSettled,
} = require('./live-uat-support')
const {
  INSPECTION_TYPES,
  MATRIX_STATES,
  resolveInspectionType,
} = require('./inspection-cross-type-matrix')

const enabled =
  process.env.VMECC_LIVE_UAT === '1' &&
  process.env.VMECC_LIVE_UAT_READ_ONLY === '1' &&
  process.env.VMECC_INSPECTION_UIUX_UAT === '1'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const authStatePath = String(process.env.VMECC_INSPECTION_UIUX_AUTH_STATE || '').trim()
const inspectionPersona = String(process.env.VMECC_INSPECTION_UIUX_PERSONA || 'trt').trim()

const slug = (value) =>
  String(value || 'evidence')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const writeJson = (filename, value) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

const attachDiagnostics = (page) => {
  const collector = collectJourneyDiagnostics(page)
  return collector
}

const restoreOrLogin = async (page, context) => {
  if (authStatePath && fs.existsSync(authStatePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(authStatePath, 'utf8'))
      if (Array.isArray(state?.cookies) && state.cookies.length > 0) {
        await context.addCookies(state.cookies)
        await gotoApprovedRoute(page, '/inspection')
        await waitForApplicationReady(page)
        await waitForRouteSettled(page)
        if (new URL(page.url()).pathname !== '/login') return 'restored'
      }
    } catch {
      // Fall through to a fresh UI login when the short-lived state is unavailable.
    }
  }

  await loginPersonaThroughUi(page, inspectionPersona)
  if (authStatePath) {
    fs.mkdirSync(path.dirname(authStatePath), { recursive: true })
    const cookies = await context.cookies([FRONTEND_ORIGIN, API_ORIGIN])
    writeJson(authStatePath, { cookies })
  }
  return 'logged-in'
}

const isDraftEndpoint = (url) => {
  if (url.origin !== API_ORIGIN) return false
  return /^\/api\/reports\/drafts?(?:\/[^/]+)?$/.test(url.pathname)
}

const installShadowDraftGuard = async (context) => {
  const ledger = []
  let shadowVersion = 0
  const handler = async (route) => {
    const request = route.request()
    const method = request.method().toUpperCase()
    let url
    try {
      url = new URL(request.url())
    } catch {
      ledger.push({ kind: 'blocked-origin', method, url: redactDiagnostic(request.url()) })
      await route.abort('blockedbyclient')
      return
    }

    if (![FRONTEND_ORIGIN, API_ORIGIN].includes(url.origin)) {
      ledger.push({ kind: 'blocked-origin', method, url: redactDiagnostic(url.href) })
      await route.abort('blockedbyclient')
      return
    }

    if (url.origin === API_ORIGIN && isDraftEndpoint(url)) {
      if (method === 'GET') {
        ledger.push({ kind: 'shadow-draft-read', method, path: url.pathname })
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' })
        return
      }

      if (['POST', 'PUT'].includes(method)) {
        shadowVersion += 1
        let requestBody = {}
        try {
          requestBody = request.postDataJSON() || {}
        } catch {
          requestBody = {}
        }
        ledger.push({ kind: 'shadow-draft-write', method, path: url.pathname })
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              draft_id: 'inspection-uiux-shadow-draft',
              version: shadowVersion,
              saved_at: new Date().toISOString(),
              payload: requestBody.payload || {},
            },
          }),
        })
        return
      }

      if (method === 'DELETE') {
        ledger.push({ kind: 'shadow-draft-delete', method, path: url.pathname })
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' })
        return
      }
    }

    if (SAFE_METHODS.has(method) || (method === 'POST' && url.href === AUTH_LOGIN_URL)) {
      await route.fallback()
      return
    }

    ledger.push({ kind: 'blocked-mutation', method, url: redactDiagnostic(url.href) })
    await route.abort('blockedbyclient')
  }

  await context.route('**/*', handler)
  return {
    ledger,
    dispose: () => context.unroute('**/*', handler),
  }
}

const screenshot = async (pageOrLocator, testInfo, relativePath, options = {}) => {
  const filename = testInfo.outputPath('inspection-cross-type-uat', relativePath)
  fs.mkdirSync(path.dirname(filename), { recursive: true })
  await pageOrLocator.screenshot({ path: filename, animations: 'disabled', ...options })
  return path.relative(testInfo.outputDir, filename).replaceAll('\\', '/')
}

const capturePageMetrics = async (page, checkpoint) => ({
  checkpoint,
  url: redactDiagnostic(page.url()),
  title: await page.title(),
  overflow: await measureHorizontalOverflow(page),
  touchTargetsBelow44: await measureTouchTargets(page),
  visibleHeadings: await page
    .locator('h1:visible, h2:visible, h3:visible, [role="heading"]:visible')
    .allTextContents(),
  visibleActions: await page.locator('button:visible, a:visible').evaluateAll((elements) =>
    elements.slice(0, 80).map((element) => ({
      name: String(element.getAttribute('aria-label') || element.textContent || '').trim(),
      tag: element.tagName.toLowerCase(),
      className: String(element.className || ''),
    })),
  ),
})

const waitForInspectionHome = async (page) => {
  await gotoApprovedRoute(page, '/inspection')
  await waitForApplicationReady(page)
  await waitForRouteSettled(page)
  await dismissIncidentalDialogs(page)
  await expect(page.getByText('Conduct Inspection', { exact: true }).first()).toBeVisible()
}

const openTypeChooser = async (page, mobile) => {
  const visibleEntry = page.locator('[data-testid="inspection-new"]:visible').first()
  if (mobile && (await visibleEntry.isVisible().catch(() => false))) return
  if (await visibleEntry.isVisible().catch(() => false)) {
    await visibleEntry.click()
  } else {
    await gotoApprovedRoute(page, '/inspection/new')
  }
  await waitForRouteSettled(page)
  await expect(page.getByText(/Choose Type|Choose type/, { exact: true }).first()).toBeVisible()
}

const revealAllTypes = async (page) => {
  const showMore = page.getByRole('button', { name: /Show more/i }).first()
  if (await showMore.isVisible().catch(() => false)) await showMore.click()
}

const selectType = async (page, type) => {
  await revealAllTypes(page)
  const chooserLabel = type.chooserLabel || type.label
  const exact = page.getByRole('button', { name: chooserLabel, exact: true }).first()
  if (await exact.isVisible().catch(() => false)) {
    await exact.click()
  } else {
    const textButton = page.locator('button:visible').filter({ hasText: chooserLabel }).first()
    await expect(textButton).toBeVisible()
    await textButton.click()
  }
  await page.waitForURL(
    (url) => url.origin === FRONTEND_ORIGIN && url.pathname === '/inspection/new',
  )
  await waitForRouteSettled(page)
  await expect(page.getByText(type.label, { exact: true }).first()).toBeVisible()
}

const fetchInspectionRecords = async (page) => {
  return page.evaluate(async (apiBaseUrl) => {
    const response = await fetch(`${apiBaseUrl}/reports?reportType=inspection&scope=mine`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return { status: response.status, rows: [] }
    const payload = await response.json()
    return { status: response.status, rows: Array.isArray(payload?.data) ? payload.data : [] }
  }, API_BASE_URL)
}

test.describe.serial('inspection cross-type UIUX evidence', () => {
  test.skip(!enabled, 'Requires the explicit inspection UIUX live-UAT flags')

  test('captures the Conduct Inspection entry and each real type setup', async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(12 * 60_000)
    const guard = await installShadowDraftGuard(context)
    const diagnostics = attachDiagnostics(page)
    const projectKey = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop'
    const mobile = projectKey === 'mobile'
    const checkpoints = []
    const typeDiagnostics = []

    try {
      await restoreOrLogin(page, context)
      await waitForInspectionHome(page)

      checkpoints.push(await capturePageMetrics(page, `${projectKey}:home-collapsed`))
      await screenshot(page, testInfo, `screenshots/${projectKey}/home/00-conduct-inspection.png`, {
        fullPage: true,
      })

      await openTypeChooser(page, mobile)
      await revealAllTypes(page)
      checkpoints.push(await capturePageMetrics(page, `${projectKey}:home-expanded`))
      await screenshot(page, testInfo, `screenshots/${projectKey}/home/01-all-types.png`, {
        fullPage: true,
      })

      for (const type of INSPECTION_TYPES) {
        const typePage = await context.newPage()
        const typeCollector = attachDiagnostics(typePage)
        try {
          await waitForInspectionHome(typePage)
          await openTypeChooser(typePage, mobile)
          await selectType(typePage, type)
          checkpoints.push(await capturePageMetrics(typePage, `${projectKey}:${type.key}:entry`))
          await screenshot(
            typePage,
            testInfo,
            `screenshots/${projectKey}/${type.key}/01-entry.png`,
            { fullPage: true },
          )
        } finally {
          typeDiagnostics.push({ type: type.key, ...typeCollector.diagnostics })
          typeCollector.dispose()
          await typePage.close()
        }
      }

      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `metrics-${projectKey}.json`),
        checkpoints,
      )
    } finally {
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `network-guard-${projectKey}.json`),
        guard.ledger,
      )
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `diagnostics-${projectKey}.json`),
        { home: diagnostics.diagnostics, types: typeDiagnostics },
      )
      diagnostics.dispose()
      await guard.dispose()
    }

    expect(guard.ledger.filter((entry) => entry.kind === 'blocked-mutation')).toEqual([])
  })

  test('captures every deterministic form-body state for cross-type comparison', async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(15 * 60_000)
    const guard = await installShadowDraftGuard(context)
    const diagnostics = attachDiagnostics(page)
    const projectKey = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop'
    const matrixViewport = projectKey === 'mobile' ? 'mobile' : 'desktop'
    const checkpoints = []

    try {
      await restoreOrLogin(page, context)
      for (const type of INSPECTION_TYPES) {
        for (const state of MATRIX_STATES) {
          await gotoApprovedRoute(
            page,
            `/inspection/ux-matrix?viewport=${matrixViewport}&state=${state}&type=${type.key}`,
          )
          await waitForApplicationReady(page)
          await waitForRouteSettled(page)
          const matrixCase = page.locator(
            `[data-matrix-case="${type.key}:${state}:${matrixViewport}"]`,
          )
          await expect(matrixCase).toBeVisible()
          const checkpoint = `${projectKey}:${type.key}:${state}`
          checkpoints.push({
            ...(await capturePageMetrics(page, checkpoint)),
            caseBox: await matrixCase.boundingBox(),
          })
          await screenshot(
            matrixCase,
            testInfo,
            `screenshots/${projectKey}/${type.key}/matrix-${state}.png`,
          )
        }
      }
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `matrix-metrics-${projectKey}.json`),
        checkpoints,
      )
    } finally {
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `matrix-network-guard-${projectKey}.json`),
        guard.ledger,
      )
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `matrix-diagnostics-${projectKey}.json`),
        diagnostics.diagnostics,
      )
      diagnostics.dispose()
      await guard.dispose()
    }

    expect(guard.ledger.filter((entry) => entry.kind === 'blocked-mutation')).toEqual([])
  })

  test('captures available live submitted inspection details without mutation', async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(8 * 60_000)
    const guard = await installShadowDraftGuard(context)
    const diagnostics = attachDiagnostics(page)
    const projectKey = testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop'
    const ledger = []

    try {
      await restoreOrLogin(page, context)
      const response = await fetchInspectionRecords(page)
      for (const type of INSPECTION_TYPES) {
        const record = response.rows.find((row) => {
          const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
          const candidate =
            payload.inspectionType ||
            payload.inspection_type ||
            payload.incidentType ||
            row.incidentType
          return resolveInspectionType(candidate)?.key === type.key
        })
        if (!record) {
          ledger.push({
            type: type.key,
            status: 'data-blocked',
            reason: 'No live UAT-owned record',
          })
          continue
        }
        const reportId = String(record.report_uid || record.reportUid || record.id || '').trim()
        if (!reportId) {
          ledger.push({
            type: type.key,
            status: 'data-blocked',
            reason: 'Record has no route identity',
          })
          continue
        }
        await gotoApprovedRoute(page, `/inspection/${encodeURIComponent(reportId)}`)
        await waitForApplicationReady(page)
        await waitForRouteSettled(page)
        await expect(page.getByText(/Inspection Details/i).first()).toBeVisible()
        const evidence = await screenshot(
          page,
          testInfo,
          `screenshots/${projectKey}/${type.key}/18-live-detail.png`,
          { fullPage: true },
        )
        ledger.push({ type: type.key, status: 'passed', evidence })
      }
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `detail-ledger-${projectKey}.json`),
        {
          apiStatus: response.status,
          entries: ledger,
        },
      )
    } finally {
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `detail-network-guard-${projectKey}.json`),
        guard.ledger,
      )
      writeJson(
        testInfo.outputPath('inspection-cross-type-uat', `detail-diagnostics-${projectKey}.json`),
        diagnostics.diagnostics,
      )
      diagnostics.dispose()
      await guard.dispose()
    }

    expect(guard.ledger.filter((entry) => entry.kind === 'blocked-mutation')).toEqual([])
  })
})
