const { expect, test } = require('@playwright/test')

const {
  QAQC_BUCKET,
  MATRIX_STATUS,
  addDays,
  allowUnsafeForeignWorkflow,
  apiRequest,
  apiBaseUrl,
  attachDiagnostics,
  baseUrl,
  buildFormRecordSeed,
  buildPdfExpectedStrings,
  createLiveReport,
  createReportPayload,
  downloadInspectionPdf,
  ensureArtifactDirectories,
  expectedPdfImageCounts,
  findForeignActionableInspection,
  generateQaqcMarkdown,
  implementedInspectionTypes,
  inspectionTypeKey,
  liveSmokeEnabled,
  login,
  loginInBrowser,
  localhostMutationTarget,
  markMatrix,
  recordQaqcFinding,
  registerCleanupTask,
  reportDate,
  routeTimeoutMs,
  runCleanupTasks,
  runId,
  runMarker,
  saveScreenshot,
  slug,
  summarizeReport,
  text,
  validatePdfExpectations,
  viewportProfiles,
  waitForAppReady,
  writeJsonArtifact,
  writeTextArtifact,
} = require('./inspection-live-smoke.helpers')

const canonicalEndpoint = (method, route) => `${method.toUpperCase()} ${route}`

const buildSmokePlate = (suffix) => {
  const prefix = 'LS-'
  const suffixPart = `-${slug(suffix).toUpperCase()}`
  const runPart = slug(runId).toUpperCase()
  const availableRunLength = Math.max(1, 40 - prefix.length - suffixPart.length)
  return `${prefix}${runPart.slice(-availableRunLength)}${suffixPart}`
}

const isExpectedStatus = (result, expectedStatuses) =>
  expectedStatuses.includes(Number(result?.status || 0))

const recordApiOutcome = (
  report,
  {
    endpoint,
    result,
    expectedStatuses,
    formType = null,
    note = '',
    evidence = [],
    details = null,
    onExpectedStatus = MATRIX_STATUS.PASS,
    onUnexpectedStatus = MATRIX_STATUS.FAIL,
  },
) => {
  const status = isExpectedStatus(result, expectedStatuses) ? onExpectedStatus : onUnexpectedStatus
  markMatrix(report, {
    endpoint,
    formType,
    status,
    httpStatus: result?.status ?? 0,
    note,
    evidence,
    details,
  })
  return status === onExpectedStatus
}

const recordBrowserCheck = (report, payload) => {
  report.browser.viewportChecks.push({
    recordedAt: new Date().toISOString(),
    status: payload.status,
    viewport: payload.viewport || '',
    formType: payload.formType || null,
    route: payload.route || '',
    note: payload.note || '',
    evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
  })
}

const firstVisible = async (locator) => {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index)
    if (await candidate.isVisible().catch(() => false)) return candidate
  }
  return locator.first()
}

const clickFirstVisible = async (locator) => {
  const candidate = await firstVisible(locator)
  await candidate.click()
  return candidate
}

const closeContextWithTimeout = async (context, report, label, timeoutMs = 10_000) => {
  let timeoutId
  const result = await Promise.race([
    context
      .close()
      .then(() => ({ closed: true }))
      .catch((error) => ({ closed: false, error: error?.message || String(error) })),
    new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve({ closed: false, timedOut: true }), timeoutMs)
    }),
  ])
  clearTimeout(timeoutId)

  if (!result.closed) {
    report.notes.push(
      result.timedOut
        ? `${label} browser context did not close within ${timeoutMs}ms; artifact reporting and cleanup continued.`
        : `${label} browser context close failed: ${result.error}`,
    )
  }
}

const completeWithin = async (operation, label, timeoutMs = 15_000) => {
  let timeoutId
  const result = await Promise.race([
    Promise.resolve()
      .then(operation)
      .then((value) => ({ completed: true, value }))
      .catch((error) => ({ completed: false, error: error?.message || String(error) })),
    new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve({ completed: false, timedOut: true }), timeoutMs)
    }),
  ])
  clearTimeout(timeoutId)

  if (!result.completed) {
    throw new Error(
      result.timedOut
        ? `${label} did not complete within ${timeoutMs}ms`
        : `${label}: ${result.error}`,
    )
  }
  return result.value
}

const fillFirstVisible = async (locator, value) => {
  const candidate = await firstVisible(locator)
  await candidate.fill(value)
  return candidate
}

const inspectionTypeNamePattern = (inspectionType) => {
  if (inspectionType === 'General Inspection') return /General(?:\s+Inspection)?/i
  return new RegExp(
    String(inspectionType || '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+'),
    'i',
  )
}

const openInspectionTypeCard = async (page, inspectionType) => {
  const namePattern = inspectionTypeNamePattern(inspectionType)
  const showMoreControl = page
    .getByRole('button', { name: /show more/i })
    .or(page.getByRole('radio', { name: /show more/i }))
    .first()
  const typeControl = page
    .getByRole('radio', { name: namePattern })
    .or(page.getByRole('button', { name: namePattern }))
    .first()
  await expect(typeControl.or(showMoreControl)).toBeVisible({ timeout: routeTimeoutMs })
  if (!(await typeControl.isVisible().catch(() => false))) {
    await showMoreControl.click()
  }
  await expect(typeControl).toBeVisible({ timeout: routeTimeoutMs })
  await typeControl.click()
}

const measureButtonHeight = async (page, label) => {
  const button = await firstVisible(page.getByRole('button', { name: label }))
  const box = await button.boundingBox().catch(() => null)
  return box?.height || 0
}

const selectFirstLocationCard = async (page, heading) => {
  const section = page.locator('.inspection-form-section').filter({ hasText: heading }).first()
  await expect(section).toBeVisible({ timeout: routeTimeoutMs })
  const firstCard = section.locator('[role="radio"]').first()
  await expect(firstCard).toBeVisible({ timeout: routeTimeoutMs })
  await firstCard.click()
}

const fillRepresentativeOfflineGeneralFlow = async (page) => {
  await openInspectionTypeCard(page, 'General Inspection')
  await selectFirstLocationCard(page, 'Choose Zone')
  await selectFirstLocationCard(page, 'Choose Main Area')
  await selectFirstLocationCard(page, 'Choose Location')

  await page.getByRole('button', { name: 'Add finding', exact: true }).click()
  const findingDrawer = page.getByRole('dialog', { name: 'Add finding' })
  await expect(findingDrawer).toBeVisible({ timeout: routeTimeoutMs })
  await findingDrawer
    .getByRole('textbox', { name: 'Describe finding' })
    .fill(`${runMarker} offline queue representative finding`)
  await findingDrawer.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(findingDrawer).toBeHidden({ timeout: routeTimeoutMs })
  await expect(page.getByRole('button', { name: 'Finding 1 actions' })).toBeVisible({
    timeout: routeTimeoutMs,
  })
}

