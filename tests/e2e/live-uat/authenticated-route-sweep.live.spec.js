const fs = require('node:fs')
const { expect } = require('@playwright/test')
const { test } = require('./live-uat-fixture')
const schedule = require('./day3-route-schedule.json')
const { expandScheduledRoute, resolveScheduledRoute } = require('./live-uat-day3-support')
const {
  dismissIncidentalDialogs,
  gotoApprovedRoute,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  redactDiagnostic,
  waitForApplicationReady,
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
  test.describe.configure({ mode: 'serial' })

  for (const persona of authenticatedPersonas) {
    test(`${persona} route schedule remains read-only`, async ({
      page,
      journeyDiagnostics,
    }, testInfo) => {
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
        try {
          await gotoApprovedRoute(page, fixture.route)
          await waitForApplicationReady(page)
          await dismissIncidentalDialogs(page)
          const finalPath = new URL(page.url()).pathname
          if (finalPath === '/login') {
            throw new Error('Authenticated session returned to login; persona sweep stopped')
          }
          const overflow = await measureHorizontalOverflow(page)
          const structure = await visibleStructure(page)
          const delta = diagnosticDelta(journeyDiagnostics, offsets)
          serverErrorCount += delta.serverErrors.length
          if (serverErrorCount >= 3) {
            throw new Error('Three production 5xx responses observed; persona sweep stopped')
          }

          const hasRuntimeFailure =
            delta.pageErrors.length > 0 ||
            delta.serverErrors.length > 0 ||
            delta.failedRequests.length > 0 ||
            overflow.overflow > 1
          const isPermissionBlocked = finalPath === '/403'
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
            evidence: [],
            notes: [
              `finalPath=${finalPath}`,
              `overflow=${overflow.overflow}`,
              `heading=${redactDiagnostic(structure.heading) || 'none'}`,
              `primaryAction=${redactDiagnostic(structure.primaryAction) || 'none'}`,
              `consoleErrors=${delta.consoleErrors.length}`,
              `pageErrors=${delta.pageErrors.length}`,
              `failedRequests=${delta.failedRequests.length}`,
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
            evidence: [],
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
