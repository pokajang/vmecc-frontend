const { expect, test } = require('@playwright/test')
const {
  captureEvidenceScreenshot,
  collectJourneyDiagnostics,
  getUnexpectedRouteDiagnostics,
  gotoApprovedRoute,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  waitForApplicationReady,
  waitForRouteSettled,
} = require('../live-uat/live-uat-support')
const {
  createRunOwnedRegistry,
  installControlledCrudRequestGuard,
  requireControlledCrudEnvironment,
  serializeControlledCrudLedger,
} = require('../live-uat/live-crud-support')

const routes = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'profile', path: '/profile' },
  { id: 'profile-security', path: '/profile/security' },
  { id: 'messages', path: '/messages' },
  { id: 'workflow-notifications', path: '/notifications/workflow' },
]

const offsetsFor = (diagnostics) =>
  Object.fromEntries(Object.entries(diagnostics).map(([key, values]) => [key, values.length]))

const deltaFrom = (diagnostics, offsets) =>
  Object.fromEntries(
    Object.entries(diagnostics).map(([key, values]) => [key, values.slice(offsets[key] || 0)]),
  )

const waitForPrimaryRouteState = async (page, routeId) => {
  if (routeId !== 'dashboard') return
  await page.waitForFunction(
    () => {
      const text = String(document.body?.innerText || '')
      return !text.includes('Loading action queue...') && !text.includes('Loading roster stats...')
    },
    undefined,
    { timeout: 30_000 },
  )
}

test.describe('controlled live CRUD Stage 1 — shell, profile, and recovery entry points', () => {
  test('TRT can orient, navigate, and retain a clean read-only session', async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(6 * 60_000)
    const { marker } = requireControlledCrudEnvironment()
    const registry = createRunOwnedRegistry({
      marker,
      selfStatePaths: ['/onboarding/states/profile_completion_trt'],
    })
    const guard = await installControlledCrudRequestGuard(context, registry)
    const collector = collectJourneyDiagnostics(page)
    const ledger = []

    try {
      await loginPersonaThroughUi(page, 'trt')
      const onboardingPrompt = page.getByRole('button', { name: 'Remind me later', exact: true })
      if (await onboardingPrompt.isVisible().catch(() => false)) {
        await onboardingPrompt.click()
        await expect(onboardingPrompt).toBeHidden()
      }
      for (const route of routes) {
        const offsets = offsetsFor(collector.diagnostics)
        await gotoApprovedRoute(page, route.path)
        await waitForApplicationReady(page)
        await waitForRouteSettled(page)
        await waitForPrimaryRouteState(page, route.id)

        const finalPath = new URL(page.url()).pathname
        const overflow = await measureHorizontalOverflow(page)
        const delta = deltaFrom(collector.diagnostics, offsets)
        const unexpected = getUnexpectedRouteDiagnostics(delta, finalPath === '/403')
        const body = await page.locator('body').innerText()
        const screenshot = await captureEvidenceScreenshot(
          page,
          testInfo,
          `${route.id}-${testInfo.project.name}`,
        )
        ledger.push({
          ...route,
          finalPath,
          overflow: overflow.overflow,
          screenshot,
          diagnostics: {
            consoleErrors: unexpected.consoleErrors.length,
            clientErrors: unexpected.clientErrors.length,
            pageErrors: delta.pageErrors.length,
            failedRequests: delta.failedRequests.length,
            rateLimitErrors: delta.rateLimitErrors.length,
            serverErrors: delta.serverErrors.length,
          },
        })

        expect(finalPath, `${route.id}: session returned to login`).not.toBe('/login')
        expect(finalPath, `${route.id}: authorised TRT route denied`).not.toBe('/403')
        expect(overflow.overflow, `${route.id}: horizontal overflow`).toBeLessThanOrEqual(1)
        expect(body, `${route.id}: application error visible`).not.toMatch(
          /Something went wrong|Retry session check|SQLSTATE/i,
        )
        expect(delta.rateLimitErrors, `${route.id}: rate limited`).toEqual([])
        expect(delta.serverErrors, `${route.id}: server error`).toEqual([])
        expect(delta.pageErrors, `${route.id}: page error`).toEqual([])
        expect(delta.failedRequests, `${route.id}: failed request`).toEqual([])
        expect(unexpected.consoleErrors, `${route.id}: console error`).toEqual([])
        expect(unexpected.clientErrors, `${route.id}: client error`).toEqual([])
      }
      expect(guard.ledger).toEqual([])
    } finally {
      await testInfo.attach('stage1-route-ledger', {
        body: Buffer.from(JSON.stringify(ledger, null, 2)),
        contentType: 'application/json',
      })
      await testInfo.attach('controlled-crud-guard-ledger', {
        body: Buffer.from(serializeControlledCrudLedger({ registry, guardLedger: guard.ledger })),
        contentType: 'application/json',
      })
      collector.dispose()
      await guard.dispose()
    }
  })
})
