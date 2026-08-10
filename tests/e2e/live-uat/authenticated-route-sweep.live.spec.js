const fs = require('node:fs')
const { expect } = require('@playwright/test')
const { test } = require('./live-uat-fixture')
const schedule = require('./day3-route-schedule.json')
const { expandScheduledRoute, resolveScheduledRoute } = require('./live-uat-day3-support')
const {
  captureEvidenceScreenshot,
  dismissIncidentalDialogs,
  getUnexpectedRouteDiagnostics,
  gotoApprovedRoute,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  redactDiagnostic,
  waitForApplicationReady,
  waitForRouteSettled,
  writeLiveUatLedger,
} = require('./live-uat-support')

const liveEnabled =
  process.env.VMECC_LIVE_UAT === '1' && process.env.VMECC_LIVE_UAT_READ_ONLY === '1'
const authenticatedPersonas = schedule.personas.filter((persona) => persona !== 'unauthenticated')

const visibleStructure = (page) =>
  page.evaluate(() => {
    const visible = (element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0
      )
    }
    const heading = [...document.querySelectorAll('h1, h2, [role="heading"]')].find(visible)
    const action = [...document.querySelectorAll('button, a')].find((element) => {
      if (!visible(element)) return false
      const text = String(element.getAttribute('aria-label') || element.textContent || '').trim()
      return /new|create|add|apply|submit|save|manage|review|approve|upload/i.test(text)
    })
    return {
      heading: String(heading?.textContent || '')
        .trim()
        .slice(0, 120),
      primaryAction: String(action?.getAttribute('aria-label') || action?.textContent || '')
        .trim()
        .slice(0, 120),
    }
  })

const diagnosticOffsets = (diagnostics) =>
  Object.fromEntries(Object.entries(diagnostics).map(([key, values]) => [key, values.length]))

const diagnosticDelta = (diagnostics, offsets) =>
  Object.fromEntries(
    Object.entries(diagnostics).map(([key, values]) => [key, values.slice(offsets[key] || 0)]),
  )

