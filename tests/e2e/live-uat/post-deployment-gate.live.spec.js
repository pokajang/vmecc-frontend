const { expect } = require('@playwright/test')
const { test } = require('./live-uat-fixture')
const schedule = require('./day3-route-schedule.json')
const { resolveScheduledRoute } = require('./live-uat-day3-support')
const {
  dismissIncidentalDialogs,
  getUnexpectedRouteDiagnostics,
  gotoApprovedRoute,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  waitForApplicationReady,
  waitForRouteSettled,
  writeLiveUatLedger,
} = require('./live-uat-support')

const EXPECTED_BUILD_ID = '54acd0e2d079-20260810102950'
const liveEnabled =
  process.env.VMECC_LIVE_UAT === '1' && process.env.VMECC_LIVE_UAT_READ_ONLY === '1'

const routeFor = (routePattern) => {
  const route = schedule.routes.find((candidate) => candidate.routePattern === routePattern)
  if (!route) throw new Error(`Missing scheduled route: ${routePattern}`)
  return route
}

const diagnosticOffsets = (diagnostics) =>
  Object.fromEntries(Object.entries(diagnostics).map(([key, values]) => [key, values.length]))

const diagnosticDelta = (diagnostics, offsets) =>
  Object.fromEntries(
    Object.entries(diagnostics).map(([key, values]) => [key, values.slice(offsets[key] || 0)]),
  )

const assertDeployedBuild = async (page) => {
  const response = await page.request.get(
    `https://vmecc.amiosh.com/version.json?uat=${Date.now()}`,
    { headers: { 'Cache-Control': 'no-cache' } },
  )
  expect(response.ok()).toBe(true)
  const payload = await response.json()
  expect(payload.buildId).toBe(EXPECTED_BUILD_ID)
}

const auditCurrentRoute = async ({ page, diagnostics, offsets, routeId, persona, ledger }) => {
  await waitForApplicationReady(page)
  await waitForRouteSettled(page)
  await dismissIncidentalDialogs(page)
  const finalPath = new URL(page.url()).pathname
  const overflow = await measureHorizontalOverflow(page)
  const delta = diagnosticDelta(diagnostics, offsets)
  const isPermissionBlocked = finalPath === '/403'
  const unexpected = getUnexpectedRouteDiagnostics(delta, isPermissionBlocked)
  const failures = {
    consoleErrors: unexpected.consoleErrors,
    clientErrors: unexpected.clientErrors,
    pageErrors: delta.pageErrors,
    failedRequests: delta.failedRequests,
    rateLimitErrors: delta.rateLimitErrors,
    serverErrors: delta.serverErrors,
  }
  ledger.push({
    routeId,
    routePattern: finalPath,
    persona,
    viewport: '',
    status:
      Object.values(failures).some((entries) => entries.length) || overflow.overflow > 1
        ? 'failed'
        : isPermissionBlocked
          ? 'permission-blocked'
          : 'passed',
    evidence: [],
    notes: [
      `finalPath=${finalPath}`,
      `overflow=${overflow.overflow}`,
      `consoleErrors=${delta.consoleErrors.length}`,
      `clientErrors=${delta.clientErrors.length}`,
      `pageErrors=${delta.pageErrors.length}`,
      `failedRequests=${delta.failedRequests.length}`,
      `rateLimitErrors=${delta.rateLimitErrors.length}`,
      `serverErrors=${delta.serverErrors.length}`,
    ].join('; '),
  })

  expect(delta.rateLimitErrors, `${routeId}: rate limited`).toEqual([])
  expect(delta.serverErrors, `${routeId}: server error`).toEqual([])
  expect(delta.pageErrors, `${routeId}: page error`).toEqual([])
  expect(delta.failedRequests, `${routeId}: failed request`).toEqual([])
  expect(unexpected.clientErrors, `${routeId}: unexpected 4xx`).toEqual([])
  expect(unexpected.consoleErrors, `${routeId}: console error`).toEqual([])
  expect(overflow.overflow, `${routeId}: document overflow`).toBeLessThanOrEqual(1)
  expect(finalPath, `${routeId}: session returned to login`).not.toBe('/login')
  return { finalPath, delta }
}

const visitRoute = async ({ page, diagnostics, route, persona, ledger }) => {
  const offsets = diagnosticOffsets(diagnostics)
  await gotoApprovedRoute(page, route)
  return auditCurrentRoute({ page, diagnostics, offsets, routeId: route, persona, ledger })
}

