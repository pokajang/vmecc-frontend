const fs = require('fs')
const path = require('path')
const { chromium } = require('@playwright/test')
const runId = 'BETA-20260903-161800-personal-workflows'
const artifactDir = __dirname
const resultPath = path.join(artifactDir, runId + '-results.json')
const prior = JSON.parse(fs.readFileSync(resultPath, 'utf8'))
const source = fs.readFileSync(path.resolve(process.cwd(), 'tests/e2e/employee-application-workflow-parity.spec.js'), 'utf8')
const email = process.env.VMECC_APPLICATION_UAT_EMAIL || source.match(/VMECC_APPLICATION_UAT_EMAIL \|\| '([^']+)'/)?.[1]
const password = process.env.VMECC_SMOKE_RBAC_PASSWORD || source.match(/VMECC_SMOKE_RBAC_PASSWORD \|\| '([^']+)'/)?.[1]
const baseUrl = 'http://localhost:3000'
const cleanup = []
const dismiss = async (page) => { const b = page.getByRole('button', { name: 'Remind me later', exact: true }); if (await b.isVisible().catch(() => false)) { await b.click(); await b.waitFor({ state: 'hidden' }) } }
const cancelRecord = async (page, type, id) => {
  const route = type === 'leave' ? '/leave/' + encodeURIComponent(id) : '/overtime/' + encodeURIComponent(id)
  await page.goto(baseUrl + route, { waitUntil: 'domcontentloaded' }); await dismiss(page)
  const detailId = type === 'leave' ? 'leave-detail' : 'overtime-detail'
  await page.getByTestId(detailId).waitFor({ state: 'visible', timeout: 30000 })
  await page.getByRole('button', { name: 'More actions', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().click()
  const confirmName = type === 'leave' ? 'Cancel leave' : 'Cancel Claim'
  const responsePath = type === 'leave' ? '/api/leave/' : '/api/overtime/'
  const responsePromise = page.waitForResponse((r) => {
    const pathname = new URL(r.url()).pathname
    return pathname.startsWith(responsePath) && pathname.endsWith('/cancel') && r.request().method() === 'POST'
  })
  await page.getByRole('button', { name: confirmName, exact: true }).click()
  const response = await responsePromise
  if (![200, 204].includes(response.status())) throw new Error(type + ' cancellation returned ' + response.status())
  cleanup.push({ type, id, result: 'cancelled through UI' })
}
;(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 125 })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  try {
    await page.goto(baseUrl + '/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(email); await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }); await dismiss(page)
    for (const record of prior.created) {
      if (record.type === 'leave' || record.type === 'overtime') {
        try { await cancelRecord(page, record.type, record.id) }
        catch (error) { cleanup.push({ type: record.type, id: record.id, result: 'cleanup failed', message: error.message }) }
      }
    }
  } catch (error) { cleanup.push({ type: 'run', result: 'cleanup blocked', message: error.message }) }
  finally { fs.writeFileSync(path.join(artifactDir, runId + '-cleanup.json'), JSON.stringify(cleanup, null, 2)); await context.close(); await browser.close() }
  process.exitCode = cleanup.some((item) => item.result.includes('failed') || item.result.includes('blocked')) ? 1 : 0
})()
