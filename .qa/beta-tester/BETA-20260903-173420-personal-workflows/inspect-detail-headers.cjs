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
const baseUrl = 'http://localhost:3000'
const outputPath = path.join(__dirname, 'BETA-20260903-175000-detail-header-inspection.json')

;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const output = []
  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    const reminder = page.getByRole('button', { name: 'Remind me later', exact: true })
    if (await reminder.isVisible().catch(() => false)) await reminder.click()

    for (const [name, route, testId] of [
      ['leave', '/leave/LV-AL-2026-004', 'leave-detail'],
      ['overtime', '/overtime/OT-2026-006', 'overtime-detail'],
      ['salary', '/payroll/claims/CLM-2026-002', 'payroll-claim-detail'],
    ]) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
      await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 30000 })
      const back = page.getByRole('button', { name: 'Back', exact: true })
      await back.waitFor({ state: 'visible', timeout: 30000 })
      output.push({
        name,
        visible: await back.isVisible(),
        box: await back.boundingBox(),
        viewport: page.viewportSize(),
        scrollX: await page.evaluate(() => window.scrollX),
        documentWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      })
    }
  } catch (error) {
    output.push({ error: error.message })
  } finally {
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
    await context.close()
    await browser.close()
  }
})()