const exerciseAdminQueue = async ({
  page,
  diagnostics,
  route,
  title,
  detailHeading,
  persona,
  ledger,
}) => {
  const offsets = diagnosticOffsets(diagnostics)
  await gotoApprovedRoute(page, route)
  await waitForApplicationReady(page)
  await waitForRouteSettled(page)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  const viewButton = page.getByRole('button', { name: 'View', exact: true }).first()
  if (await viewButton.isVisible().catch(() => false)) {
    await viewButton.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: detailHeading, exact: true })).toBeVisible()
    await expect(page.getByLabel('Status')).toBeVisible()
    await expect(page.getByLabel('Admin note')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  }

  const mobileSelect = page.getByRole('combobox', { name: `${title} status` })
  if (await mobileSelect.isVisible().catch(() => false)) {
    await expect(mobileSelect.locator('option')).toHaveCount(6)
    await mobileSelect.selectOption('all')
  } else {
    await expect(page.getByRole('button', { name: /^Open(?:\s|$)/ })).toBeVisible()
    await page.getByRole('button', { name: /^All(?:\s|$)/ }).click()
  }
  await waitForRouteSettled(page)
  await page.getByRole('button', { name: 'Refresh' }).click()
  await waitForRouteSettled(page)

  return auditCurrentRoute({ page, diagnostics, offsets, routeId: route, persona, ledger })
}

const assertSessionContinuity = async ({ page, diagnostics, persona, ledger }) => {
  const offsets = diagnosticOffsets(diagnostics)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await waitForRouteSettled(page)
  return auditCurrentRoute({
    page,
    diagnostics,
    offsets,
    routeId: `${persona}-session-focus`,
    persona,
    ledger,
  })
}

const attachLedger = async (testInfo, ledger) => {
  const viewport = testInfo.project.name
  const normalized = ledger.map((entry) => ({ ...entry, viewport }))
  const ledgerPath = writeLiveUatLedger(testInfo, normalized)
  await testInfo.attach('post-deployment-gate-ledger', {
    path: ledgerPath,
    contentType: 'application/json',
  })
}

test.describe('production post-deployment corrective gate', () => {
  test.skip(!liveEnabled, 'Requires explicit live read-only UAT flags')

  test('System Administrator review queues and overtime rules remain coherent', async ({
    page,
    journeyDiagnostics,
  }, testInfo) => {
    test.setTimeout(4 * 60_000)
    const persona = 'sysadmin'
    const ledger = []
    const settingsReads = []
    page.on('request', (request) => {
      if (
        request.method() === 'GET' &&
        request.url().includes('/settings/overtime-approval-rules')
      ) {
        settingsReads.push(request.url())
      }
    })

    await assertDeployedBuild(page)
    await loginPersonaThroughUi(page, persona)
    await exerciseAdminQueue({
      page,
      diagnostics: journeyDiagnostics,
      route: '/admin/ai-helper-reports',
      title: 'Ask AI Reports',
      detailHeading: 'Reason',
      persona,
      ledger,
    })
    await exerciseAdminQueue({
      page,
      diagnostics: journeyDiagnostics,
      route: '/admin/feedback-reports',
      title: 'Feedback Reports',
      detailHeading: 'Message',
      persona,
      ledger,
    })
    await visitRoute({
      page,
      diagnostics: journeyDiagnostics,
      route: '/staff/overtime-management/rules',
      persona,
      ledger,
    })
    await expect(page.getByTestId('overtime-management-rules')).toBeVisible()
    await expect(page.getByText('Overtime Rules', { exact: true })).toBeVisible()
    expect(settingsReads.length).toBeGreaterThan(0)
    await assertSessionContinuity({ page, diagnostics: journeyDiagnostics, persona, ledger })
    await attachLedger(testInfo, ledger)
  })

  for (const persona of ['contractManager', 'humanResource']) {
    test(`${persona} staff routes avoid privileged overtime settings reads`, async ({
      page,
      journeyDiagnostics,
    }, testInfo) => {
      test.setTimeout(4 * 60_000)
      const ledger = []
      const forbiddenSettingsReads = []
      page.on('request', (request) => {
        if (request.url().includes('/settings/overtime-approval-rules')) {
          forbiddenSettingsReads.push(`${request.method()} ${request.url()}`)
        }
      })

      await assertDeployedBuild(page)
      await loginPersonaThroughUi(page, persona)
      await visitRoute({
        page,
        diagnostics: journeyDiagnostics,
        route: '/staff/overtime-management/records',
        persona,
        ledger,
      })
      await expect(page.getByTestId('overtime-management-nav')).not.toContainText('Overtime Rules')
      await visitRoute({
        page,
        diagnostics: journeyDiagnostics,
        route: '/staff/overtime-management/rules',
        persona,
        ledger,
      })
      await expect(page).toHaveURL(/\/staff\/overtime-management\/records$/)

      const profileFixture = await resolveScheduledRoute(
        page,
        routeFor('/staff/profile/:id'),
        persona,
      )
      expect(profileFixture.status, profileFixture.reason).toBe('resolved')
      await visitRoute({
        page,
        diagnostics: journeyDiagnostics,
        route: profileFixture.route,
        persona,
        ledger,
      })
      await expect(page.getByRole('heading', { name: /staff profile/i })).toBeVisible()
      await assertSessionContinuity({ page, diagnostics: journeyDiagnostics, persona, ledger })
      expect(forbiddenSettingsReads).toEqual([])
      await attachLedger(testInfo, ledger)
    })
  }
})
