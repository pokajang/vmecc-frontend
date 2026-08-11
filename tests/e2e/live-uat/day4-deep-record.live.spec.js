const fs = require('node:fs')
const { expect } = require('@playwright/test')
const { test } = require('./live-uat-fixture')
const matrix = require('./day4-record-matrix.json')
const { rowIdentity, safeGetJson, unwrapRows } = require('./live-uat-day3-support')
const {
  dismissIncidentalDialogs,
  getUnexpectedRouteDiagnostics,
  gotoApprovedRoute,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  redactDiagnostic,
  waitForApplicationReady,
  waitForRouteSettled,
} = require('./live-uat-support')

const liveEnabled =
  process.env.VMECC_LIVE_UAT === '1' && process.env.VMECC_LIVE_UAT_READ_ONLY === '1'

const diagnosticOffsets = (diagnostics) =>
  Object.fromEntries(Object.entries(diagnostics).map(([key, values]) => [key, values.length]))

const diagnosticDelta = (diagnostics, offsets) =>
  Object.fromEntries(
    Object.entries(diagnostics).map(([key, values]) => [key, values.slice(offsets[key] || 0)]),
  )

const payloadRow = (row = {}) => {
  let payload = row?.payload
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      payload = {}
    }
  }
  return payload && typeof payload === 'object' ? payload : {}
}

const mergedRow = (row = {}) => ({ ...payloadRow(row), ...row })

const recordIdentity = (row) => rowIdentity(payloadRow(row)) || rowIdentity(row)

const recordDisplayIdentity = (row) => {
  const item = mergedRow(row)
  return String(item.displayId || item.display_id || recordIdentity(row)).trim()
}

const mediaScore = (row) => {
  const seen = new Set()
  const walk = (value) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return 0
    seen.add(value)
    if (Array.isArray(value)) return value.reduce((total, item) => total + walk(item), 0)
    const mime = String(value.mimeType || value.mime_type || value.type || '').toLowerCase()
    const fileName = String(value.fileName || value.file_name || value.name || '')
    const url = String(value.url || value.thumbnailUrl || value.thumbnail_url || '')
    const isImage =
      mime.startsWith('image/') || /\.(?:jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(fileName)
    const ownScore = isImage && (url || fileName) ? 1 : 0
    return ownScore + Object.values(value).reduce((total, item) => total + walk(item), 0)
  }
  const item = mergedRow(row)
  return Math.max(
    Number(item.evidencePhotoCount || item.evidence_photo_count || 0) || 0,
    walk(item),
  )
}

const inspectionTypeKey = (row) => {
  const item = mergedRow(row)
  const value = String(
    item.incidentType || item.incident_type || item.inspectionType || item.inspection_type || '',
  )
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')

  if (/fire truck|daily readiness|\bfrt\b/.test(value)) return 'frt-daily'
  if (/fire extinguisher/.test(value)) return 'fire-extinguisher'
  if (/high angle/.test(value)) return 'high-angle'
  if (/hydraulic/.test(value)) return 'hydraulic'
  if (/auxiliary|\ber aux\b/.test(value)) return 'er-aux'
  if (/\bscba\b|breathing apparatus/.test(value)) return 'scba'
  if (/health safety environment|\bhse\b/.test(value)) return 'hse'
  if (/general/.test(value)) return 'general'
  return ''
}

const assertDeployedBuild = async (page) => {
  const response = await page.request.get(
    `https://vmecc.amiosh.com/version.json?uat=${Date.now()}`,
    { headers: { 'Cache-Control': 'no-cache' } },
  )
  expect(response.ok()).toBe(true)
  const payload = await response.json()
  expect(payload.buildId).toBe(matrix.expectedBuildId)
}

const projectViewports = (projectName) =>
  matrix.viewports.filter((viewport) => viewport.project === projectName)

const discoverRows = async (page, reportType, scope) => {
  const response = await safeGetJson(
    page,
    `/reports?reportType=${encodeURIComponent(reportType)}&scope=${encodeURIComponent(scope)}`,
  )
  if (!response.ok)
    return { status: 'data-blocked', reason: `GET returned ${response.status}`, rows: [] }
  return { status: 'resolved', reason: '', rows: unwrapRows(response.body) }
}

const visible = (locator) => locator.isVisible().catch(() => false)