const navigateToAppRoute = async (page, route) => {
  const target = new URL(route, baseUrl)
  const current = new URL(page.url())
  const canUseSpaNavigation =
    current.origin === target.origin &&
    current.pathname !== '/login' &&
    (await page
      .locator('#root')
      .isVisible()
      .catch(() => false))

  if (
    canUseSpaNavigation &&
    current.pathname === target.pathname &&
    current.search === target.search &&
    current.hash === target.hash
  ) {
    return
  }

  if (!canUseSpaNavigation) {
    await page.goto(target.href, { waitUntil: 'domcontentloaded' })
    return
  }

  const previousRootText = await page.locator('#root').innerText()
  await page.evaluate(
    ({ href }) => {
      window.history.pushState({}, '', href)
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    { href: `${target.pathname}${target.search}${target.hash}` },
  )
  await page.waitForFunction(
    ({ previousRootText }) =>
      String(document.querySelector('#root')?.innerText || '') !== previousRootText,
    { previousRootText },
    { timeout: routeTimeoutMs },
  )
}

const takeRouteScreenshot = async ({
  page,
  report,
  testInfo,
  viewportKey,
  formType,
  route,
  name,
  expectedPath = route,
  expectedHeading = null,
  expectedText = null,
  expectedSelectedType = null,
}) => {
  await navigateToAppRoute(page, route)
  await waitForAppReady(page)
  const loginRedirected =
    new URL(page.url()).pathname === '/login' ||
    (await page
      .getByRole('button', { name: 'Sign in' })
      .isVisible()
      .catch(() => false))
  if (loginRedirected) {
    report.notes.push(`Browser session returned to login while opening ${route}; retried once.`)
    await loginInBrowser(page, report)
    await navigateToAppRoute(page, route)
    await waitForAppReady(page)
  }
  const sessionRestoreError = page
    .getByRole('alert')
    .filter({ hasText: /Unable to restore session/i })
  if (await sessionRestoreError.isVisible().catch(() => false)) {
    report.notes.push(`Browser session restore failed while opening ${route}; retried once.`)
    await clickFirstVisible(page.getByRole('button', { name: 'Retry session check' }))
    await expect(sessionRestoreError).toBeHidden({ timeout: routeTimeoutMs })
  }
  await waitForAppReady(page, expectedPath)
  if (expectedHeading) {
    await expect(page.getByRole('heading', { name: expectedHeading })).toBeVisible({
      timeout: routeTimeoutMs,
    })
  }
  if (expectedText) {
    await expect
      .poll(
        async () => {
          const visibleText = await firstVisible(page.getByText(expectedText, { exact: false }))
          if (await visibleText.isVisible().catch(() => false)) return true
          return page.locator('input, textarea').evaluateAll((elements, marker) => {
            const expected = String(marker || '').toLowerCase()
            return elements.some((element) => {
              const style = window.getComputedStyle(element)
              const rect = element.getBoundingClientRect()
              return (
                String(element.value || '')
                  .toLowerCase()
                  .includes(expected) &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                rect.width > 0 &&
                rect.height > 0
              )
            })
          }, expectedText)
        },
        { timeout: routeTimeoutMs },
      )
      .toBe(true)
  }
  if (expectedSelectedType) {
    const typeSectionMatch =
      expectedSelectedType === 'General Inspection'
        ? /General(?: Inspection)?/i
        : expectedSelectedType
    const selectedTypePattern =
      expectedSelectedType === 'General Inspection'
        ? /^General(?: Inspection)?$/i
        : new RegExp(
            `^${String(expectedSelectedType).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i',
          )
    const typeSection = page
      .locator('.inspection-form-section')
      .filter({ hasText: typeSectionMatch })
      .first()
    await expect(typeSection).toBeVisible({ timeout: routeTimeoutMs })
    await expect(typeSection.getByText(selectedTypePattern).first()).toBeVisible({
      timeout: routeTimeoutMs,
    })
    await expect(typeSection.getByText('Choose Type', { exact: true })).toBeHidden({
      timeout: routeTimeoutMs,
    })
  }
  const screenshot = await saveScreenshot(page, testInfo, report, `${viewportKey}-${name}`)
  recordBrowserCheck(report, {
    status: MATRIX_STATUS.PASS,
    viewport: viewportKey,
    formType,
    route,
    note: name,
    evidence: [screenshot],
  })
  return screenshot
}

const buildDisplayId = (inspectionType, suffix) =>
  `${runMarker}-${slug(inspectionType).toUpperCase()}-${suffix}`.slice(0, 180)

const buildReportUid = (inspectionType, suffix) =>
  `${slug(runMarker)}-${slug(inspectionType)}-${suffix}`.slice(0, 180)

test.describe.serial('inspection live smoke + QAQC', () => {
  test.skip(
    !liveSmokeEnabled,
    'Set VMECC_LIVE_SMOKE=1 to allow production-safe live smoke execution.',
  )
  test.skip(
    !localhostMutationTarget,
    'This mutation-heavy suite requires VMECC_LIVE_ALLOW_MUTATIONS=1 and loopback HTTP frontend/API origins.',
  )

  test('covers live inspection CRUD, QAQC, and artifact reporting', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(30 * 60_000)
    expect(new URL(baseUrl).hostname).toMatch(/^(?:localhost|127\.0\.0\.1|::1)$/i)
    expect(new URL(apiBaseUrl).hostname).toMatch(/^(?:localhost|127\.0\.0\.1|::1)$/i)
    ensureArtifactDirectories()

    const report = createLiveReport()
    let csrfToken = ''
    let currentUser = null
    let loginFailed = false

    const createdCatalog = {
      location: null,
      subLocation: null,
      siteZone: null,
      siteArea: null,
      siteLocation: null,
      erAuxEquipment: null,
      hydraulicEquipment: null,
      fireExtinguisher: null,
      fireTruck: null,
      scbaSection: null,
      scbaItem: null,
      workflowAttachment: null,
    }

    const formRecords = []
    const browserFailureMessages = []
    const siteZoneName = `${runMarker} Zone`
    const siteAreaName = `${runMarker} Yard`
    const siteLocationName = `${runMarker} Rack`

    const createSiteLocationNode = async ({ level, parentId = null, name }) => {
      const result = await apiRequest(request, report, 'post', '/inspection/site-locations', {
        csrfToken,
        note: `create run-scoped site ${level}`,
        data: {
          level,
          ...(parentId ? { parentId: Number(parentId) } : {}),
          name,
          description: `${runMarker} ${level}`,
        },
      })
      recordApiOutcome(report, {
        endpoint: canonicalEndpoint('post', '/inspection/site-locations'),
        result,
        expectedStatuses: [201],
        note: `create site ${level}`,
      })

      const node = result.body?.data || null
      if (node?.id) {
        const cleanupId = node.id
        registerCleanupTask(
          report,
          {
            endpoint: canonicalEndpoint('delete', '/inspection/site-locations/{locationId}'),
            objectType: `inspection-site-${level}`,
            identifier: cleanupId,
            lastKnownState: node,
          },
          async () => {
            const cleanup = await apiRequest(
              request,
              report,
              'delete',
              `/inspection/site-locations/${encodeURIComponent(String(cleanupId))}`,
              { csrfToken, note: `cleanup site ${level}` },
            )
            if (![200, 204, 404].includes(cleanup.status)) {
              throw new Error(`Site ${level} cleanup returned ${cleanup.status}`)
            }
          },
        )
      }
      return node
    }

    const desktopContext = await browser.newContext({
      baseURL: baseUrl,
      viewport: { width: viewportProfiles[0].width, height: viewportProfiles[0].height },
      acceptDownloads: true,
    })
    const desktopPage = await desktopContext.newPage()
    attachDiagnostics(desktopPage, report, 'desktop')

    try {
      const loginResult = await login(request, report)
      currentUser = loginResult.user
      csrfToken = loginResult.csrfToken
      const loginOk = recordApiOutcome(report, {
        endpoint: canonicalEndpoint('post', '/auth/login'),
        result: loginResult,
        expectedStatuses: [200],
        note: 'login and CSRF bootstrap',
      })
      if (!loginOk || !csrfToken) {
        loginFailed = true
        report.notes.push('Live smoke login failed or csrf_token missing.')
      }

      if (!loginFailed) {
        await loginInBrowser(desktopPage, report)
      }

      if (!loginFailed) {
        const session = await apiRequest(request, report, 'get', '/auth/session', {
          note: 'verify authenticated session',
        })
        csrfToken = text(session.body?.csrf_token) || csrfToken
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/auth/session'),
          result: session,
          expectedStatuses: [200],
          note: 'authenticated session',
        })
        report.preflight.push({
          at: new Date().toISOString(),
          kind: 'session',
          status:
            isExpectedStatus(session, [200]) && text(session.body?.csrf_token) ? 'pass' : 'fail',
          route: '/auth/session',
        })
      }

      if (!loginFailed) {
        await takeRouteScreenshot({
          page: desktopPage,
          report,
          testInfo,
          viewportKey: 'desktop',
          formType: null,
          route: '/inspection',
          name: 'records-shell',
          expectedHeading: /^Inspection$/i,
        })
        await takeRouteScreenshot({
          page: desktopPage,
          report,
          testInfo,
          viewportKey: 'desktop',
          formType: null,
          route: '/inspection/new',
          name: 'new-shell',
          expectedHeading: /^Inspection$/i,
        })
        await takeRouteScreenshot({
          page: desktopPage,
          report,
          testInfo,
          viewportKey: 'desktop',
          formType: null,
          route: '/inspection/workflow-settings',
          name: 'workflow-settings',
          expectedPath: '/reporting-settings/inspection',
          expectedHeading: /^Reporting Workflow$/i,
        })
      }

      if (!loginFailed) {
        const noCsrf = await apiRequest(request, report, 'post', '/inspection/fire-trucks', {
          note: 'csrf missing negative test',
          data: { plateNo: buildSmokePlate('NO-CSRF') },
        })
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/fire-trucks'),
          result: noCsrf,
          expectedStatuses: [419],
          note: 'unsafe write without csrf must return 419',
        })

        const badCsrf = await apiRequest(request, report, 'post', '/inspection/fire-trucks', {
          csrfToken: 'invalid-token',
          note: 'csrf invalid negative test',
          data: { plateNo: buildSmokePlate('BAD-CSRF') },
        })
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/fire-trucks'),
          result: badCsrf,
          expectedStatuses: [419],
          note: 'unsafe write with invalid csrf must return 419',
        })
      }

      if (!loginFailed) {
        for (const inspectionType of implementedInspectionTypes) {
          const result = await apiRequest(
            request,
            report,
            'get',
            `/inspection/location-options?inspectionType=${encodeURIComponent(
              inspectionType,
            )}&inspectionTypeKey=${encodeURIComponent(inspectionTypeKey(inspectionType))}`,
            {
              note: `list inspection locations for ${inspectionType}`,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('get', '/inspection/location-options'),
            result,
            expectedStatuses: [200],
            formType: inspectionType,
            note: `location options for ${inspectionType}`,
          })
        }

        const createLocation = await apiRequest(request, report, 'post', '/inspection/locations', {
          csrfToken,
          note: 'create run-scoped main inspection location',
          data: {
            inspectionType: 'General Inspection',
            inspectionTypeKey: inspectionTypeKey('General Inspection'),
            name: `${runMarker} Main Location`,
            description: `${runMarker} main inspection location`,
          },
        })
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/locations'),
          result: createLocation,
          expectedStatuses: [201],
          note: 'create custom main location',
        })
        createdCatalog.location = createLocation.body?.data || null

        if (createdCatalog.location?.id) {
          registerCleanupTask(
            report,
            {
              endpoint: canonicalEndpoint('delete', '/inspection/locations/{locationId}'),
              objectType: 'inspection-location',
              identifier: createdCatalog.location.id,
              lastKnownState: createdCatalog.location,
            },
            async () => {
              const cleanup = await apiRequest(
                request,
                report,
                'delete',
                `/inspection/locations/${encodeURIComponent(String(createdCatalog.location.id))}`,
                { csrfToken, note: 'cleanup main location' },
              )
              if (![200, 204, 404].includes(cleanup.status)) {
                throw new Error(`Location cleanup returned ${cleanup.status}`)
              }
            },
          )
        }

        if (createdCatalog.location?.id) {
          const duplicateLocation = await apiRequest(
            request,
            report,
            'post',
            '/inspection/locations',
            {
              csrfToken,
              note: 'duplicate inspection location validation',
              data: {
                inspectionType: 'General Inspection',
                inspectionTypeKey: inspectionTypeKey('General Inspection'),
                name: `${runMarker} Main Location`,
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/inspection/locations'),
            result: duplicateLocation,
            expectedStatuses: [422],
            note: 'duplicate main location rejected',
          })

          const updateLocation = await apiRequest(
            request,
            report,
            'patch',
            `/inspection/locations/${encodeURIComponent(String(createdCatalog.location.id))}`,
            {
              csrfToken,
              note: 'update run-scoped main location',
              data: {
                name: `${runMarker} Main Location Updated`,
                description: `${runMarker} updated main inspection location`,
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('patch', '/inspection/locations/{locationId}'),
            result: updateLocation,
            expectedStatuses: [200],
            note: 'update custom main location',
          })
          createdCatalog.location = updateLocation.body?.data || createdCatalog.location

          const createSubLocation = await apiRequest(
            request,
            report,
            'post',
            '/inspection/locations',
            {
              csrfToken,
              note: 'create run-scoped sub-location',
              data: {
                inspectionType: 'General Inspection',
                inspectionTypeKey: inspectionTypeKey('General Inspection'),
                parentId: Number(createdCatalog.location.id),
                name: `${runMarker} Sub Location`,
                description: `${runMarker} sub inspection location`,
              },
            },
          )
          if (
            recordApiOutcome(report, {
              endpoint: canonicalEndpoint('post', '/inspection/locations'),
              result: createSubLocation,
              expectedStatuses: [201],
              note: 'create custom sub-location',
            })
          ) {
            createdCatalog.subLocation =
              (createSubLocation.body?.data?.children || []).find((row) =>
                text(row?.name).includes(`${runMarker} Sub Location`),
              ) || null
          }
        }

        const erAuxEquipmentList = await apiRequest(
          request,
          report,
          'get',
          `/inspection/equipment-options?inspectionType=${encodeURIComponent(
            'Emergency Response Auxiliary Equipment',
          )}&inspectionTypeKey=${encodeURIComponent(
            inspectionTypeKey('Emergency Response Auxiliary Equipment'),
          )}&mainLocation=${encodeURIComponent('Office')}`,
          { note: 'list ER Aux equipment options' },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/inspection/equipment-options'),
          result: erAuxEquipmentList,
          expectedStatuses: [200],
          formType: 'Emergency Response Auxiliary Equipment',
          note: 'ER Aux equipment options',
        })

        const hydraulicEquipmentList = await apiRequest(
          request,
          report,
          'get',
          `/inspection/equipment-options?inspectionType=${encodeURIComponent(
            'Hydraulic Rescue Tools',
          )}&inspectionTypeKey=${encodeURIComponent(
            inspectionTypeKey('Hydraulic Rescue Tools'),
          )}&mainLocation=${encodeURIComponent('Smoke Bay')}`,
          { note: 'list hydraulic equipment options' },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/inspection/equipment-options'),
          result: hydraulicEquipmentList,
          expectedStatuses: [200],
          formType: 'Hydraulic Rescue Tools',
          note: 'Hydraulic equipment options',
        })

        const createErAuxEquipment = await apiRequest(
          request,
          report,
          'post',
          '/inspection/equipment',
          {
            csrfToken,
            note: 'create ER Aux equipment',
            data: {
              inspectionType: 'Emergency Response Auxiliary Equipment',
              inspectionTypeKey: inspectionTypeKey('Emergency Response Auxiliary Equipment'),
              mainLocation: 'Office',
              name: `${runMarker} Mobile Radio`,
              description: `${runMarker} ER Aux custom equipment`,
            },
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/equipment'),
          result: createErAuxEquipment,
          expectedStatuses: [201],
          formType: 'Emergency Response Auxiliary Equipment',
          note: 'create ER Aux custom equipment',
        })
        createdCatalog.erAuxEquipment = createErAuxEquipment.body?.data || null

        const createHydraulicEquipment = await apiRequest(
          request,
          report,
          'post',
          '/inspection/equipment',
          {
            csrfToken,
            note: 'create hydraulic equipment',
            data: {
              inspectionType: 'Hydraulic Rescue Tools',
              inspectionTypeKey: inspectionTypeKey('Hydraulic Rescue Tools'),
              mainLocation: 'Smoke Bay',
              name: `${runMarker} Hydraulic Cutter`,
              description: `${runMarker} hydraulic custom equipment`,
            },
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/equipment'),
          result: createHydraulicEquipment,
          expectedStatuses: [201],
          formType: 'Hydraulic Rescue Tools',
          note: 'create hydraulic custom equipment',
        })
        createdCatalog.hydraulicEquipment = createHydraulicEquipment.body?.data || null

        for (const payload of [
          {
            endpoint: canonicalEndpoint('post', '/inspection/equipment'),
            formType: 'Emergency Response Auxiliary Equipment',
            existing: createdCatalog.erAuxEquipment,
            duplicateData: {
              inspectionType: 'Emergency Response Auxiliary Equipment',
              inspectionTypeKey: inspectionTypeKey('Emergency Response Auxiliary Equipment'),
              mainLocation: 'Office',
              name: `${runMarker} Mobile Radio`,
            },
            updateData: {
              name: `${runMarker} Mobile Radio Updated`,
              description: `${runMarker} ER Aux updated custom equipment`,
            },
          },
          {
            endpoint: canonicalEndpoint('post', '/inspection/equipment'),
            formType: 'Hydraulic Rescue Tools',
            existing: createdCatalog.hydraulicEquipment,
            duplicateData: {
              inspectionType: 'Hydraulic Rescue Tools',
              inspectionTypeKey: inspectionTypeKey('Hydraulic Rescue Tools'),
              mainLocation: 'Smoke Bay',
              name: `${runMarker} Hydraulic Cutter`,
            },
            updateData: {
              name: `${runMarker} Hydraulic Cutter Updated`,
              description: `${runMarker} hydraulic updated custom equipment`,
            },
          },
        ]) {
          if (!payload.existing?.id) continue

          const duplicateEquipment = await apiRequest(
            request,
            report,
            'post',
            '/inspection/equipment',
            {
              csrfToken,
              note: `duplicate equipment validation for ${payload.formType}`,
              data: payload.duplicateData,
            },
          )
          recordApiOutcome(report, {
            endpoint: payload.endpoint,
            result: duplicateEquipment,
            expectedStatuses: [422],
            formType: payload.formType,
            note: `duplicate ${payload.formType} equipment rejected`,
          })

          const updateEquipment = await apiRequest(
            request,
            report,
            'patch',
            `/inspection/equipment/${encodeURIComponent(String(payload.existing.id))}`,
            {
              csrfToken,
              note: `update ${payload.formType} equipment`,
              data: payload.updateData,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('patch', '/inspection/equipment/{equipmentId}'),
            result: updateEquipment,
            expectedStatuses: [200],
            formType: payload.formType,
            note: `update ${payload.formType} equipment`,
          })

          const updatedRow = updateEquipment.body?.data || payload.existing
          if (payload.formType === 'Emergency Response Auxiliary Equipment') {
            createdCatalog.erAuxEquipment = updatedRow
          } else {
            createdCatalog.hydraulicEquipment = updatedRow
          }

          registerCleanupTask(
            report,
            {
              endpoint: canonicalEndpoint('delete', '/inspection/equipment/{equipmentId}'),
              objectType: 'inspection-equipment',
              identifier: updatedRow.id,
              formType: payload.formType,
              lastKnownState: updatedRow,
            },
            async () => {
              const cleanup = await apiRequest(
                request,
                report,
                'delete',
                `/inspection/equipment/${encodeURIComponent(String(updatedRow.id))}`,
                { csrfToken, note: `cleanup ${payload.formType} equipment` },
              )
              if (![200, 204, 404].includes(cleanup.status)) {
                throw new Error(`Equipment cleanup returned ${cleanup.status}`)
              }
            },
          )
        }

        const siteLocationList = await apiRequest(
          request,
          report,
          'get',
          '/inspection/site-locations',
          { note: 'list canonical site-location hierarchy' },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/inspection/site-locations'),
          result: siteLocationList,
          expectedStatuses: [200],
          note: 'list canonical site-location hierarchy',
        })

        createdCatalog.siteZone = await createSiteLocationNode({
          level: 'zone',
          name: siteZoneName,
        })
        if (createdCatalog.siteZone?.id) {
          createdCatalog.siteArea = await createSiteLocationNode({
            level: 'area',
            parentId: createdCatalog.siteZone.id,
            name: siteAreaName,
          })
        }
        if (createdCatalog.siteArea?.id) {
          createdCatalog.siteLocation = await createSiteLocationNode({
            level: 'location',
            parentId: createdCatalog.siteArea.id,
            name: siteLocationName,
          })
        }

        if (createdCatalog.siteLocation?.id) {
          const updateSiteLocation = await apiRequest(
            request,
            report,
            'patch',
            `/inspection/site-locations/${encodeURIComponent(
              String(createdCatalog.siteLocation.id),
            )}`,
            {
              csrfToken,
              note: 'update run-scoped site location metadata',
              data: {
                name: siteLocationName,
                description: `${runMarker} location updated`,
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('patch', '/inspection/site-locations/{locationId}'),
            result: updateSiteLocation,
            expectedStatuses: [200],
            note: 'update site location metadata',
          })
          createdCatalog.siteLocation = updateSiteLocation.body?.data || createdCatalog.siteLocation

          const duplicateSiteLocation = await apiRequest(
            request,
            report,
            'post',
            '/inspection/site-locations',
            {
              csrfToken,
              note: 'duplicate site location integrity probe',
              data: {
                level: 'location',
                parentId: Number(createdCatalog.siteArea.id),
                name: siteLocationName,
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/inspection/site-locations'),
            result: duplicateSiteLocation,
            expectedStatuses: [409],
            note: 'duplicate site location rejected',
          })
        }

        const fireExtinguisherList = await apiRequest(
          request,
          report,
          'get',
          `/inspection/fire-extinguishers?mainLocation=${encodeURIComponent(siteAreaName)}&subLocation=${encodeURIComponent(
            siteLocationName,
          )}`,
          {
            note: 'list fire extinguisher catalog',
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/inspection/fire-extinguishers'),
          result: fireExtinguisherList,
          expectedStatuses: [200],
          formType: 'Fire Extinguisher',
          note: 'list fire extinguisher catalog',
        })

        const createFireExtinguisher = await apiRequest(
          request,
          report,
          'post',
          '/inspection/fire-extinguishers',
          {
            csrfToken,
            note: 'create fire extinguisher catalog row',
            data: {
              zone: siteZoneName,
              zoneId: Number(createdCatalog.siteZone?.id),
              mainLocation: siteAreaName,
              mainLocationId: Number(createdCatalog.siteArea?.id),
              subLocation: siteLocationName,
              subLocationId: Number(createdCatalog.siteLocation?.id),
              idLocNo: `${runMarker}-FE-LOC`,
              barcodeNo: `${runMarker}-FE-BC`,
              feType: 'CO2',
              certificationValidity: addDays(reportDate, 365),
            },
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/fire-extinguishers'),
          result: createFireExtinguisher,
          expectedStatuses: [201],
          formType: 'Fire Extinguisher',
          note: 'create fire extinguisher custom row',
        })
        createdCatalog.fireExtinguisher = createFireExtinguisher.body?.data || null

        if (createdCatalog.fireExtinguisher?.id) {
          const duplicateFireExtinguisher = await apiRequest(
            request,
            report,
            'post',
            '/inspection/fire-extinguishers',
            {
              csrfToken,
              note: 'duplicate fire extinguisher integrity probe',
              data: {
                zone: siteZoneName,
                zoneId: Number(createdCatalog.siteZone?.id),
                mainLocation: siteAreaName,
                mainLocationId: Number(createdCatalog.siteArea?.id),
                subLocation: siteLocationName,
                subLocationId: Number(createdCatalog.siteLocation?.id),
                idLocNo: `${runMarker}-FE-LOC`,
                barcodeNo: `${runMarker}-FE-BC`,
                feType: 'CO2',
                certificationValidity: addDays(reportDate, 365),
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/inspection/fire-extinguishers'),
            result: duplicateFireExtinguisher,
            expectedStatuses: [409],
            formType: 'Fire Extinguisher',
            note: 'duplicate fire extinguisher locator rejected',
          })
          if (duplicateFireExtinguisher.status === 201) {
            const duplicateFireExtinguisherId = duplicateFireExtinguisher.body?.data?.id
            if (duplicateFireExtinguisherId) {
              registerCleanupTask(
                report,
                {
                  endpoint: canonicalEndpoint(
                    'delete',
                    '/inspection/fire-extinguishers/{extinguisherId}',
                  ),
                  objectType: 'inspection-fire-extinguisher-duplicate-probe',
                  identifier: duplicateFireExtinguisherId,
                  formType: 'Fire Extinguisher',
                  lastKnownState: duplicateFireExtinguisher.body?.data,
                },
                async () => {
                  const cleanup = await apiRequest(
                    request,
                    report,
                    'delete',
                    `/inspection/fire-extinguishers/${encodeURIComponent(
                      String(duplicateFireExtinguisherId),
                    )}`,
                    { csrfToken, note: 'cleanup duplicate fire extinguisher probe row' },
                  )
                  if (![200, 204, 404].includes(cleanup.status)) {
                    throw new Error(
                      `Duplicate fire extinguisher cleanup returned ${cleanup.status}`,
                    )
                  }
                },
              )
            }
            recordQaqcFinding(report, {
              bucket: QAQC_BUCKET.REPRODUCED_LIVE,
              category: 'Data integrity',
              title: 'Fire extinguisher catalog accepts duplicate custom rows',
              detail:
                'Creating the same run-scoped fire extinguisher row twice returned 201 instead of a validation error.',
            })
          }

          const updateFireExtinguisher = await apiRequest(
            request,
            report,
            'patch',
            `/inspection/fire-extinguishers/${encodeURIComponent(
              String(createdCatalog.fireExtinguisher.id),
            )}`,
            {
              csrfToken,
              note: 'update fire extinguisher row',
              data: {
                zone: siteZoneName,
                zoneId: Number(createdCatalog.siteZone?.id),
                mainLocation: siteAreaName,
                mainLocationId: Number(createdCatalog.siteArea?.id),
                subLocation: siteLocationName,
                subLocationId: Number(createdCatalog.siteLocation?.id),
                idLocNo: `${runMarker}-FE-LOC-UPD`,
                barcodeNo: `${runMarker}-FE-BC-UPD`,
                feType: 'CO2',
                certificationValidity: addDays(reportDate, 365),
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('patch', '/inspection/fire-extinguishers/{extinguisherId}'),
            result: updateFireExtinguisher,
            expectedStatuses: [200],
            formType: 'Fire Extinguisher',
            note: 'update fire extinguisher custom row',
          })
          createdCatalog.fireExtinguisher =
            updateFireExtinguisher.body?.data || createdCatalog.fireExtinguisher
          const fireExtinguisherCleanupId = createdCatalog.fireExtinguisher.id
          const fireExtinguisherCleanupState = createdCatalog.fireExtinguisher

          registerCleanupTask(
            report,
            {
              endpoint: canonicalEndpoint(
                'delete',
                '/inspection/fire-extinguishers/{extinguisherId}',
              ),
              objectType: 'inspection-fire-extinguisher',
              identifier: fireExtinguisherCleanupId,
              formType: 'Fire Extinguisher',
              lastKnownState: fireExtinguisherCleanupState,
            },
            async () => {
              const cleanup = await apiRequest(
                request,
                report,
                'delete',
                `/inspection/fire-extinguishers/${encodeURIComponent(
                  String(fireExtinguisherCleanupId),
                )}`,
                { csrfToken, note: 'cleanup fire extinguisher row' },
              )
              if (![200, 204, 404].includes(cleanup.status)) {
                throw new Error(`Fire extinguisher cleanup returned ${cleanup.status}`)
              }
            },
          )
        }

        const fireTruckList = await apiRequest(request, report, 'get', '/inspection/fire-trucks', {
          note: 'list fire trucks',
        })
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/inspection/fire-trucks'),
          result: fireTruckList,
          expectedStatuses: [200],
          formType: 'Fire Truck Daily Readiness',
          note: 'list fire trucks',
        })

        const createFireTruck = await apiRequest(
          request,
          report,
          'post',
          '/inspection/fire-trucks',
          {
            csrfToken,
            note: 'valid csrf fire truck create',
            data: {
              plateNo: buildSmokePlate('TRK'),
              name: `${runMarker} fire truck`,
              roadTaxExpiry: addDays(reportDate, 365),
              insuranceExpiry: addDays(reportDate, 365),
              puspakomExpiry: addDays(reportDate, 365),
            },
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/fire-trucks'),
          result: createFireTruck,
          expectedStatuses: [201],
          formType: 'Fire Truck Daily Readiness',
          note: 'valid csrf fire truck create succeeds',
        })
        createdCatalog.fireTruck = createFireTruck.body?.data || null

        if (createdCatalog.fireTruck?.id) {
          const duplicateFireTruck = await apiRequest(
            request,
            report,
            'post',
            '/inspection/fire-trucks',
            {
              csrfToken,
              note: 'duplicate fire truck validation',
              data: {
                plateNo: createdCatalog.fireTruck.plateNo,
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/inspection/fire-trucks'),
            result: duplicateFireTruck,
            expectedStatuses: [422],
            formType: 'Fire Truck Daily Readiness',
            note: 'duplicate fire truck rejected',
          })

          const updatedPlateNo = buildSmokePlate('TRK-UPD')
          const updateFireTruck = await apiRequest(
            request,
            report,
            'patch',
            `/inspection/fire-trucks/${encodeURIComponent(String(createdCatalog.fireTruck.id))}`,
            {
              csrfToken,
              note: 'update fire truck row',
              data: {
                plateNo: updatedPlateNo,
                name: `${runMarker} fire truck updated`,
                roadTaxExpiry: addDays(reportDate, 365),
                insuranceExpiry: addDays(reportDate, 365),
                puspakomExpiry: addDays(reportDate, 365),
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('patch', '/inspection/fire-trucks/{truckId}'),
            result: updateFireTruck,
            expectedStatuses: [200],
            formType: 'Fire Truck Daily Readiness',
            note: 'update fire truck custom row',
          })
          createdCatalog.fireTruck = updateFireTruck.body?.data || createdCatalog.fireTruck

          registerCleanupTask(
            report,
            {
              endpoint: canonicalEndpoint('delete', '/inspection/fire-trucks/{truckId}'),
              objectType: 'inspection-fire-truck',
              identifier: createdCatalog.fireTruck.id,
              formType: 'Fire Truck Daily Readiness',
              lastKnownState: createdCatalog.fireTruck,
            },
            async () => {
              const cleanup = await apiRequest(
                request,
                report,
                'delete',
                `/inspection/fire-trucks/${encodeURIComponent(String(createdCatalog.fireTruck.id))}`,
                { csrfToken, note: 'cleanup fire truck row' },
              )
              if (![200, 204, 404].includes(cleanup.status)) {
                throw new Error(`Fire truck cleanup returned ${cleanup.status}`)
              }
            },
          )
        }

        const listScbaCatalog = await apiRequest(
          request,
          report,
          'get',
          `/inspection/scba-catalog?mainLocation=${encodeURIComponent('FRT')}`,
          { note: 'list SCBA catalog' },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/inspection/scba-catalog'),
          result: listScbaCatalog,
          expectedStatuses: [200],
          formType: 'SCBA',
          note: 'list SCBA catalog',
        })

        const createScbaSection = await apiRequest(
          request,
          report,
          'post',
          '/inspection/scba-catalog/sections',
          {
            csrfToken,
            note: 'create SCBA section',
            data: {
              title: `${runMarker} Regulator`,
              shortLabel: 'Regulator',
              fields: [{ key: 'purgeValve', label: 'Purge Valve', kind: 'status' }],
            },
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/inspection/scba-catalog/sections'),
          result: createScbaSection,
          expectedStatuses: [201],
          formType: 'SCBA',
          note: 'create SCBA custom section',
        })
        createdCatalog.scbaSection = createScbaSection.body?.data || null

        if (createdCatalog.scbaSection?.catalogSectionId || createdCatalog.scbaSection?.id) {
          const sectionId =
            createdCatalog.scbaSection.catalogSectionId || createdCatalog.scbaSection.id
          const updateScbaSection = await apiRequest(
            request,
            report,
            'patch',
            `/inspection/scba-catalog/sections/${encodeURIComponent(String(sectionId))}`,
            {
              csrfToken,
              note: 'update SCBA section',
              data: {
                title: `${runMarker} Regulator Updated`,
                shortLabel: 'Regulator',
                fields: [{ key: 'purgeValve', label: 'Purge Valve', kind: 'status' }],
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('patch', '/inspection/scba-catalog/sections/{sectionId}'),
            result: updateScbaSection,
            expectedStatuses: [200],
            formType: 'SCBA',
            note: 'update SCBA custom section',
          })
          createdCatalog.scbaSection = updateScbaSection.body?.data || createdCatalog.scbaSection

          const createScbaItem = await apiRequest(
            request,
            report,
            'post',
            `/inspection/scba-catalog/sections/${encodeURIComponent(String(sectionId))}/items`,
            {
              csrfToken,
              note: 'create SCBA item',
              data: {
                mainLocation: 'FRT',
                brand: 'MSA',
                serialNo: `${runMarker}-R-01`,
                displayName: `${runMarker} Regulator`,
                equipmentDescription: `${runMarker} SCBA regulator item`,
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint(
              'post',
              '/inspection/scba-catalog/sections/{sectionId}/items',
            ),
            result: createScbaItem,
            expectedStatuses: [201],
            formType: 'SCBA',
            note: 'create SCBA custom item',
          })
          createdCatalog.scbaItem = createScbaItem.body?.data || null

          if (createdCatalog.scbaItem?.catalogItemId || createdCatalog.scbaItem?.id) {
            const itemId = createdCatalog.scbaItem.catalogItemId || createdCatalog.scbaItem.id
            const updateScbaItem = await apiRequest(
              request,
              report,
              'patch',
              `/inspection/scba-catalog/items/${encodeURIComponent(String(itemId))}`,
              {
                csrfToken,
                note: 'update SCBA item',
                data: {
                  mainLocation: 'FRT',
                  brand: 'MSA',
                  serialNo: `${runMarker}-R-01-UPD`,
                  displayName: `${runMarker} Regulator Updated`,
                  equipmentDescription: `${runMarker} updated SCBA regulator item`,
                },
              },
            )
            recordApiOutcome(report, {
              endpoint: canonicalEndpoint('patch', '/inspection/scba-catalog/items/{itemId}'),
              result: updateScbaItem,
              expectedStatuses: [200],
              formType: 'SCBA',
              note: 'update SCBA custom item',
            })
            createdCatalog.scbaItem = updateScbaItem.body?.data || createdCatalog.scbaItem

            registerCleanupTask(
              report,
              {
                endpoint: canonicalEndpoint('delete', '/inspection/scba-catalog/items/{itemId}'),
                objectType: 'inspection-scba-item',
                identifier: itemId,
                formType: 'SCBA',
                lastKnownState: createdCatalog.scbaItem,
              },
              async () => {
                const cleanup = await apiRequest(
                  request,
                  report,
                  'delete',
                  `/inspection/scba-catalog/items/${encodeURIComponent(String(itemId))}`,
                  { csrfToken, note: 'cleanup SCBA item' },
                )
                if (![200, 204, 404].includes(cleanup.status)) {
                  throw new Error(`SCBA item cleanup returned ${cleanup.status}`)
                }
              },
            )
          }

          registerCleanupTask(
            report,
            {
              endpoint: canonicalEndpoint(
                'delete',
                '/inspection/scba-catalog/sections/{sectionId}',
              ),
              objectType: 'inspection-scba-section',
              identifier: sectionId,
              formType: 'SCBA',
              lastKnownState: createdCatalog.scbaSection,
            },
            async () => {
              const cleanup = await apiRequest(
                request,
                report,
                'delete',
                `/inspection/scba-catalog/sections/${encodeURIComponent(String(sectionId))}`,
                { csrfToken, note: 'cleanup SCBA section' },
              )
              if (![200, 204, 404].includes(cleanup.status)) {
                throw new Error(`SCBA section cleanup returned ${cleanup.status}`)
              }
            },
          )
        }

        const rulesSnapshot = await apiRequest(
          request,
          report,
          'get',
          '/settings/inspection-workflow-rules',
          { note: 'workflow rules snapshot' },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/settings/inspection-workflow-rules'),
          result: rulesSnapshot,
          expectedStatuses: [200],
          note: 'inspection workflow rules snapshot',
        })

        if (rulesSnapshot.status === 200 && rulesSnapshot.body?.data) {
          const replayRules = await apiRequest(
            request,
            report,
            'post',
            '/settings/inspection-workflow-rules',
            {
              csrfToken,
              note: 'replay workflow rules unchanged',
              data: rulesSnapshot.body.data,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/settings/inspection-workflow-rules'),
            result: replayRules,
            expectedStatuses: [200],
            note: 'replay workflow rules unchanged',
          })

          const rulesVerify = await apiRequest(
            request,
            report,
            'get',
            '/settings/inspection-workflow-rules',
            { note: 'verify workflow rules unchanged' },
          )
          if (
            recordApiOutcome(report, {
              endpoint: canonicalEndpoint('get', '/settings/inspection-workflow-rules'),
              result: rulesVerify,
              expectedStatuses: [200],
              note: 'verify workflow rules unchanged',
            })
          ) {
            const before = JSON.stringify(rulesSnapshot.body?.data || {})
            const after = JSON.stringify(rulesVerify.body?.data || {})
            if (before !== after) {
              recordQaqcFinding(report, {
                bucket: QAQC_BUCKET.REPRODUCED_LIVE,
                category: 'Workflow consistency',
                title: 'Inspection workflow rules changed after replaying the same payload',
                detail:
                  'GET snapshot -> POST same payload -> GET returned a different workflow rule object.',
              })
            }
          }
        }

        const attachmentUpload = await apiRequest(
          request,
          report,
          'post',
          '/workflow/attachments',
          {
            csrfToken,
            note: 'upload workflow attachment',
            multipart: {
              file: {
                name: `${slug(runMarker)}.txt`,
                mimeType: 'text/plain',
                buffer: Buffer.from(`${runMarker} workflow attachment`, 'utf8'),
              },
            },
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('post', '/workflow/attachments'),
          result: attachmentUpload,
          expectedStatuses: [201],
          note: 'upload workflow attachment',
        })
        createdCatalog.workflowAttachment = attachmentUpload.body?.data || null

        if (createdCatalog.workflowAttachment?.id) {
          const attachmentId = createdCatalog.workflowAttachment.id
          const attachmentDownloadResponse = await request.get(
            `${apiBaseUrl.replace(/\/$/, '')}/workflow/attachments/${encodeURIComponent(
              String(attachmentId),
            )}`,
            {
              headers: {
                Accept: '*/*',
              },
            },
          )
          markMatrix(report, {
            endpoint: canonicalEndpoint('get', '/workflow/attachments/{id}'),
            status:
              attachmentDownloadResponse.status() === 200 ? MATRIX_STATUS.PASS : MATRIX_STATUS.FAIL,
            httpStatus: attachmentDownloadResponse.status(),
            note: 'download workflow attachment',
          })
          if (attachmentDownloadResponse.status() === 200) {
            const buffer = await attachmentDownloadResponse.body()
            if (!buffer.toString('utf8').includes(runMarker)) {
              recordQaqcFinding(report, {
                bucket: QAQC_BUCKET.REPRODUCED_LIVE,
                category: 'Data integrity',
                title: 'Workflow attachment download content does not match the uploaded probe',
                detail: 'Downloaded attachment body did not contain the live smoke run marker.',
              })
            }
          }

          const attachmentDelete = await apiRequest(
            request,
            report,
            'delete',
            `/workflow/attachments/${encodeURIComponent(String(attachmentId))}`,
            {
              csrfToken,
              note: 'delete workflow attachment',
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('delete', '/workflow/attachments/{id}'),
            result: attachmentDelete,
            expectedStatuses: [204],
            note: 'delete workflow attachment',
          })
          createdCatalog.workflowAttachment = null
        }

        const clearDraftBeforeForms = await apiRequest(
          request,
          report,
          'delete',
          '/reports/draft?report_type=inspection',
          {
            csrfToken,
            note: 'clear stale inspection draft before per-form flow',
          },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('delete', '/reports/draft?report_type=inspection'),
          result: clearDraftBeforeForms,
          expectedStatuses: [200],
          note: 'clear stale inspection draft before per-form flow',
        })

        const formContext = {
          locationName:
            text(createdCatalog.location?.name || createdCatalog.location?.title) ||
            'Smoke General Area',
          erAuxLocationName: 'Office',
          erAuxEquipmentName:
            text(createdCatalog.erAuxEquipment?.name || createdCatalog.erAuxEquipment?.title) ||
            `${runMarker} Mobile Radio Updated`,
          hydraulicLocationName: 'Smoke Bay',
          hydraulicEquipmentName:
            text(
              createdCatalog.hydraulicEquipment?.name || createdCatalog.hydraulicEquipment?.title,
            ) || `${runMarker} Hydraulic Cutter Updated`,
          fireExtinguisherId:
            createdCatalog.fireExtinguisher?.catalogId ||
            createdCatalog.fireExtinguisher?.id ||
            null,
          fireExtinguisherZone: text(createdCatalog.fireExtinguisher?.zone) || siteZoneName,
          fireExtinguisherMainLocation:
            text(createdCatalog.fireExtinguisher?.mainLocation) || siteAreaName,
          fireExtinguisherSubLocation:
            text(createdCatalog.fireExtinguisher?.subLocation) || siteLocationName,
          fireTruckId: createdCatalog.fireTruck?.truckId || createdCatalog.fireTruck?.id || '',
          fireTruckPlateNo: createdCatalog.fireTruck?.plateNo || '',
          scbaLocationName: 'FRT',
          scbaCustomSection: createdCatalog.scbaSection,
          scbaCustomItem: createdCatalog.scbaItem,
        }

        for (const inspectionType of implementedInspectionTypes) {
          const shortSuffix = `${slug(inspectionType)}-${String(Date.now()).slice(-6)}`
          const reportUid = buildReportUid(inspectionType, shortSuffix)
          const displayId = buildDisplayId(inspectionType, shortSuffix)
          const { payload, checklistLabel } = buildFormRecordSeed(
            inspectionType,
            shortSuffix,
            formContext,
          )
          const submission = createReportPayload({
            inspectionType,
            suffix: shortSuffix,
            context: formContext,
            reportUid,
            displayId,
          })

          const draftCreate = await apiRequest(request, report, 'post', '/reports/draft', {
            csrfToken,
            note: `create inspection draft for ${inspectionType}`,
            data: {
              report_type: 'inspection',
              title: `${runMarker} ${inspectionType} draft`,
              origin_mode: 'new',
              payload,
            },
          })
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/reports/draft'),
            result: draftCreate,
            expectedStatuses: [200, 201],
            formType: inspectionType,
            note: `save draft for ${inspectionType}`,
          })
          const draftId = text(draftCreate.body?.data?.draft_id)

          const singularDraft = await apiRequest(
            request,
            report,
            'get',
            '/reports/draft?report_type=inspection',
            {
              note: `load singular inspection draft for ${inspectionType}`,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('get', '/reports/draft?report_type=inspection'),
            result: singularDraft,
            expectedStatuses: [200],
            formType: inspectionType,
            note: `load singular draft for ${inspectionType}`,
          })

          const draftById = await apiRequest(
            request,
            report,
            'get',
            `/reports/drafts/${encodeURIComponent(draftId || 'missing')}`,
            {
              note: `load inspection draft by id for ${inspectionType}`,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('get', '/reports/drafts/{draftId}'),
            result: draftById,
            expectedStatuses: draftId ? [200] : [404],
            formType: inspectionType,
            note: `load draft by id for ${inspectionType}`,
          })

          const deleteDraftById = await apiRequest(
            request,
            report,
            'delete',
            `/reports/drafts/${encodeURIComponent(draftId || 'missing')}`,
            {
              csrfToken,
              note: `delete inspection draft by id for ${inspectionType}`,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('delete', '/reports/drafts/{draftId}'),
            result: deleteDraftById,
            expectedStatuses: draftId ? [200] : [404],
            formType: inspectionType,
            note: `delete draft by id for ${inspectionType}`,
          })

          const createReport = await apiRequest(request, report, 'post', '/reports', {
            csrfToken,
            note: `create inspection report for ${inspectionType}`,
            data: submission,
          })
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/reports'),
            result: createReport,
            expectedStatuses: [201],
            formType: inspectionType,
            note: `create submitted report for ${inspectionType}`,
          })

          const createdData = createReport.body?.data || {}
          if (text(createdData.id)) {
            registerCleanupTask(
              report,
              {
                endpoint: canonicalEndpoint('delete', '/reports/{uid}'),
                objectType: 'inspection-report',
                identifier: createdData.id,
                formType: inspectionType,
                lastKnownState: createdData,
              },
              async () => {
                const cleanup = await apiRequest(
                  request,
                  report,
                  'delete',
                  `/reports/${encodeURIComponent(String(createdData.id))}`,
                  { csrfToken, note: `cleanup report ${inspectionType}` },
                )
                if (![200, 204, 404].includes(cleanup.status)) {
                  throw new Error(`Report cleanup returned ${cleanup.status}`)
                }
              },
            )
          }

          const showReport = await apiRequest(
            request,
            report,
            'get',
            `/reports/${encodeURIComponent(reportUid)}`,
            {
              note: `show inspection report for ${inspectionType}`,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('get', '/reports/{uid}'),
            result: showReport,
            expectedStatuses: [200],
            formType: inspectionType,
            note: `show report for ${inspectionType}`,
          })

          const updatedPayload = {
            ...submission.payload,
            remarks: `${submission.payload.remarks} updated`,
            smokeUpdated: true,
          }

          const updateReport = await apiRequest(
            request,
            report,
            'put',
            `/reports/${encodeURIComponent(reportUid)}`,
            {
              csrfToken,
              note: `update inspection report for ${inspectionType}`,
              data: {
                payload: updatedPayload,
                version: createdData.version,
                status: 'Submitted',
                remarks: `${runMarker} update ${inspectionType}`,
              },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('put', '/reports/{uid}'),
            result: updateReport,
            expectedStatuses: [200],
            formType: inspectionType,
            note: `update report for ${inspectionType}`,
          })

          const staleUpdate = await apiRequest(
            request,
            report,
            'put',
            `/reports/${encodeURIComponent(reportUid)}`,
            {
              csrfToken,
              note: `stale version conflict for ${inspectionType}`,
              data: {
                payload: updatedPayload,
                version: createdData.version,
                status: 'Submitted',
              },
            },
          )
          if (staleUpdate.status === 409) {
            markMatrix(report, {
              endpoint: canonicalEndpoint('put', '/reports/{uid}'),
              formType: inspectionType,
              status: MATRIX_STATUS.PASS,
              httpStatus: staleUpdate.status,
              note: `stale version conflict protected ${inspectionType}`,
            })
          } else {
            markMatrix(report, {
              endpoint: canonicalEndpoint('put', '/reports/{uid}'),
              formType: inspectionType,
              status: MATRIX_STATUS.FAIL,
              httpStatus: staleUpdate.status,
              note: `stale version conflict failed for ${inspectionType}`,
            })
          }

          const latestVersion = updateReport.body?.data?.version || createdData.version || 1
          const pdf = await downloadInspectionPdf(
            request,
            report,
            csrfToken,
            reportUid,
            latestVersion,
            {
              formType: inspectionType,
              minImageCount: expectedPdfImageCounts[inspectionType] || 0,
              expectedStatus: 200,
            },
          )
          const pdfExpectation = validatePdfExpectations({
            inspectionType,
            pdfText: pdf.pdfText,
            expectedStrings: buildPdfExpectedStrings(inspectionType, updatedPayload, formContext),
            embeddedImageCount: pdf.embeddedImageCount,
            minImageCount: expectedPdfImageCounts[inspectionType] || 0,
          })
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/reports/inspection/pdf'),
            result: pdf,
            expectedStatuses: [200],
            formType: inspectionType,
            note: pdfExpectation.ok
              ? `inspection pdf relevance for ${inspectionType}`
              : `inspection pdf relevance failed for ${inspectionType}`,
            evidence: [
              pdf.pdfPath,
              ...(Array.isArray(pdf.renderedPagePaths) ? pdf.renderedPagePaths : []),
              pdf.textPath,
            ].filter(Boolean),
            onExpectedStatus: pdfExpectation.ok ? MATRIX_STATUS.PASS : MATRIX_STATUS.FAIL,
            details: pdfExpectation.ok
              ? null
              : {
                  missingStrings: pdfExpectation.missingStrings,
                  missingImages: pdfExpectation.missingImages,
                },
          })

          if (!pdfExpectation.ok) {
            recordQaqcFinding(report, {
              bucket: QAQC_BUCKET.REPRODUCED_LIVE,
              category: 'PDF/template relevance',
              title: `${inspectionType} PDF is missing expected form-specific content`,
              detail: `Missing text markers: ${pdfExpectation.missingStrings.join(', ') || 'none'}; missing images: ${pdfExpectation.missingImages}.`,
              evidence: [pdf.pdfPath, pdf.textPath].filter(Boolean),
            })
          }

          const checklistSummary = await apiRequest(
            request,
            report,
            'get',
            `/reports/inspection/checklist-summary?inspection_type=${encodeURIComponent(
              inspectionType,
            )}&checklist_item=${encodeURIComponent(checklistLabel)}`,
            {
              note: `checklist summary for ${inspectionType}`,
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('get', '/reports/inspection/checklist-summary'),
            result: checklistSummary,
            expectedStatuses: [200],
            formType: inspectionType,
            note: `checklist summary for ${inspectionType}`,
          })

          formRecords.push({
            inspectionType,
            reportUid,
            displayId,
            checklistLabel,
            version: latestVersion,
            payload: updatedPayload,
            pdf,
          })

          try {
            await navigateToAppRoute(desktopPage, '/reporting-settings/inspection')
            await waitForAppReady(desktopPage, '/reporting-settings/inspection')
            await expect(
              desktopPage.getByRole('heading', { name: /^Reporting Workflow$/i }),
            ).toBeVisible({ timeout: routeTimeoutMs })
            await takeRouteScreenshot({
              page: desktopPage,
              report,
              testInfo,
              viewportKey: 'desktop',
              formType: inspectionType,
              route: `/inspection/${encodeURIComponent(reportUid)}`,
              name: `${slug(inspectionType)}-detail`,
              expectedText: displayId,
            })
            await takeRouteScreenshot({
              page: desktopPage,
              report,
              testInfo,
              viewportKey: 'desktop',
              formType: inspectionType,
              route: `/inspection/${encodeURIComponent(reportUid)}/edit`,
              name: `${slug(inspectionType)}-edit`,
              expectedSelectedType: inspectionType,
            })
          } catch (error) {
            browserFailureMessages.push(
              `Desktop detail/edit parity failed for ${inspectionType}: ${error?.message || String(error)}`,
            )
            recordBrowserCheck(report, {
              status: MATRIX_STATUS.FAIL,
              viewport: 'desktop',
              formType: inspectionType,
              route: `/inspection/${encodeURIComponent(reportUid)}`,
              note: error?.message || String(error),
            })
          }
        }

        const myReports = await apiRequest(
          request,
          report,
          'get',
          '/reports?reportType=inspection',
          { note: 'list mine inspection reports' },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/reports?reportType=inspection'),
          result: myReports,
          expectedStatuses: [200],
          note: 'list mine inspection reports',
        })

        const allReports = await apiRequest(
          request,
          report,
          'get',
          '/reports?reportType=inspection&scope=all',
          { note: 'list all inspection reports' },
        )
        recordApiOutcome(report, {
          endpoint: canonicalEndpoint('get', '/reports?reportType=inspection&scope=all'),
          result: allReports,
          expectedStatuses: [200],
          note: 'list all inspection reports',
        })

        const firstRecord = formRecords[0] || null
        if (firstRecord) {
          await desktopPage.goto('/inspection', { waitUntil: 'domcontentloaded' })
          await waitForAppReady(desktopPage, '/inspection')
          await fillFirstVisible(
            desktopPage.getByRole('textbox', { name: 'Search records' }),
            firstRecord.displayId,
          )
          const row = desktopPage
            .locator('tbody tr')
            .filter({ hasText: firstRecord.displayId })
            .first()
          await expect(row).toBeVisible({ timeout: routeTimeoutMs })
          await row.focus()
          await desktopPage.keyboard.press('Enter')
          await desktopPage.waitForURL(
            new RegExp(
              `/inspection/${encodeURIComponent(firstRecord.reportUid).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:[/?#]|$)`,
            ),
            { timeout: routeTimeoutMs },
          )
          recordQaqcFinding(report, {
            bucket: QAQC_BUCKET.KNOWN_NOT_REPRODUCED,
            category: 'Accessibility/mobile ergonomics',
            title: 'Desktop records keyboard access is working for the smoke account',
            detail: `Focused row ${firstRecord.displayId} opened detail with Enter on the live site.`,
          })
        }

        const actionableForeign = findForeignActionableInspection(
          allReports.body?.data || [],
          currentUser?.id,
        )
        if (!actionableForeign) {
          markMatrix(report, {
            endpoint: canonicalEndpoint('post', '/reports/{uid}/reject'),
            status: MATRIX_STATUS.INCONCLUSIVE,
            httpStatus: 0,
            note: 'positive reject path skipped because no safe actionable foreign-owned inspection was available',
          })
          recordQaqcFinding(report, {
            bucket: QAQC_BUCKET.BLOCKED,
            category: 'Workflow consistency',
            title: 'Positive foreign-owned review/approve path was not exercised',
            detail: allowUnsafeForeignWorkflow
              ? 'No actionable foreign-owned inspection record was available in scope=all during the run.'
              : 'Foreign workflow mutation is intentionally limited to run-marked records unless VMECC_LIVE_ALLOW_FOREIGN_WORKFLOW=1 is set.',
          })
        }

        if (
          actionableForeign &&
          text(actionableForeign.id) &&
          Number(actionableForeign.version || 0) > 0
        ) {
          let foreignVersion = Number(actionableForeign.version || 0)

          if (actionableForeign.canReview === true) {
            const foreignReview = await apiRequest(
              request,
              report,
              'post',
              `/reports/${encodeURIComponent(String(actionableForeign.id))}/review`,
              {
                csrfToken,
                note: 'review safe foreign-owned actionable inspection',
                data: {
                  version: foreignVersion,
                  remarks: `${runMarker} foreign review probe`,
                },
              },
            )
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/review'),
              status:
                foreignReview.status === 200
                  ? MATRIX_STATUS.PASS
                  : foreignReview.status === 403
                    ? MATRIX_STATUS.POLICY_BLOCKED
                    : MATRIX_STATUS.FAIL,
              httpStatus: foreignReview.status,
              note: 'review safe foreign-owned inspection',
              details: { code: foreignReview.body?.code },
            })
            foreignVersion = Number(foreignReview.body?.data?.version || foreignVersion)
          }

          if (actionableForeign.canApprove === true) {
            const foreignApprove = await apiRequest(
              request,
              report,
              'post',
              `/reports/${encodeURIComponent(String(actionableForeign.id))}/approve`,
              {
                csrfToken,
                note: 'approve safe foreign-owned actionable inspection',
                data: {
                  version: foreignVersion,
                  remarks: `${runMarker} foreign approve probe`,
                },
              },
            )
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/approve'),
              status:
                foreignApprove.status === 200
                  ? MATRIX_STATUS.PASS
                  : foreignApprove.status === 403
                    ? MATRIX_STATUS.POLICY_BLOCKED
                    : MATRIX_STATUS.FAIL,
              httpStatus: foreignApprove.status,
              note: 'approve safe foreign-owned inspection',
              details: { code: foreignApprove.body?.code },
            })
            foreignVersion = Number(foreignApprove.body?.data?.version || foreignVersion)
          }

          if (actionableForeign.canReject === true && actionableForeign.canApprove !== true) {
            const foreignReject = await apiRequest(
              request,
              report,
              'post',
              `/reports/${encodeURIComponent(String(actionableForeign.id))}/reject`,
              {
                csrfToken,
                note: 'reject safe foreign-owned actionable inspection',
                data: {
                  version: foreignVersion,
                  remarks: `${runMarker} foreign reject probe`,
                },
              },
            )
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/reject'),
              status:
                foreignReject.status === 200
                  ? MATRIX_STATUS.PASS
                  : foreignReject.status === 403
                    ? MATRIX_STATUS.POLICY_BLOCKED
                    : MATRIX_STATUS.FAIL,
              httpStatus: foreignReject.status,
              note: 'reject safe foreign-owned inspection',
              details: { code: foreignReject.body?.code },
            })
          } else if (actionableForeign.canApprove === true) {
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/reject'),
              status: MATRIX_STATUS.INCONCLUSIVE,
              httpStatus: 0,
              note: 'reject skipped because the same safe foreign-owned record was used for the approve path',
            })
          } else {
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/reject'),
              status: MATRIX_STATUS.INCONCLUSIVE,
              httpStatus: 0,
              note: 'safe foreign-owned inspection did not expose a reject transition',
            })
          }
        }

        const workflowProbe =
          formRecords.find((row) => row.inspectionType === 'General Inspection') || formRecords[0]
        if (workflowProbe) {
          const rejectNoRemarks = await apiRequest(
            request,
            report,
            'post',
            `/reports/${encodeURIComponent(workflowProbe.reportUid)}/reject`,
            {
              csrfToken,
              note: 'reject without remarks validation',
              data: { version: workflowProbe.version },
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('post', '/reports/{uid}/reject'),
            result: rejectNoRemarks,
            expectedStatuses: [422],
            formType: workflowProbe.inspectionType,
            note: 'reject requires remarks',
          })

          const reviewOwn = await apiRequest(
            request,
            report,
            'post',
            `/reports/${encodeURIComponent(workflowProbe.reportUid)}/review`,
            {
              csrfToken,
              note: 'review own report or policy block',
              data: {
                version: workflowProbe.version,
                remarks: `${runMarker} review probe`,
              },
            },
          )
          if (reviewOwn.status === 200) {
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/review'),
              formType: workflowProbe.inspectionType,
              status: MATRIX_STATUS.PASS,
              httpStatus: reviewOwn.status,
              note: 'review own report succeeded',
            })
            workflowProbe.version = reviewOwn.body?.data?.version || workflowProbe.version

            const approveOwn = await apiRequest(
              request,
              report,
              'post',
              `/reports/${encodeURIComponent(workflowProbe.reportUid)}/approve`,
              {
                csrfToken,
                note: 'approve own report or policy block',
                data: {
                  version: workflowProbe.version,
                  remarks: `${runMarker} approve probe`,
                },
              },
            )
            if (approveOwn.status === 200) {
              markMatrix(report, {
                endpoint: canonicalEndpoint('post', '/reports/{uid}/approve'),
                formType: workflowProbe.inspectionType,
                status: MATRIX_STATUS.PASS,
                httpStatus: approveOwn.status,
                note: 'approve own report succeeded',
              })
            } else if (approveOwn.status === 403) {
              markMatrix(report, {
                endpoint: canonicalEndpoint('post', '/reports/{uid}/approve'),
                formType: workflowProbe.inspectionType,
                status: MATRIX_STATUS.POLICY_BLOCKED,
                httpStatus: approveOwn.status,
                note: 'approve blocked by configured self-approve policy',
                details: { code: approveOwn.body?.code },
              })
            } else {
              markMatrix(report, {
                endpoint: canonicalEndpoint('post', '/reports/{uid}/approve'),
                formType: workflowProbe.inspectionType,
                status: MATRIX_STATUS.FAIL,
                httpStatus: approveOwn.status,
                note: 'unexpected approve response',
                details: { code: approveOwn.body?.code },
              })
            }
          } else if (reviewOwn.status === 403) {
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/review'),
              formType: workflowProbe.inspectionType,
              status: MATRIX_STATUS.POLICY_BLOCKED,
              httpStatus: reviewOwn.status,
              note: 'review blocked by configured self-review policy',
              details: { code: reviewOwn.body?.code },
            })
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/approve'),
              formType: workflowProbe.inspectionType,
              status: MATRIX_STATUS.INCONCLUSIVE,
              httpStatus: 0,
              note: 'approve skipped because review was policy-blocked',
            })
          } else {
            markMatrix(report, {
              endpoint: canonicalEndpoint('post', '/reports/{uid}/review'),
              formType: workflowProbe.inspectionType,
              status: MATRIX_STATUS.FAIL,
              httpStatus: reviewOwn.status,
              note: 'unexpected review response',
              details: { code: reviewOwn.body?.code },
            })
          }
        }

        const fireExtinguisherRecord = formRecords.find(
          (row) => row.inspectionType === 'Fire Extinguisher',
        )
        const createdFireExtinguisherId = createdCatalog.fireExtinguisher?.id
        if (fireExtinguisherRecord && createdFireExtinguisherId) {
          const archiveCatalog = await apiRequest(
            request,
            report,
            'delete',
            `/inspection/fire-extinguishers/${encodeURIComponent(String(createdFireExtinguisherId))}`,
            {
              csrfToken,
              note: 'archive fire extinguisher catalog after report creation',
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint(
              'delete',
              '/inspection/fire-extinguishers/{extinguisherId}',
            ),
            result: archiveCatalog,
            expectedStatuses: [204],
            formType: 'Fire Extinguisher',
            note: 'archive backing fire extinguisher catalog row',
          })
          const showHistoric = await apiRequest(
            request,
            report,
            'get',
            `/reports/${encodeURIComponent(fireExtinguisherRecord.reportUid)}`,
            {
              note: 'show historical fire extinguisher report after catalog delete',
            },
          )
          if (
            recordApiOutcome(report, {
              endpoint: canonicalEndpoint('get', '/reports/{uid}'),
              result: showHistoric,
              expectedStatuses: [200],
              formType: 'Fire Extinguisher',
              note: 'historical FE report readable after catalog delete',
            })
          ) {
            const row = showHistoric.body?.data?.fireExtinguisherChecks?.[0] || {}
            if (!text(row.idLocNo) || !text(row.barcodeNo)) {
              recordQaqcFinding(report, {
                bucket: QAQC_BUCKET.REPRODUCED_LIVE,
                category: 'Data integrity',
                title: 'Fire extinguisher report lost row identity after catalog deletion',
                detail:
                  'Historical FE payload no longer exposes id/location or barcode after the backing catalog row was archived.',
              })
            }
          }
          createdCatalog.fireExtinguisher = null
        }

        const hydraulicRecord = formRecords.find(
          (row) => row.inspectionType === 'Hydraulic Rescue Tools',
        )
        if (hydraulicRecord && createdCatalog.hydraulicEquipment?.id) {
          const archiveEquipment = await apiRequest(
            request,
            report,
            'delete',
            `/inspection/equipment/${encodeURIComponent(String(createdCatalog.hydraulicEquipment.id))}`,
            {
              csrfToken,
              note: 'archive hydraulic equipment after report creation',
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('delete', '/inspection/equipment/{equipmentId}'),
            result: archiveEquipment,
            expectedStatuses: [204],
            formType: 'Hydraulic Rescue Tools',
            note: 'archive hydraulic backing equipment row',
          })
          const showHistoric = await apiRequest(
            request,
            report,
            'get',
            `/reports/${encodeURIComponent(hydraulicRecord.reportUid)}`,
            {
              note: 'show hydraulic report after equipment delete',
            },
          )
          if (
            recordApiOutcome(report, {
              endpoint: canonicalEndpoint('get', '/reports/{uid}'),
              result: showHistoric,
              expectedStatuses: [200],
              formType: 'Hydraulic Rescue Tools',
              note: 'historical hydraulic report readable after equipment delete',
            })
          ) {
            const row = showHistoric.body?.data?.hydraulicChecks?.[0] || {}
            if (!text(row.equipment)) {
              recordQaqcFinding(report, {
                bucket: QAQC_BUCKET.REPRODUCED_LIVE,
                category: 'Data integrity',
                title: 'Hydraulic report lost equipment label after catalog deletion',
                detail:
                  'Historical hydraulic payload no longer exposes the equipment label after the backing equipment row was archived.',
              })
            }
          }
          createdCatalog.hydraulicEquipment = null
        }

        const scbaRecord = formRecords.find((row) => row.inspectionType === 'SCBA')
        if (
          scbaRecord &&
          createdCatalog.scbaItem?.catalogItemId &&
          createdCatalog.scbaSection?.catalogSectionId
        ) {
          const archiveItem = await apiRequest(
            request,
            report,
            'delete',
            `/inspection/scba-catalog/items/${encodeURIComponent(
              String(createdCatalog.scbaItem.catalogItemId),
            )}`,
            {
              csrfToken,
              note: 'archive SCBA custom item after report creation',
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('delete', '/inspection/scba-catalog/items/{itemId}'),
            result: archiveItem,
            expectedStatuses: [204],
            formType: 'SCBA',
            note: 'archive SCBA custom item',
          })

          const archiveSection = await apiRequest(
            request,
            report,
            'delete',
            `/inspection/scba-catalog/sections/${encodeURIComponent(
              String(createdCatalog.scbaSection.catalogSectionId),
            )}`,
            {
              csrfToken,
              note: 'archive SCBA custom section after report creation',
            },
          )
          recordApiOutcome(report, {
            endpoint: canonicalEndpoint('delete', '/inspection/scba-catalog/sections/{sectionId}'),
            result: archiveSection,
            expectedStatuses: [204],
            formType: 'SCBA',
            note: 'archive SCBA custom section',
          })

          const showHistoric = await apiRequest(
            request,
            report,
            'get',
            `/reports/${encodeURIComponent(scbaRecord.reportUid)}`,
            {
              note: 'show SCBA report after custom archive',
            },
          )
          if (
            recordApiOutcome(report, {
              endpoint: canonicalEndpoint('get', '/reports/{uid}'),
              result: showHistoric,
              expectedStatuses: [200],
              formType: 'SCBA',
              note: 'historical SCBA report readable after custom archive',
            })
          ) {
            const section = showHistoric.body?.data?.scbaCustomSections?.[0] || {}
            if (!text(section.title) || !Array.isArray(section.rows) || section.rows.length === 0) {
              recordQaqcFinding(report, {
                bucket: QAQC_BUCKET.REPRODUCED_LIVE,
                category: 'Data integrity',
                title: 'SCBA historical custom section lost detail after archive',
                detail:
                  'Historical SCBA payload no longer exposes the archived custom section and row detail.',
              })
            }
          }
          createdCatalog.scbaItem = null
          createdCatalog.scbaSection = null
        }

        const storageState = await desktopContext.storageState()

        for (const viewport of viewportProfiles.slice(1)) {
          const context = await browser.newContext({
            baseURL: baseUrl,
            viewport: { width: viewport.width, height: viewport.height },
            storageState,
            acceptDownloads: true,
          })
          const page = await context.newPage()
          attachDiagnostics(page, report, viewport.key)
          try {
            await takeRouteScreenshot({
              page,
              report,
              testInfo,
              viewportKey: viewport.key,
              formType: null,
              route: '/inspection',
              name: 'records-shell',
              expectedHeading: viewport.key === 'mobile' ? null : /^Inspection$/i,
            })
            await takeRouteScreenshot({
              page,
              report,
              testInfo,
              viewportKey: viewport.key,
              formType: null,
              route: '/inspection/new',
              name: 'new-shell',
              expectedHeading: viewport.key === 'mobile' ? null : /^Inspection$/i,
            })

            if (viewport.key === 'mobile') {
              await expect(page.getByText('Choose Type', { exact: true })).toBeVisible({
                timeout: routeTimeoutMs,
              })
            }

            for (const representative of formRecords) {
              await takeRouteScreenshot({
                page,
                report,
                testInfo,
                viewportKey: viewport.key,
                formType: representative.inspectionType,
                route: `/inspection/${encodeURIComponent(representative.reportUid)}`,
                name: `${slug(representative.inspectionType)}-detail`,
                expectedText: representative.displayId,
              })
              await takeRouteScreenshot({
                page,
                report,
                testInfo,
                viewportKey: viewport.key,
                formType: representative.inspectionType,
                route: `/inspection/${encodeURIComponent(representative.reportUid)}/edit`,
                name: `${slug(representative.inspectionType)}-edit`,
                expectedSelectedType: representative.inspectionType,
              })
            }

            if (viewport.key === 'mobile') {
              await page.goto('/inspection', { waitUntil: 'domcontentloaded' })
              await waitForAppReady(page, '/inspection')
              const viewAllRecords = page.getByRole('button', { name: /^View all/i })
              await expect(viewAllRecords).toBeVisible({ timeout: routeTimeoutMs })
              await viewAllRecords.click()
              const openFilters = page.getByRole('button', { name: 'Open filters' })
              await expect(openFilters).toBeVisible({ timeout: routeTimeoutMs })
              await openFilters.click()
              const dialog = page.getByRole('dialog', { name: 'Filters' })
              await expect(dialog).toBeVisible({ timeout: routeTimeoutMs })
              const filterDrawerScreenshot = await saveScreenshot(
                page,
                testInfo,
                report,
                `${viewport.key}-filters-drawer`,
              )
              const drawerMetrics = await dialog.evaluate((element) => ({
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
              }))
              if (
                Number(drawerMetrics.scrollHeight || 0) > Number(drawerMetrics.clientHeight || 0)
              ) {
                recordQaqcFinding(report, {
                  bucket: QAQC_BUCKET.KNOWN_STILL_OBSERVED,
                  category: 'Accessibility/mobile ergonomics',
                  title: 'Mobile filter drawer still overflows its viewport height',
                  detail: `Drawer scrollHeight ${drawerMetrics.scrollHeight} exceeds clientHeight ${drawerMetrics.clientHeight}.`,
                  evidence: [filterDrawerScreenshot],
                })
              } else {
                recordQaqcFinding(report, {
                  bucket: QAQC_BUCKET.KNOWN_NOT_REPRODUCED,
                  category: 'Accessibility/mobile ergonomics',
                  title: 'Mobile filter drawer stayed within its viewport during the live sweep',
                  detail: `Drawer scrollHeight ${drawerMetrics.scrollHeight} and clientHeight ${drawerMetrics.clientHeight}.`,
                  evidence: [filterDrawerScreenshot],
                })
              }
              await page.keyboard.press('Escape')
            }
          } catch (error) {
            browserFailureMessages.push(
              `${viewport.key} viewport parity failed: ${error?.message || String(error)}`,
            )
            recordBrowserCheck(report, {
              status: MATRIX_STATUS.FAIL,
              viewport: viewport.key,
              route: '/inspection',
              note: error?.message || String(error),
            })
          } finally {
            await closeContextWithTimeout(context, report, `${viewport.key} responsive`)
          }
        }

        const offlineContext = await browser.newContext({
          baseURL: baseUrl,
          viewport: { width: 390, height: 844 },
          storageState,
          acceptDownloads: true,
        })
        const offlinePage = await offlineContext.newPage()
        attachDiagnostics(offlinePage, report, 'offline-mobile')
        try {
          writeJsonArtifact('progress.json', {
            phase: 'offline-flow-started',
            recordedAt: new Date().toISOString(),
          })
          await apiRequest(request, report, 'delete', '/reports/draft?report_type=inspection', {
            csrfToken,
            note: 'clear draft before offline queue flow',
          })
          await offlinePage.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
          await waitForAppReady(offlinePage, '/inspection/new')
          await fillRepresentativeOfflineGeneralFlow(offlinePage)

          await completeWithin(
            () => offlineContext.setOffline(true),
            'Enabling browser offline mode',
          )
          await expect
            .poll(() => offlinePage.evaluate(() => navigator.onLine), {
              timeout: routeTimeoutMs,
            })
            .toBe(false)
          await clickFirstVisible(
            offlinePage.getByRole('button', { name: /Continue to Review(?: Updates)?/ }),
          )
          await offlinePage.waitForURL(/\/inspection\/review(?:[/?#]|$)/, {
            timeout: routeTimeoutMs,
          })
          await waitForAppReady(offlinePage, '/inspection/review')
          await expect(
            offlinePage.getByText(/queued on this device until sync succeeds/i),
          ).toBeVisible({
            timeout: routeTimeoutMs,
          })
          await expect(offlinePage.getByRole('button', { name: 'Queue for sync' })).toBeVisible({
            timeout: routeTimeoutMs,
          })
          const offlineReviewScreenshot = await saveScreenshot(
            offlinePage,
            testInfo,
            report,
            'mobile-offline-review',
          )

          const mobileButtonHeight = await measureButtonHeight(offlinePage, 'Queue for sync')
          if (mobileButtonHeight < 44) {
            recordQaqcFinding(report, {
              bucket: QAQC_BUCKET.KNOWN_STILL_OBSERVED,
              category: 'Accessibility/mobile ergonomics',
              title: 'Offline review submit action remains below 44px on mobile',
              detail: `Measured ${mobileButtonHeight.toFixed(1)}px on the live mobile offline review state.`,
              evidence: [offlineReviewScreenshot],
            })
          } else {
            recordQaqcFinding(report, {
              bucket: QAQC_BUCKET.KNOWN_NOT_REPRODUCED,
              category: 'Accessibility/mobile ergonomics',
              title: 'Offline review submit action meets the 44px mobile touch target',
              detail: `Measured ${mobileButtonHeight.toFixed(1)}px on the live mobile offline review state.`,
              evidence: [offlineReviewScreenshot],
            })
          }

          await clickFirstVisible(offlinePage.getByRole('button', { name: 'Queue for sync' }))
          const confirmQueue = offlinePage.getByRole('button', { name: 'Confirm Queue' })
          if (
            await confirmQueue
              .waitFor({ state: 'visible', timeout: 2000 })
              .then(() => true)
              .catch(() => false)
          ) {
            await clickFirstVisible(confirmQueue)
          }
          await offlinePage.waitForURL(/\/inspection(?:[/?#]|$)/, { timeout: routeTimeoutMs })
          await waitForAppReady(offlinePage, '/inspection')
          await expect(
            await firstVisible(offlinePage.getByText(/queued for sync|Syncing queued reports/i)),
          ).toBeVisible({
            timeout: routeTimeoutMs,
          })
          const offlineHomeScreenshot = await saveScreenshot(
            offlinePage,
            testInfo,
            report,
            'mobile-offline-home-banner',
          )
          recordQaqcFinding(report, {
            bucket: QAQC_BUCKET.KNOWN_NOT_REPRODUCED,
            category: 'Workflow consistency',
            title: 'Offline queue flow clearly labels queued state before final sync',
            detail:
              'The live review screen showed the queue warning and Queue for sync label before submit, and the records home showed the queued banner after submit.',
            evidence: [offlineReviewScreenshot, offlineHomeScreenshot],
          })

          await clickFirstVisible(offlinePage.getByRole('button', { name: 'Details' }))
          await expect(
            offlinePage.getByRole('dialog', { name: 'Queued inspection reports' }),
          ).toBeVisible({
            timeout: routeTimeoutMs,
          })
          await saveScreenshot(offlinePage, testInfo, report, 'mobile-offline-queue-details')
          await offlinePage.keyboard.press('Escape')

          writeJsonArtifact('progress.json', {
            phase: 'offline-queue-details-complete',
            recordedAt: new Date().toISOString(),
          })
          const syncResponsePromise = offlinePage.waitForResponse(
            (response) => {
              try {
                const url = new URL(response.url())
                return (
                  url.pathname.endsWith('/api/reports') && response.request().method() === 'POST'
                )
              } catch {
                return false
              }
            },
            { timeout: 60_000 },
          )
          await completeWithin(
            () => offlineContext.setOffline(false),
            'Disabling browser offline mode',
          )
          writeJsonArtifact('progress.json', {
            phase: 'browser-online-restored',
            recordedAt: new Date().toISOString(),
          })
          const retryNow = offlinePage.getByRole('button', { name: 'Retry now' })
          let syncResponse = await Promise.race([
            syncResponsePromise,
            new Promise((resolve) => setTimeout(() => resolve(null), 2_000)),
          ])
          if (!syncResponse) {
            const retryCandidate = await firstVisible(retryNow)
            const mayRetry =
              (await retryCandidate.isVisible().catch(() => false)) &&
              (await retryCandidate.isEnabled().catch(() => false))
            if (mayRetry) {
              writeJsonArtifact('progress.json', {
                phase: 'offline-sync-retry-clicking',
                recordedAt: new Date().toISOString(),
              })
              await completeWithin(
                () => retryCandidate.click({ noWaitAfter: true, timeout: 10_000 }),
                'Clicking offline sync retry',
              )
              writeJsonArtifact('progress.json', {
                phase: 'offline-sync-retry-clicked',
                recordedAt: new Date().toISOString(),
              })
            } else {
              writeJsonArtifact('progress.json', {
                phase: 'offline-auto-sync-in-progress',
                recordedAt: new Date().toISOString(),
              })
            }
            syncResponse = await syncResponsePromise
          } else {
            writeJsonArtifact('progress.json', {
              phase: 'offline-auto-sync-observed',
              recordedAt: new Date().toISOString(),
            })
          }
          writeJsonArtifact('progress.json', {
            phase: 'offline-sync-response-received',
            recordedAt: new Date().toISOString(),
            status: syncResponse.status(),
          })
          expect(syncResponse.status()).toBe(201)
          const syncedBody = await syncResponse.json()
          const syncedReportUid = text(syncedBody?.data?.id)
          if (syncedReportUid) {
            registerCleanupTask(
              report,
              {
                endpoint: canonicalEndpoint('delete', '/reports/{uid}'),
                objectType: 'inspection-report',
                identifier: syncedReportUid,
                formType: 'General Inspection',
                lastKnownState: syncedBody?.data || null,
                notes: 'offline queue cleanup',
              },
              async () => {
                const cleanup = await apiRequest(
                  request,
                  report,
                  'delete',
                  `/reports/${encodeURIComponent(syncedReportUid)}`,
                  { csrfToken, note: 'cleanup synced offline report' },
                )
                if (![200, 204, 404].includes(cleanup.status)) {
                  throw new Error(`Offline synced cleanup returned ${cleanup.status}`)
                }
              },
            )
          }

          await expect
            .poll(
              async () => {
                const queuedState = offlinePage.getByText(/queued for sync|Syncing queued reports/i)
                const count = await queuedState.count()
                for (let index = 0; index < count; index += 1) {
                  if (
                    await queuedState
                      .nth(index)
                      .isVisible()
                      .catch(() => false)
                  )
                    return false
                }
                return true
              },
              { timeout: 60_000 },
            )
            .toBe(true)
          writeJsonArtifact('progress.json', {
            phase: 'offline-queue-cleared',
            recordedAt: new Date().toISOString(),
          })
          recordBrowserCheck(report, {
            status: MATRIX_STATUS.PASS,
            viewport: 'mobile',
            route: '/inspection/review',
            note: 'offline queue, details, reconnect sync, and cleanup',
          })
        } catch (error) {
          browserFailureMessages.push(
            `Offline queue flow failed: ${error?.message || String(error)}`,
          )
          recordBrowserCheck(report, {
            status: MATRIX_STATUS.FAIL,
            viewport: 'mobile',
            route: '/inspection/review',
            note: `offline queue flow failed: ${error?.message || String(error)}`,
          })
          recordQaqcFinding(report, {
            bucket: QAQC_BUCKET.REPRODUCED_LIVE,
            category: 'Workflow consistency',
            title: 'Offline queue representative browser flow failed',
            detail: error?.message || String(error),
          })
        } finally {
          writeJsonArtifact('progress.json', {
            phase: 'offline-context-closing',
            recordedAt: new Date().toISOString(),
          })
          await closeContextWithTimeout(offlineContext, report, 'offline mobile')
          writeJsonArtifact('progress.json', {
            phase: 'offline-context-close-finished',
            recordedAt: new Date().toISOString(),
          })
        }
      }
    } finally {
      writeJsonArtifact('progress.json', {
        phase: 'desktop-context-closing',
        recordedAt: new Date().toISOString(),
      })
      await closeContextWithTimeout(desktopContext, report, 'desktop')
      writeJsonArtifact('progress.json', {
        phase: 'cleanup-started',
        recordedAt: new Date().toISOString(),
      })
      await runCleanupTasks(report)
      writeJsonArtifact('progress.json', {
        phase: 'cleanup-finished',
        recordedAt: new Date().toISOString(),
      })
      report.completedAt = new Date().toISOString()
      report.notes.push(...browserFailureMessages)

      const qaqcMarkdown = generateQaqcMarkdown(report)
      writeJsonArtifact('endpoint-matrix.json', report.endpointMatrix)
      writeJsonArtifact('cleanup-ledger.json', report.cleanupLedger)
      writeJsonArtifact('summary.json', {
        ...summarizeReport(report),
        browserCheckCounts: report.browser.viewportChecks.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1
          return acc
        }, {}),
        notes: report.notes,
      })
      writeTextArtifact('qaqc-report.md', qaqcMarkdown)
    }

    const endpointFailures = report.endpointMatrix.filter(
      (entry) => entry.status === MATRIX_STATUS.FAIL,
    )
    const cleanupFailures = report.cleanupLedger.filter((entry) => entry.status === 'failed')
    const browserFailures = report.browser.viewportChecks.filter(
      (entry) => entry.status === MATRIX_STATUS.FAIL,
    )

    expect(
      {
        endpointFailures: endpointFailures.length,
        cleanupFailures: cleanupFailures.length,
        browserFailures: browserFailures.length,
      },
      `Live smoke found failures. See ${runMarker} artifacts under test-results/live-inspection-smoke/${runId}.`,
    ).toEqual({
      endpointFailures: 0,
      cleanupFailures: 0,
      browserFailures: 0,
    })
  })
})
