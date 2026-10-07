const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')

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
const output = { status: 'failed', consoleErrors: [], networkFailures: [] }

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 125 })
  const context = await browser.newContext({ viewport: { width: 320, height: 568 } })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') output.consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname
    if (pathname.startsWith('/api/') && response.status() >= 400) {
      output.networkFailures.push({ pathname, status: response.status() })
    }
  })

  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    const reminder = page.getByRole('button', { name: 'Remind me later', exact: true })
    if (await reminder.isVisible().catch(() => false)) await reminder.click()
    await page.goto('http://localhost:3000/payroll/claims/CLM-2026-002', {
      waitUntil: 'domcontentloaded',
    })
    await page.getByText('Payout breakdown', { exact: true }).waitFor({ timeout: 30000 })
    const contributionLabel = page.getByText('Employee contributions', { exact: true })
    await contributionLabel.scrollIntoViewIfNeeded()
    output.layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    output.contributionLabel = await contributionLabel.boundingBox()
    output.rateModeDisplay = await page
      .getByText('Rate mode', { exact: true })
      .locator('..')
      .evaluate((node) => getComputedStyle(node).display)
    await page.screenshot({
      path: path.join(__dirname, 'BETA-20260903-180600-personal-workflows-reaudit-salary-final-mobile-320.png'),
      fullPage: true,
    })
    if (output.layout.clientWidth !== output.layout.scrollWidth) throw new Error('Horizontal overflow')
    if (!output.contributionLabel || output.contributionLabel.width < 90) {
      throw new Error('Contribution label column remains over-compressed')
    }
    if (output.rateModeDisplay !== 'grid') throw new Error('Rate mode is not stacked')
    if (output.consoleErrors.length || output.networkFailures.length) {
      throw new Error('Technical errors observed')
    }
    output.status = 'passed'
  } catch (error) {
    output.error = error.message
  } finally {
    fs.writeFileSync(
      path.join(__dirname, 'BETA-20260903-180600-personal-workflows-reaudit-visual-confirm.json'),
      JSON.stringify(output, null, 2),
    )
    await context.close()
    await browser.close()
  }
  process.exitCode = output.status === 'passed' ? 0 : 1
})()