const auditRenderedSurface = async (page) => {
  const surface = page.locator('.inspection-detail-drawer:visible').first()
  const hasDrawer = await visible(surface)
  const auditRoot = hasDrawer ? surface : page.locator('main, #root').first()

  const documentOverflow = await measureHorizontalOverflow(page)
  const surfaceMetrics = hasDrawer
    ? await surface.evaluate((element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return {
          left: Math.round(rect.left * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          borderLeftWidth: style.borderLeftWidth,
          borderLeftStyle: style.borderLeftStyle,
          borderRightWidth: style.borderRightWidth,
          borderRightStyle: style.borderRightStyle,
          boxShadow: style.boxShadow,
        }
      })
    : null

  const structure = await auditRoot.evaluate((root) => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      )
    }
    const imageExtension =
      /(?:^|[\s:(])[^\s<>]+\.(?:jpe?g|png|gif|webp|heic|heif|bmp|avif)(?:$|[\s),])/i
    const visibleText = [...root.querySelectorAll('*')]
      .filter((element) => element.children.length === 0 && isVisible(element))
      .map((element) => String(element.textContent || '').trim())
      .filter(Boolean)
    const images = [...root.querySelectorAll('img')].filter(isVisible).map((image) => {
      const imageRect = image.getBoundingClientRect()
      const ancestors = []
      let current = image.parentElement
      while (current && current !== root && ancestors.length < 5) {
        const style = window.getComputedStyle(current)
        const rect = current.getBoundingClientRect()
        const borderWidth =
          parseFloat(style.borderTopWidth) +
          parseFloat(style.borderRightWidth) +
          parseFloat(style.borderBottomWidth) +
          parseFloat(style.borderLeftWidth)
        const hasVisibleBackground =
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent'
        const cardLike =
          borderWidth > 0 ||
          style.boxShadow !== 'none' ||
          (hasVisibleBackground && parseFloat(style.paddingLeft) > 0)
        if (cardLike) {
          ancestors.push({
            className: String(current.className || '').slice(0, 180),
            borderWidth,
            background: style.backgroundColor,
            boxShadow: style.boxShadow,
            paddingLeft: style.paddingLeft,
            paddingRight: style.paddingRight,
            width: Math.round(rect.width),
          })
        }
        current = current.parentElement
      }
      const alt = String(image.getAttribute('alt') || '')
      return {
        className: String(image.className || '').slice(0, 180),
        altLooksLikeFilename: imageExtension.test(alt),
        width: Math.round(imageRect.width),
        height: Math.round(imageRect.height),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        exceedsRoot: imageRect.right > root.getBoundingClientRect().right + 1,
        cardLikeAncestors: ancestors,
      }
    })
    return {
      headingCount: [
        ...root.querySelectorAll('h1, h2, h3, .offcanvas-title, [role="heading"]'),
      ].filter(isVisible).length,
      imageCount: images.length,
      images,
      visibleFilenameCount: visibleText.filter((text) => imageExtension.test(text)).length,
      missingRecord: visibleText.some((text) => /^report not found\.?$/i.test(text)),
      closeControlCount: [...root.querySelectorAll('button, a')].filter((element) => {
        if (!isVisible(element)) return false
        return /close|back/i.test(
          String(element.getAttribute('aria-label') || element.textContent || '').trim(),
        )
      }).length,
    }
  })

  return {
    documentOverflow: documentOverflow.overflow,
    surfaceMetrics,
    ...structure,
  }
}

const assertCleanDelta = (delta, label) => {
  const unexpected = getUnexpectedRouteDiagnostics(delta, false)
  expect(delta.rateLimitErrors, `${label}: rate limited`).toEqual([])
  expect(delta.serverErrors, `${label}: server error`).toEqual([])
  expect(delta.pageErrors, `${label}: page error`).toEqual([])
  expect(delta.failedRequests, `${label}: failed request`).toEqual([])
  expect(unexpected.clientErrors, `${label}: unexpected 4xx`).toEqual([])
  expect(unexpected.consoleErrors, `${label}: console error`).toEqual([])
}

const auditRecord = async ({ page, diagnostics, route, moduleKey, viewport, persona }) => {
  const offsets = diagnosticOffsets(diagnostics)
  await gotoApprovedRoute(page, route)
  await waitForApplicationReady(page)
  await waitForRouteSettled(page)
  await dismissIncidentalDialogs(page)
  expect(new URL(page.url()).pathname, `${moduleKey}: returned to login`).not.toBe('/login')
  const metrics = await auditRenderedSurface(page)
  const delta = diagnosticDelta(diagnostics, offsets)
  assertCleanDelta(delta, `${persona}/${viewport.key}/${moduleKey}`)
  expect(
    metrics.documentOverflow,
    `${persona}/${viewport.key}/${moduleKey}: overflow`,
  ).toBeLessThanOrEqual(1)
  if (metrics.missingRecord) {
    return {
      persona,
      viewport: viewport.key,
      moduleKey,
      status: 'data-blocked',
      reason: 'Resolved list identity did not produce an available detail record',
      finalPath: redactDiagnostic(new URL(page.url()).pathname),
      metrics,
      diagnostics: Object.fromEntries(
        Object.entries(delta).map(([key, value]) => [key, value.length]),
      ),
    }
  }
  expect(
    metrics.headingCount,
    `${persona}/${viewport.key}/${moduleKey}: missing heading`,
  ).toBeGreaterThan(0)
  return {
    persona,
    viewport: viewport.key,
    moduleKey,
    status: 'passed',
    finalPath: redactDiagnostic(new URL(page.url()).pathname),
    metrics,
    diagnostics: Object.fromEntries(
      Object.entries(delta).map(([key, value]) => [key, value.length]),
    ),
  }
}

