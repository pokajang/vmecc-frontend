const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')

const runId = 'BETA-20260903-173420-personal-workflows'
const claimId = process.env.VMECC_PERSONAL_UAT_CLAIM_ID || 'CLM-2026-001'
const artifactDir = __dirname
const source = fs.readFileSync(
  path.resolve(process.cwd(), 'tests/e2e/employee-application-workflow-parity.spec.js'),
  'utf8',
)
const email =
  process.env.VMECC_APPLICATION_UAT_EMAIL ||
  source.match(/VMECC_APPLICATION_UAT_EMAIL \|\| '([^']+)'/)?.[1]
const password =
  process.env.VMECC_SMOKE_RBAC_PASSWORD ||
  source.match(/VMECC_SMOKE_RBAC_PASSWORD \|\| '([^']+)'/)?.[1]
const baseUrl = 'http://localhost:3000'
const evidence = { claimId, checkpoints: [], network: [], consoleErrors: [] }

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const dismissObstruction = async (page) => {
  const control = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (await control.isVisible().catch(() => false)) await control.click()
}
const waitForClaimDetail = async (page) => {
  await page.waitForURL((url) => url.pathname === `/payroll/claims/${claimId}`, {
    timeout: 30000,
  })
  await page.getByRole('heading', { name: 'Salary Claim', exact: true }).waitFor({
    state: 'visible',
    timeout: 30000,
  })
  assert(
    (await page.getByText('Claim record not found.', { exact: true }).count()) === 0,
    'Claim remained in the not-found state after records hydrated',
  )
}

;(async () => {
  assert(email && password, 'Local synthetic test credentials are unavailable')
  const browser = await chromium.launch({ headless: false, slowMo: 125 })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/api/')) {
      evidence.network.push({
        method: response.request().method(),
        path: url.pathname,
        status: response.status(),
      })
    }
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    await dismissObstruction(page)

    await page.goto(`${baseUrl}/payroll`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[placeholder="Search claims"]:visible').first().fill(claimId)
    await page
      .getByRole('button', { name: `Open claim ${claimId} summary`, exact: true })
      .click()
    await waitForClaimDetail(page)
    evidence.checkpoints.push({ name: 'mobile reopen', status: 'passed', url: page.url() })
    await page.screenshot({
      path: path.join(artifactDir, `${runId}-salary-recovered-mobile-390.png`),
      fullPage: true,
    })

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`${baseUrl}/payroll`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[placeholder="Search claims"]:visible').first().fill(claimId)
    await page.getByRole('button', { name: `Open claim ${claimId}`, exact: true }).click()
    await waitForClaimDetail(page)
    evidence.checkpoints.push({ name: 'desktop reopen', status: 'passed', url: page.url() })
    await page.screenshot({
      path: path.join(artifactDir, `${runId}-salary-recovered-desktop-1440.png`),
      fullPage: true,
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).last().click()
    const cancelResponsePromise = page.waitForResponse((response) => {
      const pathname = new URL(response.url()).pathname
      return (
        pathname.startsWith('/api/payroll/claims/') &&
        pathname.endsWith('/cancel') &&
        response.request().method() === 'POST'
      )
    })
    await page.getByRole('button', { name: 'Cancel claim', exact: true }).click()
    const cancelResponse = await cancelResponsePromise
    assert([200, 204].includes(cancelResponse.status()), `Cancellation returned ${cancelResponse.status()}`)
    await page.getByText('Cancelled', { exact: true }).first().waitFor({ state: 'visible' })
    evidence.checkpoints.push({ name: 'UI cleanup', status: 'passed' })
    assert(evidence.consoleErrors.length === 0, 'Console errors were observed')
    assert(
      evidence.network.every((entry) => entry.status < 400),
      'An unexpected API failure was observed',
    )
    evidence.status = 'passed'
  } catch (error) {
    evidence.status = 'failed'
    evidence.error = error.message
    await page
      .screenshot({ path: path.join(artifactDir, `${runId}-salary-recovery-failure.png`), fullPage: true })
      .catch(() => {})
  } finally {
    fs.writeFileSync(
      path.join(artifactDir, `${runId}-salary-recovery.json`),
      JSON.stringify(evidence, null, 2),
    )
    await context.close()
    await browser.close()
  }

  process.exitCode = evidence.status === 'passed' ? 0 : 1
})()
