const { expect } = require('@playwright/test')
const { test } = require('./live-uat-fixture')
const {
  captureEvidenceScreenshot,
  gotoApprovedRoute,
  measureHorizontalOverflow,
  waitForApplicationReady,
  writeLiveUatLedger,
} = require('./live-uat-support')

const liveEnabled =
  process.env.VMECC_LIVE_UAT === '1' && process.env.VMECC_LIVE_UAT_READ_ONLY === '1'

test.describe('anonymous production-safe live UAT baseline', () => {
  test.skip(!liveEnabled, 'Requires explicit live read-only UAT flags')

  test('login is reachable and fits the viewport', async ({
    page,
    journeyDiagnostics,
  }, testInfo) => {
    await gotoApprovedRoute(page, '/login')
    await waitForApplicationReady(page)

    await expect(page.getByText('Sign in to continue', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()

    const overflow = await measureHorizontalOverflow(page)
    expect(overflow.overflow).toBeLessThanOrEqual(1)
    expect(journeyDiagnostics.consoleErrors).toEqual([])
    expect(journeyDiagnostics.pageErrors).toEqual([])
    expect(journeyDiagnostics.serverErrors).toEqual([])

    const screenshot = await captureEvidenceScreenshot(page, testInfo, 'login-baseline')
    const ledgerPath = writeLiveUatLedger(testInfo, [
      {
        routeId: 'LIVE-UAT-PUBLIC-LOGIN',
        routePattern: '/login',
        persona: 'unauthenticated',
        viewport: testInfo.project.name,
        status: 'passed',
        evidence: [screenshot],
        notes: `overflow=${overflow.overflow}`,
      },
    ])
    await testInfo.attach('live-uat-ledger', {
      path: ledgerPath,
      contentType: 'application/json',
    })
  })

  test('protected inspection route redirects anonymously without mutation', async ({
    page,
    journeyDiagnostics,
  }, testInfo) => {
    await gotoApprovedRoute(page, '/inspection')
    await page.waitForURL(
      (url) => url.origin === 'https://vmecc.amiosh.com' && url.pathname === '/login',
    )
    await waitForApplicationReady(page)

    await expect(page.getByLabel('Email address')).toBeVisible()
    expect(journeyDiagnostics.pageErrors).toEqual([])
    expect(journeyDiagnostics.serverErrors).toEqual([])

    const ledgerPath = writeLiveUatLedger(testInfo, [
      {
        routeId: 'LIVE-UAT-INSPECTION-ANONYMOUS',
        routePattern: '/inspection',
        persona: 'unauthenticated',
        viewport: testInfo.project.name,
        status: 'redirect-verified',
        evidence: [],
        notes: 'Redirected to /login',
      },
    ])
    await testInfo.attach('live-uat-ledger', {
      path: ledgerPath,
      contentType: 'application/json',
    })
  })
})
