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

const fillFirstVisible = async (locator, value) => {
  const candidate = await firstVisible(locator)
  await candidate.fill(value)
  return candidate
}

const openSavedDraftIfPrompt = async (page) => {
  const openDraftButton = page.getByRole('button', { name: 'Open saved draft' })
  if (await openDraftButton.isVisible().catch(() => false)) {
    await openDraftButton.click()
    return true
  }
  return false
}

const inspectionTypeNamePattern = (inspectionType) =>
  new RegExp(
    String(inspectionType || '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+'),
    'i',
  )

const openInspectionTypeCard = async (page, inspectionType) => {
  const namePattern = inspectionTypeNamePattern(inspectionType)
  const showMoreButton = page.getByRole('button', { name: /show more/i }).first()
  if (await showMoreButton.isVisible().catch(() => false)) {
    await showMoreButton.click()
  }

  const candidates = [
    page.getByRole('radio', { name: namePattern }).first(),
    page.getByRole('button', { name: namePattern }).first(),
    page
      .locator('[role="radio"], button, .card, .inspection-type-card')
      .filter({
        hasText: namePattern,
      })
      .first(),
  ]

  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click()
      return
    }
  }

  await expect(candidates[0]).toBeVisible({ timeout: routeTimeoutMs })
}

const measureButtonHeight = async (page, label) => {
  const button = await firstVisible(page.getByRole('button', { name: label }))
  const box = await button.boundingBox().catch(() => null)
  return box?.height || 0
}

const selectFirstLocationCard = async (page) => {
  const section = page.locator('.inspection-form-section').filter({
    has: page.getByText(/Choose Main Location/i),
  })
  const firstCard = section.locator('[role="radio"]').first()
  await expect(firstCard).toBeVisible({ timeout: routeTimeoutMs })
  await firstCard.click()
}