const auditInspectionRecordViaList = async ({
  page,
  diagnostics,
  row,
  moduleKey,
  viewport,
  persona,
}) => {
  const offsets = diagnosticOffsets(diagnostics)
  await gotoApprovedRoute(page, '/inspection')
  await waitForApplicationReady(page)
  await waitForRouteSettled(page)
  await dismissIncidentalDialogs(page)

  const scopeGroup = page
    .getByRole('group', { name: 'Record scope' })
    .filter({ visible: true })
    .first()
  if (await visible(scopeGroup)) {
    await scopeGroup.getByRole('button', { name: 'All', exact: true }).click()
    await waitForRouteSettled(page)
  }
  if (viewport.width < 576) {
    const viewAll = page.getByRole('button', { name: /^View all(?:\s|$)/ }).first()
    if (await visible(viewAll)) {
      await viewAll.click()
      await waitForRouteSettled(page)
    }
  }

  const displayId = recordDisplayIdentity(row)
  const search = page.getByPlaceholder('Search records').filter({ visible: true }).first()
  if (await visible(search)) {
    await search.fill(displayId)
    await waitForRouteSettled(page)
  }
  const escapedDisplayId = displayId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const recordButton = page
    .getByRole('button', { name: new RegExp(`Open inspection record ${escapedDisplayId}`) })
    .first()
  if (!(await visible(recordButton))) {
    return dataBlocked({
      persona,
      viewport,
      moduleKey,
      reason: 'Record is available through the API but not visible in the authorized list',
    })
  }
  await recordButton.click()
  await waitForRouteSettled(page)
  await page.waitForTimeout(1_000)
  const isScopeRecoveryGate = moduleKey === 'inspection:hse'
  if (isScopeRecoveryGate) {
    const openedUrl = new URL(page.url())
    expect(openedUrl.searchParams.get('scope'), `${moduleKey}: detail scope`).toBe('all')
    const durableDetailLocation = `${openedUrl.pathname}${openedUrl.search}`

    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForApplicationReady(page)
    await waitForRouteSettled(page)
    await dismissIncidentalDialogs(page)

    const refreshedUrl = new URL(page.url())
    expect(
      `${refreshedUrl.pathname}${refreshedUrl.search}`,
      `${moduleKey}: durable detail location`,
    ).toBe(durableDetailLocation)
  }
  const metrics = await auditRenderedSurface(page)
  expect(
    metrics.documentOverflow,
    `${persona}/${viewport.key}/${moduleKey}: overflow`,
  ).toBeLessThanOrEqual(1)
  if (isScopeRecoveryGate) {
    expect(metrics.missingRecord, `${moduleKey}: record missing after refresh`).toBe(false)
  }
  if (metrics.missingRecord) {
    return dataBlocked({
      persona,
      viewport,
      moduleKey,
      reason: 'Authorized list navigation did not retain its selected record',
    })
  }
  expect(
    metrics.headingCount,
    `${persona}/${viewport.key}/${moduleKey}: missing heading`,
  ).toBeGreaterThan(0)
  if (isScopeRecoveryGate) {
    const expectedBorderWidth = viewport.width <= 928 ? 0 : 1
    expect(
      Number.parseFloat(metrics.surfaceMetrics?.borderLeftWidth || '0'),
      `${persona}/${viewport.key}/${moduleKey}: detail drawer divider`,
    ).toBe(expectedBorderWidth)

    await page.getByRole('button', { name: 'Close inspection details' }).click()
    await waitForRouteSettled(page)
    const closedUrl = new URL(page.url())
    expect(closedUrl.pathname, `${moduleKey}: close destination`).toBe('/inspection')
    expect(closedUrl.searchParams.get('scope'), `${moduleKey}: close scope`).toBe('all')
  }
  const delta = diagnosticDelta(diagnostics, offsets)
  assertCleanDelta(delta, `${persona}/${viewport.key}/${moduleKey}`)
  return {
    persona,
    viewport: viewport.key,
    moduleKey,
    status: 'passed',
    finalPath: redactDiagnostic(new URL(page.url()).pathname),
    metrics,
    diagnostics: Object.fromEntries(
      Object.entries(delta).map(([key, value]) => [key, value.length]),
    ),
  }
}

