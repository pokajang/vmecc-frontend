const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')

const runId = 'BETA-20260903-180600-personal-workflows-reaudit'
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
const results = []
const networkFailures = []
const consoleErrors = []

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const shot = (page, name) =>
  page.screenshot({ path: path.join(artifactDir, `${runId}-${name}.png`), fullPage: true })
const dismissObstruction = async (page) => {
  const control = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (await control.isVisible().catch(() => false)) {
    await control.click()
    await control.waitFor({ state: 'hidden' })
  }
}
const verifyFrame = async (page, expectedChip) => {
  const header = page.locator('.module-page-header--mobile-context:visible').first()
  await header.waitFor({ state: 'visible', timeout: 30000 })
  assert((await header.textContent()).includes(expectedChip), `Missing ${expectedChip} context chip`)
  const back = page.getByRole('button', { name: 'Back', exact: true })
  await back.waitFor({ state: 'visible', timeout: 30000 })
  const box = await back.boundingBox()
  assert(box && box.x >= 0 && box.x + box.width <= page.viewportSize().width, 'Back is clipped')
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    elements: Array.from(document.querySelectorAll('body *'))
      .map((node) => {
        const rect = node.getBoundingClientRect()
        return {
          tag: node.tagName,
          className: String(node.className || '').slice(0, 160),
          left: Math.round(rect.left * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
        }
      })
      .filter((item) => item.left < -0.5 || item.right > window.innerWidth + 0.5)
      .slice(0, 20),
  }))
  assert(
    overflow.scrollWidth === overflow.clientWidth,
    `Page has horizontal overflow: ${JSON.stringify(overflow)}`,
  )
}

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 125 })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname
    if (pathname.startsWith('/api/') && response.status() >= 400) {
      networkFailures.push({ method: response.request().method(), pathname, status: response.status() })
    }
  })

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    await dismissObstruction(page)
    results.push({ item: 'authentication', status: 'passed', critical: true })

    for (const viewport of [
      { key: 'mobile-320', width: 320, height: 568 },
      { key: 'mobile-390', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      await page.goto(`${baseUrl}/leave/LV-AL-2026-004`, { waitUntil: 'domcontentloaded' })
      await dismissObstruction(page)
      await page.getByRole('heading', { name: 'Annual Leave', exact: true }).waitFor()
      await verifyFrame(page, 'Leave')
      assert((await page.getByText('Leave record not found.', { exact: true }).count()) === 0, 'False Leave missing state')
      assert((await page.getByRole('listitem', { name: /pending$/ }).count()) > 0, 'Leave pending gates lack state')
      await shot(page, `leave-detail-${viewport.key}`)

      await page.goto(`${baseUrl}/overtime/OT-2026-006`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Weekday Overtime', exact: true }).waitFor()
      await verifyFrame(page, 'Overtime')
      assert((await page.getByText('Overtime record not found.', { exact: true }).count()) === 0, 'False Overtime missing state')
      assert((await page.getByRole('listitem', { name: /pending$/ }).count()) > 0, 'Overtime pending gates lack state')
      await shot(page, `overtime-detail-${viewport.key}`)

      await page.goto(`${baseUrl}/payroll/claims/CLM-2026-002`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Salary Claim', exact: true }).waitFor()
      await page.getByText('Payout breakdown', { exact: true }).waitFor()
      await verifyFrame(page, 'Payroll')
      assert((await page.getByText('Salary Claim (View Only)', { exact: true }).count()) === 0, 'Old Salary title remains')
      assert((await page.getByText('Adjustment Items', { exact: true }).count()) === 0, 'Duplicate adjustment summary remains')
      const rateModeRow = page.getByText('Rate mode', { exact: true }).locator('..')
      assert((await rateModeRow.evaluate((node) => getComputedStyle(node).display)) === 'grid', 'Rate mode is not stacked')
      await shot(page, `salary-detail-${viewport.key}`)
      results.push({ item: `detail parity ${viewport.key}`, status: 'passed', critical: true })
    }

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`${baseUrl}/payroll/claims/CLM-2026-002`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Salary Claim', exact: true }).waitFor()
    await page.getByText('Payout breakdown', { exact: true }).waitFor()
    assert((await page.evaluate(() => document.documentElement.scrollWidth)) === 1440, 'Desktop overflow')
    await shot(page, 'salary-detail-desktop-1440')
    results.push({ item: 'salary detail desktop', status: 'passed', critical: true })

    assert(networkFailures.length === 0, 'Unexpected API failures observed')
    assert(consoleErrors.length === 0, 'Console errors observed')
    results.push({ item: 'network and console health', status: 'passed', critical: true })
  } catch (error) {
    results.push({ item: 'run', status: 'failed', critical: true, error: error.message })
    await shot(page, 'failure').catch(() => {})
  } finally {
    fs.writeFileSync(
      path.join(artifactDir, `${runId}-results.json`),
      JSON.stringify({ runId, results, networkFailures, consoleErrors }, null, 2),
    )
    await context.close()
    await browser.close()
  }

  process.exitCode = results.some((item) => item.status === 'failed') ? 1 : 0
})()
