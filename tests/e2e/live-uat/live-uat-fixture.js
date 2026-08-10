const { test: base } = require('@playwright/test')
const {
  assertNoReadOnlyViolations,
  collectJourneyDiagnostics,
  installReadOnlyRequestGuard,
} = require('./live-uat-support')

const test = base.extend({
  readOnlyGuard: [
    async ({ context }, use, testInfo) => {
      const guard = await installReadOnlyRequestGuard(context)
      await use(guard)
      await guard.dispose()
      if (guard.violations.length > 0) {
        await testInfo.attach('read-only-guard-violations', {
          body: Buffer.from(JSON.stringify(guard.violations, null, 2)),
          contentType: 'application/json',
        })
      }
      assertNoReadOnlyViolations(guard.violations)
    },
    { auto: true },
  ],
  journeyDiagnostics: [
    async ({ page }, use, testInfo) => {
      const collector = collectJourneyDiagnostics(page)
      await use(collector.diagnostics)
      collector.dispose()
      const hasDiagnostics = Object.values(collector.diagnostics).some(
        (entries) => entries.length > 0,
      )
      if (hasDiagnostics) {
        await testInfo.attach('journey-diagnostics', {
          body: Buffer.from(JSON.stringify(collector.diagnostics, null, 2)),
          contentType: 'application/json',
        })
      }
    },
    { auto: true },
  ],
})

module.exports = { test }