const dataBlocked = ({ persona, viewport, moduleKey, reason }) => ({
  persona,
  viewport: viewport.key,
  moduleKey,
  status: 'data-blocked',
  reason: redactDiagnostic(reason),
})

const runDeepAudit = async ({ page, journeyDiagnostics, persona, projectName }) => {
  await assertDeployedBuild(page)
  await loginPersonaThroughUi(page, persona)
  await dismissIncidentalDialogs(page)
  const scope = persona === 'incidentCommander' ? 'all' : 'mine'
  const inspection = await discoverRows(page, 'inspection', scope)
  const reports = Object.fromEntries(
    await Promise.all(
      matrix.reportTypes.map(async ({ key }) => [key, await discoverRows(page, key, scope)]),
    ),
  )
  const recordsByInspectionType = new Map()
  for (const row of inspection.rows) {
    const key = inspectionTypeKey(row)
    const current = recordsByInspectionType.get(key)
    if (key && recordIdentity(row) && (!current || mediaScore(row) > mediaScore(current))) {
      recordsByInspectionType.set(key, row)
    }
  }
  const results = []

  for (const viewport of projectViewports(projectName)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    const inspectionTargets =
      persona === 'incidentCommander'
        ? matrix.inspectionTypes
        : matrix.inspectionTypes.filter(({ key }) => recordsByInspectionType.has(key)).slice(0, 1)
    if (inspectionTargets.length === 0) {
      results.push(
        dataBlocked({
          persona,
          viewport,
          moduleKey: 'inspection:representative',
          reason: inspection.reason || 'No submitted inspection owned by this persona',
        }),
      )
    }
    for (const type of inspectionTargets) {
      const row = recordsByInspectionType.get(type.key)
      if (!row) {
        results.push(
          dataBlocked({
            persona,
            viewport,
            moduleKey: `inspection:${type.key}`,
            reason: inspection.reason || 'No suitable production record',
          }),
        )
        continue
      }
      results.push(
        persona === 'incidentCommander'
          ? await auditInspectionRecordViaList({
              page,
              diagnostics: journeyDiagnostics,
              row,
              moduleKey: `inspection:${type.key}`,
              viewport,
              persona,
            })
          : await auditRecord({
              page,
              diagnostics: journeyDiagnostics,
              route: `/inspection/${encodeURIComponent(recordIdentity(row))}`,
              moduleKey: `inspection:${type.key}`,
              viewport,
              persona,
            }),
      )
    }

    for (const reportType of matrix.reportTypes) {
      const discovered = reports[reportType.key]
      const row = discovered.rows.find((candidate) => recordIdentity(candidate))
      if (!row) {
        results.push(
          dataBlocked({
            persona,
            viewport,
            moduleKey: `report:${reportType.key}`,
            reason: discovered.reason || 'No suitable production record',
          }),
        )
        continue
      }
      results.push(
        await auditRecord({
          page,
          diagnostics: journeyDiagnostics,
          route: `/report/${reportType.key}/${encodeURIComponent(recordIdentity(row))}`,
          moduleKey: `report:${reportType.key}`,
          viewport,
          persona,
        }),
      )
    }
  }

  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await waitForRouteSettled(page)
  expect(new URL(page.url()).pathname).not.toBe('/login')
  return results
}

test.describe('authenticated production-safe Day 4 deep-record UAT', () => {
  test.skip(!liveEnabled, 'Requires explicit live read-only UAT flags')

  for (const persona of matrix.personas) {
    test(`${persona} deep-record surfaces remain read-only`, async ({
      page,
      journeyDiagnostics,
    }, testInfo) => {
      test.setTimeout(12 * 60_000)
      const results = await runDeepAudit({
        page,
        journeyDiagnostics,
        persona,
        projectName: testInfo.project.name,
      })
      const outputPath = testInfo.outputPath('day4-audit.json')
      fs.writeFileSync(
        outputPath,
        `${JSON.stringify({ schemaVersion: 1, project: testInfo.project.name, results }, null, 2)}\n`,
        'utf8',
      )
      await testInfo.attach('day4-audit', { path: outputPath, contentType: 'application/json' })
      expect(results.filter(({ status }) => status === 'failed')).toEqual([])
    })
  }
})