const fillRepresentativeOfflineGeneralFlow = async (page) => {
  await openInspectionTypeCard(page, 'General Inspection')
  await selectFirstLocationCard(page)

  const quickCheckButton = page
    .locator('.inspection-form-section')
    .filter({ has: page.getByText(/Quick Checks/i) })
    .locator('button')
    .first()
  await expect(quickCheckButton).toBeVisible({ timeout: routeTimeoutMs })
  await quickCheckButton.click()

  await fillFirstVisible(
    page.locator('textarea[placeholder*="Describe what you inspected"]'),
    `${runMarker} offline queue representative flow`,
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
  expectedHeading = null,
}) => {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await waitForAppReady(page, route)
  if (expectedHeading) {
    await expect(page.getByRole('heading', { name: expectedHeading })).toBeVisible({
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

  test('covers live inspection CRUD, QAQC, and artifact reporting', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(20 * 60_000)
    ensureArtifactDirectories()

    const report = createLiveReport()
    let csrfToken = ''
    let currentUser = null
    let loginFailed = false

    const createdCatalog = {
      location: null,
      subLocation: null,
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
          expectedHeading: /Inspection Records/i,
        })
        await takeRouteScreenshot({
          page: desktopPage,
          report,
          testInfo,
          viewportKey: 'desktop',
          formType: null,
          route: '/inspection/new',
          name: 'new-shell',
          expectedHeading: /Conduct Inspection/i,
        })
        await takeRouteScreenshot({
          page: desktopPage,
          report,
          testInfo,
          viewportKey: 'desktop',
          formType: null,
          route: '/inspection/workflow-settings',
          name: 'workflow-settings',
          expectedHeading: /Reporting Settings/i,
        })
      }

      if (!loginFailed) {
        const noCsrf = await apiRequest(request, report, 'post', '/inspection/fire-trucks', {
          note: 'csrf missing negative test',
          data: { plateNo: `${runMarker}-NO-CSRF`.slice(0, 40) },
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
          data: { plateNo: `${runMarker}-BAD-CSRF`.slice(0, 40) },
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

        const fireExtinguisherList = await apiRequest(
          request,
          report,
          'get',
          `/inspection/fire-extinguishers?mainLocation=${encodeURIComponent('Smoke Yard')}&subLocation=${encodeURIComponent(
            'Smoke Rack',
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
              zone: `${runMarker} Zone`,
              mainLocation: 'Smoke Yard',
              subLocation: 'Smoke Rack',
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
                zone: `${runMarker} Zone`,
                mainLocation: 'Smoke Yard',
                subLocation: 'Smoke Rack',
                idLocNo: `${runMarker}-FE-LOC`,
                barcodeNo: `${runMarker}-FE-BC`,
                feType: 'CO2',
                certificationValidity: addDays(reportDate, 365),
              },
            },
          )
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
                zone: `${runMarker} Zone Updated`,
                mainLocation: 'Smoke Yard',
                subLocation: 'Smoke Rack',
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
              plateNo: `${runMarker}-TRK`.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40),
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

          const updatedPlateNo = `${createdCatalog.fireTruck.plateNo}-UPD`.slice(0, 40)
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
          fireExtinguisherMainLocation:
            text(createdCatalog.fireExtinguisher?.mainLocation) || 'Smoke Yard',
          fireExtinguisherSubLocation:
            text(createdCatalog.fireExtinguisher?.subLocation) || 'Smoke Rack',
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

          if (draftId) {
            try {
              await desktopPage.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
              await waitForAppReady(desktopPage, '/inspection/new')
              await openSavedDraftIfPrompt(desktopPage)
              if (
                !(await desktopPage
                  .getByRole('button', { name: /Review Inspections|Review Submissions/ })
                  .first()
                  .isVisible()
                  .catch(() => false))
              ) {
                await openInspectionTypeCard(desktopPage, inspectionType)
              }
              await expect(
                desktopPage
                  .getByRole('button', { name: /Review Inspections|Review Submissions/ })
                  .first(),
              ).toBeVisible({
                timeout: routeTimeoutMs,
              })
              const newScreenshot = await saveScreenshot(
                desktopPage,
                testInfo,
                report,
                `desktop-${slug(inspectionType)}-new-form`,
              )
              recordBrowserCheck(report, {
                status: MATRIX_STATUS.PASS,
                viewport: 'desktop',
                formType: inspectionType,
                route: '/inspection/new',
                note: 'new form hydrated from server draft',
                evidence: [newScreenshot],
              })

              await clickFirstVisible(
                desktopPage.getByRole('button', { name: /Review Inspections|Review Submissions/ }),
              )
              await desktopPage.waitForURL(/\/inspection\/review(?:[/?#]|$)/, {
                timeout: routeTimeoutMs,
              })
              await waitForAppReady(desktopPage, '/inspection/review')
              const reviewScreenshot = await saveScreenshot(
                desktopPage,
                testInfo,
                report,
                `desktop-${slug(inspectionType)}-review`,
              )
              recordBrowserCheck(report, {
                status: MATRIX_STATUS.PASS,
                viewport: 'desktop',
                formType: inspectionType,
                route: '/inspection/review',
                note: 'review route parity',
                evidence: [reviewScreenshot],
              })

              await clickFirstVisible(desktopPage.getByRole('button', { name: 'Back to Edit' }))
              await desktopPage.waitForURL(
                /\/inspection\/new(?:[/?#]|$)|\/inspection\/[^/]+\/edit(?:[/?#]|$)/,
                {
                  timeout: routeTimeoutMs,
                },
              )
            } catch (error) {
              browserFailureMessages.push(
                `Desktop new/review parity failed for ${inspectionType}: ${error?.message || String(error)}`,
              )
              recordBrowserCheck(report, {
                status: MATRIX_STATUS.FAIL,
                viewport: 'desktop',
                formType: inspectionType,
                route: '/inspection/new',
                note: error?.message || String(error),
              })
            }
          }

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
            await takeRouteScreenshot({
              page: desktopPage,
              report,
              testInfo,
              viewportKey: 'desktop',
              formType: inspectionType,
              route: `/inspection/${encodeURIComponent(reportUid)}`,
              name: `${slug(inspectionType)}-detail`,
            })
            await takeRouteScreenshot({
              page: desktopPage,
              report,
              testInfo,
              viewportKey: 'desktop',
              formType: inspectionType,
              route: `/inspection/${encodeURIComponent(reportUid)}/edit`,
              name: `${slug(inspectionType)}-edit`,
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
              expectedHeading: /Inspection Records/i,
            })
            await takeRouteScreenshot({
              page,
              report,
              testInfo,
              viewportKey: viewport.key,
              formType: null,
              route: '/inspection/new',
              name: 'new-shell',
              expectedHeading: /Conduct Inspection/i,
            })

            for (const representative of formRecords) {
              await takeRouteScreenshot({
                page,
                report,
                testInfo,
                viewportKey: viewport.key,
                formType: representative.inspectionType,
                route: `/inspection/${encodeURIComponent(representative.reportUid)}`,
                name: `${slug(representative.inspectionType)}-detail`,
              })
              await takeRouteScreenshot({
                page,
                report,
                testInfo,
                viewportKey: viewport.key,
                formType: representative.inspectionType,
                route: `/inspection/${encodeURIComponent(representative.reportUid)}/edit`,
                name: `${slug(representative.inspectionType)}-edit`,
              })
            }

            if (viewport.key === 'mobile') {
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
            await context.close()
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
          await apiRequest(request, report, 'delete', '/reports/draft?report_type=inspection', {
            csrfToken,
            note: 'clear draft before offline queue flow',
          })
          await offlinePage.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
          await waitForAppReady(offlinePage, '/inspection/new')
          await fillRepresentativeOfflineGeneralFlow(offlinePage)

          await offlineContext.setOffline(true)
          await clickFirstVisible(
            offlinePage.getByRole('button', { name: /Review Inspections|Review Submissions/ }),
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
          await offlinePage.waitForURL(/\/inspection(?:[/?#]|$)/, { timeout: routeTimeoutMs })
          await waitForAppReady(offlinePage, '/inspection')
          await expect(
            offlinePage.getByText(/queued for sync|Syncing queued reports/i),
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

          await offlineContext.setOffline(false)
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
          await clickFirstVisible(offlinePage.getByRole('button', { name: 'Retry now' }))
          const syncResponse = await syncResponsePromise
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

          await expect(offlinePage.getByText(/queued for sync|Syncing queued reports/i)).toBeHidden(
            {
              timeout: 60_000,
            },
          )
        } catch (error) {
          browserFailureMessages.push(
            `Offline queue flow failed: ${error?.message || String(error)}`,
          )
          recordQaqcFinding(report, {
            bucket: QAQC_BUCKET.REPRODUCED_LIVE,
            category: 'Workflow consistency',
            title: 'Offline queue representative browser flow failed',
            detail: error?.message || String(error),
          })
        } finally {
          await offlineContext.close()
        }
      }
    } finally {
      report.completedAt = new Date().toISOString()
      await runCleanupTasks(report)
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

      await desktopContext.close()
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
