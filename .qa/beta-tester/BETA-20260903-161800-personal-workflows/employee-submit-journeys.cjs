const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')

const runId = 'BETA-20260903-161800-personal-workflows'
const artifactDir = __dirname
const source = fs.readFileSync(path.resolve(process.cwd(), 'tests/e2e/employee-application-workflow-parity.spec.js'), 'utf8')
const email = process.env.VMECC_APPLICATION_UAT_EMAIL || source.match(/VMECC_APPLICATION_UAT_EMAIL \|\| '([^']+)'/)?.[1]
const password = process.env.VMECC_SMOKE_RBAC_PASSWORD || source.match(/VMECC_SMOKE_RBAC_PASSWORD \|\| '([^']+)'/)?.[1]
const baseUrl = 'http://localhost:3000'
const results = []
const created = []
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const addResult = (journey, status, detail = {}) => results.push({ journey, status, ...detail })
const shot = (page, name) => page.screenshot({ path: path.join(artifactDir, runId + '-' + name + '.png'), fullPage: true })
const dismiss = async (page) => {
  const control = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (await control.isVisible().catch(() => false)) { await control.click(); await control.waitFor({ state: 'hidden' }) }
}
const submitted = async (response, type) => {
  const payload = await response.json().catch(() => ({}))
  const record = payload?.data || payload
  const id = record?.display_id || record?.displayId || record?.id
  assert(id, type + ' response did not include a record identifier')
  created.push({ type, id: String(id), internalId: record?.id || null })
  return String(id)
}
const reopen = async (page, route, id, testId) => {
  await page.goto(baseUrl + route, { waitUntil: 'domcontentloaded' })
  await dismiss(page)
  const search = page.locator('input[type="search"]').first()
  if (await search.isVisible().catch(() => false)) await search.fill(id)
  const visibleId = page.getByText(id, { exact: false }).first()
  await visibleId.waitFor({ state: 'visible', timeout: 30000 })
  await visibleId.click()
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 30000 })
}

;(async () => {
  assert(email && password, 'Local synthetic test credentials are unavailable')
  const browser = await chromium.launch({ headless: false, slowMo: 125 })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const consoleErrors = []
  const failedResponses = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('/auth/session')) failedResponses.push({ status: response.status(), path: new URL(response.url()).pathname })
  })
  try {
    await page.goto(baseUrl + '/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    await dismiss(page)
    addResult('authentication', 'passed')

    try {
      await page.goto(baseUrl + '/leave/new', { waitUntil: 'domcontentloaded' }); await dismiss(page)
      await page.getByTestId('leave-type-annual-leave').click()
      await page.getByRole('button', { name: 'Submit request', exact: true }).click()
      await page.locator('#leave-start-date[aria-invalid="true"]').waitFor()
      addResult('leave required-field recovery', 'passed')
      await page.locator('#leave-start-date').fill('2026-09-10')
      await page.locator('#leave-end-date').fill('2026-09-10')
      await page.locator('#leave-reason').fill(runId + ' synthetic leave request')
      await page.getByRole('button', { name: 'Submit request', exact: true }).click()
      await page.getByText('Confirm leave request', { exact: true }).waitFor(); await shot(page, 'leave-confirm-mobile-390')
      const responsePromise = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/leave' && r.request().method() === 'POST')
      await page.getByRole('button', { name: 'Confirm submission', exact: true }).click()
      const response = await responsePromise; assert([200, 201].includes(response.status()), 'Leave submission returned ' + response.status())
      const id = await submitted(response, 'leave'); await page.waitForURL(/\/leave$/)
      await reopen(page, '/leave', id, 'leave-detail'); await shot(page, 'leave-detail-mobile-390')
      addResult('leave submit, persist, reopen', 'passed', { recordId: id })
    } catch (error) { await shot(page, 'leave-failure').catch(() => {}); addResult('leave submit, persist, reopen', 'failed', { message: error.message }) }

    try {
      await page.goto(baseUrl + '/overtime/new', { waitUntil: 'domcontentloaded' }); await dismiss(page)
      await page.getByTestId('overtime-type-weekday').click()
      await page.getByRole('button', { name: 'Submit request', exact: true }).click()
      await page.locator('#overtime-claim-date[aria-invalid="true"]').waitFor()
      addResult('overtime required-field recovery', 'passed')
      await page.locator('#overtime-claim-date').fill('2026-09-03')
      await page.locator('#overtime-start-time').fill('18:00')
      await page.locator('#overtime-end-time').fill('20:00')
      await page.locator('#overtime-reason').fill(runId + ' synthetic overtime request')
      await page.getByRole('button', { name: 'Submit request', exact: true }).click()
      await page.getByText('Confirm overtime claim', { exact: true }).waitFor(); await shot(page, 'overtime-confirm-mobile-390')
      const responsePromise = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/overtime' && r.request().method() === 'POST')
      await page.getByRole('button', { name: 'Confirm submission', exact: true }).click()
      const response = await responsePromise; assert([200, 201].includes(response.status()), 'Overtime submission returned ' + response.status())
      const id = await submitted(response, 'overtime'); await page.waitForURL(/\/overtime$/)
      await reopen(page, '/overtime', id, 'overtime-detail'); await shot(page, 'overtime-detail-mobile-390')
      addResult('overtime submit, persist, reopen', 'passed', { recordId: id })
    } catch (error) { await shot(page, 'overtime-failure').catch(() => {}); addResult('overtime submit, persist, reopen', 'failed', { message: error.message }) }

    try {
      await page.goto(baseUrl + '/payroll/claims/new', { waitUntil: 'domcontentloaded' }); await dismiss(page)
      await page.getByTestId('claim-type-salary').click()
      await page.locator('[data-testid^="claim-period-"]:not([disabled])').first().click()
      await page.getByTestId('payroll-claim-type-continue').click()
      await page.getByTestId('payroll-claim-form').waitFor()
      await page.locator('#salary-payout-confirmed').check()
      await page.getByRole('button', { name: 'Submit request', exact: true }).click()
      await page.getByText('Submit Salary Payout Confirmation', { exact: true }).waitFor()
      await page.locator('#salary-submit-declaration').check(); await shot(page, 'salary-confirm-mobile-390')
      const responsePromise = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/payroll/claims' && r.request().method() === 'POST')
      await page.getByRole('button', { name: 'Confirm Submit', exact: true }).click()
      const response = await responsePromise; assert([200, 201].includes(response.status()), 'Salary submission returned ' + response.status())
      const id = await submitted(response, 'salary claim'); await page.waitForURL(/\/payroll(?:\/claims)?$/)
      await reopen(page, '/payroll', id, 'payroll-claim-detail'); await shot(page, 'salary-detail-mobile-390')
      addResult('salary submit, persist, reopen', 'passed', { recordId: id })
    } catch (error) { await shot(page, 'salary-failure').catch(() => {}); addResult('salary submit, persist, reopen', 'failed', { message: error.message }) }

    addResult('console errors', consoleErrors.length === 0 ? 'passed' : 'failed', { count: consoleErrors.length })
    addResult('unexpected failed responses', failedResponses.length === 0 ? 'passed' : 'failed', { responses: failedResponses })
  } catch (error) { await shot(page, 'run-failure').catch(() => {}); addResult('run', 'blocked', { message: error.message }) }
  finally {
    fs.writeFileSync(path.join(artifactDir, runId + '-results.json'), JSON.stringify({ runId, results, created }, null, 2))
    await context.close(); await browser.close()
  }
  process.exitCode = results.some((item) => ['failed', 'blocked'].includes(item.status)) ? 1 : 0
})()