test.describe('authenticated production-safe Day 3 route sweep', () => {
  test.skip(!liveEnabled, 'Requires explicit live read-only UAT flags')

  for (const persona of authenticatedPersonas) {
    test(`${persona} route schedule remains read-only`, async ({
      page,
      journeyDiagnostics,
    }, testInfo) => {
      test.setTimeout(10 * 60_000)
      await loginPersonaThroughUi(page, persona)
      await dismissIncidentalDialogs(page)
      expect(new URL(page.url()).pathname).not.toBe('/login')

      const assigned = schedule.routes
        .filter(
          (route) => route.primaryPersona === persona || route.secondaryPersonas.includes(persona),
        )
        .flatMap(expandScheduledRoute)
      const ledger = []
      const fixtures = []
      let serverErrorCount = 0

      for (const route of assigned) {
        const offsets = diagnosticOffsets(journeyDiagnostics)
        const fixture = await resolveScheduledRoute(page, route, persona)
        if (fixture.status !== 'resolved') {
          ledger.push({
            routeId: route.routeId,
            routePattern: route.routePattern,
            persona,
            viewport: testInfo.project.name,
            status: 'data-blocked',
            evidence: [],
            notes: fixture.reason,
          })
          continue
        }

        fixtures.push({
          routeId: route.routeId,
          routePattern: route.routePattern,
          resolvedRoute: fixture.route,
          source: fixture.source,
        })
        let evidence = []
        try {
          await gotoApprovedRoute(page, fixture.route)
          await waitForApplicationReady(page)
          await waitForRouteSettled(page)
          await dismissIncidentalDialogs(page)
          const finalPath = new URL(page.url()).pathname
          if (finalPath === '/login') {
            throw new Error('Authenticated session returned to login; persona sweep stopped')
          }
          const overflow = await measureHorizontalOverflow(page)
          const structure = await visibleStructure(page)
          const delta = diagnosticDelta(journeyDiagnostics, offsets)
          evidence = []
          if (overflow.overflow > 1) {
            evidence.push(
              await captureEvidenceScreenshot(page, testInfo, `${route.routeId}-overflow`),
            )
          } else if (
            delta.consoleErrors.length > 0 ||
            delta.clientErrors.length > 0 ||
            delta.pageErrors.length > 0 ||
            delta.failedRequests.length > 0 ||
            delta.rateLimitErrors.length > 0 ||
            delta.serverErrors.length > 0
          ) {
            evidence.push(
              await captureEvidenceScreenshot(page, testInfo, `${route.routeId}-runtime`),
            )
          }
          serverErrorCount += delta.serverErrors.length
          if (delta.rateLimitErrors.length > 0) {
            throw new Error('Production API rate limit reached; persona sweep stopped')
          }
          if (serverErrorCount >= 3) {
            throw new Error('Three production 5xx responses observed; persona sweep stopped')
          }

          const isPermissionBlocked = finalPath === '/403'
          const unexpected = getUnexpectedRouteDiagnostics(delta, isPermissionBlocked)
          const hasRuntimeFailure =
            unexpected.consoleErrors.length > 0 ||
            unexpected.clientErrors.length > 0 ||
            delta.pageErrors.length > 0 ||
            delta.serverErrors.length > 0 ||
            delta.rateLimitErrors.length > 0 ||
            delta.failedRequests.length > 0 ||
            overflow.overflow > 1
          const status = hasRuntimeFailure
            ? 'failed'
            : isPermissionBlocked
              ? 'permission-blocked'
              : route.plannedStatus === 'redirect-only'
                ? 'redirect-verified'
                : route.interactionMode === 'shell-only'
                  ? 'controlled-only'
                  : 'passed'
          ledger.push({
            routeId: route.routeId,
            routePattern: route.routePattern,
            persona,
            viewport: testInfo.project.name,
            status,
            evidence,
            notes: [
              `finalPath=${finalPath}`,
              `overflow=${overflow.overflow}`,
              `heading=${redactDiagnostic(structure.heading) || 'none'}`,
              `primaryAction=${redactDiagnostic(structure.primaryAction) || 'none'}`,
              `consoleErrors=${delta.consoleErrors.length}`,
              `consoleErrorSummary=${
                delta.consoleErrors.length
                  ? redactDiagnostic(delta.consoleErrors.slice(0, 2).join(' | ')).slice(0, 500)
                  : 'none'
              }`,
              `clientErrors=${delta.clientErrors.length}`,
              `clientErrorSummary=${
                delta.clientErrors.length
                  ? delta.clientErrors
                      .slice(0, 3)
                      .map((entry) => `${entry.status} ${entry.url}`)
                      .join(' | ')
                  : 'none'
              }`,
              `pageErrors=${delta.pageErrors.length}`,
              `failedRequests=${delta.failedRequests.length}`,
              `rateLimitErrors=${delta.rateLimitErrors.length}`,
              `serverErrors=${delta.serverErrors.length}`,
            ].join('; '),
          })
        } catch (error) {
          ledger.push({
            routeId: route.routeId,
            routePattern: route.routePattern,
            persona,
            viewport: testInfo.project.name,
            status: 'failed',
            evidence,
            notes: redactDiagnostic(error?.message || error),
          })
          if (/persona sweep stopped/i.test(String(error?.message))) break
        }
      }

      const fixturePath = testInfo.outputPath('resolved-fixtures.json')
      fs.writeFileSync(fixturePath, `${JSON.stringify({ persona, fixtures }, null, 2)}\n`, 'utf8')
      await testInfo.attach('resolved-fixtures', {
        path: fixturePath,
        contentType: 'application/json',
      })
      const ledgerPath = writeLiveUatLedger(testInfo, ledger)
      await testInfo.attach('live-uat-ledger', {
        path: ledgerPath,
        contentType: 'application/json',
      })
      expect(
        ledger.filter((entry) => entry.status === 'failed'),
        JSON.stringify(ledger, null, 2),
      ).toEqual([])
    })
  }
})
