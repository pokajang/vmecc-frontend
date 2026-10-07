const { chromium } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const runId = 'BETA-20260904-174500-desktop-suite'
const artifactRoot = path.resolve(process.cwd(), '.qa', 'beta-tester', runId)
const screenshotRoot = path.join(artifactRoot, 'screenshots-attempt2')
const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const password = process.env.VMECC_SMOKE_RBAC_PASSWORD

if (!password) throw new Error('VMECC_SMOKE_RBAC_PASSWORD is required')
fs.mkdirSync(screenshotRoot, { recursive: true })

const manifest = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'tests/e2e/module-coverage.manifest.json'), 'utf8'),
)
const catalogRoutes = [
  ...new Set(
    manifest.modules
      .map((module) => String(module.route || '').trim())
      .filter((route) => route && !route.includes(':')),
  ),
]

const viewports = [
  { key: 'desktop-1024', width: 1024, height: 768 },
  { key: 'desktop-1366', width: 1366, height: 768 },
  { key: 'desktop-1440', width: 1440, height: 900 },
  { key: 'desktop-1920', width: 1920, height: 1080 },
]

const personas = [
  ['system-administrator', 'codex.smoke.sysadmin@vmecc.local', ['/dashboard', '/admin/users', '/settings']],
  ['contract-manager', 'codex.smoke.contract-manager@vmecc.local', ['/dashboard', '/team/details', '/inspection']],
  ['human-resource', 'codex.smoke.human-resource@vmecc.local', ['/dashboard', '/staff/leave-management/leaves', '/staff/salary-claims/claims']],
  ['finance', 'codex.smoke.finance@vmecc.local', ['/dashboard', '/staff/salary-claims/claims']],
  ['admin', 'codex.smoke.admin-role@vmecc.local', ['/dashboard', '/team/details', '/roster/overview']],
  ['incident-commander', 'codex.smoke.incident-commander@vmecc.local', ['/dashboard', '/team/details', '/inspection']],
  ['assistant-incident-commander', 'codex.smoke.assistant-incident-commander@vmecc.local', ['/dashboard', '/team/details', '/inspection']],
  ['tactical-response-team', 'codex.smoke.tactical-response-team@vmecc.local', ['/dashboard', '/leave', '/inspection']],
  ['client-contract-manager', 'codex.smoke.client-contract-manager@vmecc.local', ['/dashboard', '/messages', '/team/details']],
  ['representative', 'codex.smoke.representative@vmecc.local', ['/dashboard', '/messages', '/team/details']],
]

const searchRoutes = [
  '/admin/users',
  '/admin/audit',
  '/admin/ai-helper-knowledge',
  '/staff/details',
  '/staff/leave-management/leaves',
  '/staff/leave-management/overtime',
  '/staff/leave-management/set-leaves',
  '/staff/leave-management/set-holidays',
  '/staff/salary-claims/claims',
  '/staff/salary-claims/salary',
  '/staff/salary-claims/set-salary',
  '/payroll/claims',
  '/leave',
  '/overtime',
  '/inspection',
  '/report/inspection',
  '/report/erco',
  '/report/drill',
  '/report/fitness-test',
  '/report/er-assessment',
  '/roster/overview',
  '/settings/role-permissions',
  '/messages',
]

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const slug = (value) => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
const visible = (locator) => locator.isVisible().catch(() => false)

const dismissObstructions = async (page, recoveryLedger, intent) => {
  for (const label of ['Remind me later', 'Not now', 'Skip']) {
    const action = page.getByRole('button', { name: label, exact: true }).first()
    if (!(await visible(action))) continue
    const dialog = action.locator('xpath=ancestor::*[@role="dialog"][1]')
    const dialogName = (await dialog.getAttribute('aria-label').catch(() => '')) || 'optional prompt'
    await action.click()
    await action.waitFor({ state: 'hidden', timeout: 5000 })
    recoveryLedger.push({ intent, obstruction: dialogName, action: label, classification: 'micro-recovery' })
  }
}

const waitForAppReady = async (page) => {
  await page.locator('#root').waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForFunction(
    () => {
      const bodyText = document.body?.innerText || ''
      const hasSettledShell = Boolean(
        document.querySelector('.wrapper, .header, main, [data-testid="dashboard-overview"]'),
      )
      return !bodyText.includes('Restoring session...') && hasSettledShell
    },
    undefined,
    { timeout: 30000 },
  )
}

const login = async (page, email, recoveryLedger) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email address').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 })
  await waitForAppReady(page)
  await dismissObstructions(page, recoveryLedger, 'complete sign in')
}

const inspectPage = () => {
  const isVisible = (element) => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  }
  const geometry = (element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
      left: Math.round(rect.left * 10) / 10,
      top: Math.round(rect.top * 10) / 10,
      borderRadius: style.borderRadius,
      fontSize: style.fontSize,
    }
  }
  const searchSelector = 'input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]'
  const searches = [...document.querySelectorAll(searchSelector)].filter(isVisible)
  const filters = [...document.querySelectorAll('select')].filter(isVisible)
  const tables = [...document.querySelectorAll('table')].filter(isVisible)
  const headings = [...document.querySelectorAll('h1, h2, [class*="page-title"]')].filter(isVisible)
  const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
  return {
    path: location.pathname,
    title: headings[0]?.textContent?.replace(/\s+/g, ' ').trim() || '',
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: pageWidth,
    overflow: Math.max(0, pageWidth - document.documentElement.clientWidth),
    searchCount: searches.length,
    searches: searches.map((element) => ({
      label: element.getAttribute('aria-label') || '',
      placeholder: element.getAttribute('placeholder') || '',
      className: element.className,
      ...geometry(element),
    })),
    visibleSelectCount: filters.length,
    visibleTableCount: tables.length,
    visibleTableRows: tables.reduce((count, table) => count + table.querySelectorAll('tbody tr').length, 0),
    visibleButtonCount: [...document.querySelectorAll('button')].filter(isVisible).length,
    visibleDialogCount: [...document.querySelectorAll('[role="dialog"]')].filter(isVisible).length,
  }
}

const auditRoute = async ({ page, route, viewport, screenshots, diagnostics, recoveryLedger, prefix }) => {
  const offsets = {
    console: diagnostics.console.length,
    page: diagnostics.page.length,
    response: diagnostics.response.length,
  }
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await waitForAppReady(page)
  await dismissObstructions(page, recoveryLedger, `open ${route}`)
  await sleep(450)
  const metrics = await page.evaluate(inspectPage)
  const screenshot = `${prefix}-${viewport.key}-${slug(route || 'root')}.png`
  await page.screenshot({ path: path.join(screenshotRoot, screenshot), fullPage: true })
  screenshots.push(screenshot)
  return {
    route,
    finalPath: new URL(page.url()).pathname,
    viewport: viewport.key,
    metrics,
    redirectedToLogin: /\/login(?:\/|$)/.test(new URL(page.url()).pathname),
    consoleErrors: diagnostics.console.slice(offsets.console),
    pageErrors: diagnostics.page.slice(offsets.page),
    serverErrors: diagnostics.response.slice(offsets.response),
    screenshot,
  }
}

const attachDiagnostics = (page) => {
  const diagnostics = { console: [], page: [], response: [] }
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.console.push({ url: page.url(), message: message.text() })
  })
  page.on('pageerror', (error) => diagnostics.page.push({ url: page.url(), message: error.message }))
  page.on('response', (response) => {
    if (response.status() >= 500) diagnostics.response.push({ page: page.url(), url: response.url(), status: response.status() })
  })
  return diagnostics
}

const run = async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome', slowMo: 100 })
  const catalogLedger = []
  const roleLedger = []
  const searchLedger = []
  const recoveryLedger = []
  const screenshots = []

  try {
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const adminPage = await adminContext.newPage()
    const adminDiagnostics = attachDiagnostics(adminPage)
    await login(adminPage, personas[0][1], recoveryLedger)

    for (const viewport of viewports) {
      for (const route of catalogRoutes) {
        catalogLedger.push(
          await auditRoute({
            page: adminPage,
            route,
            viewport,
            screenshots,
            diagnostics: adminDiagnostics,
            recoveryLedger,
            prefix: 'catalog',
          }),
        )
      }
    }

    await adminPage.setViewportSize({ width: 1440, height: 900 })
    for (const route of searchRoutes) {
      const entry = await auditRoute({
        page: adminPage,
        route,
        viewport: viewports[2],
        screenshots,
        diagnostics: adminDiagnostics,
        recoveryLedger,
        prefix: 'search-default',
      })
      const search = adminPage
        .locator(
          'input[type="search"]:visible, input[placeholder*="search" i]:visible, input[aria-label*="search" i]:visible',
        )
        .first()
      const hasSearch = await visible(search)
      const beforeRows = entry.metrics.visibleTableRows
      let noResultState = null
      let keyboardFocusVisible = null
      let noResultScreenshot = null
      if (hasSearch) {
        await search.focus()
        keyboardFocusVisible = await search.evaluate((element) => {
          const style = getComputedStyle(element)
          return { outline: style.outline, boxShadow: style.boxShadow }
        })
        await search.fill(`zz-${runId}`)
        await sleep(700)
        noResultState = await adminPage.evaluate(inspectPage)
        noResultScreenshot = `search-no-result-${slug(route)}.png`
        await adminPage.screenshot({ path: path.join(screenshotRoot, noResultScreenshot), fullPage: true })
        screenshots.push(noResultScreenshot)
        await search.fill('')
        await sleep(500)
      }
      searchLedger.push({
        route,
        hasSearch,
        beforeRows,
        defaultState: entry.metrics,
        noResultState,
        keyboardFocusVisible,
        noResultScreenshot,
      })
    }
    await adminContext.close()

    for (const [role, email, routes] of personas) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      const diagnostics = attachDiagnostics(page)
      await login(page, email, recoveryLedger)
      for (const route of routes) {
        roleLedger.push(
          await auditRoute({
            page,
            route,
            viewport: viewports[2],
            screenshots,
            diagnostics,
            recoveryLedger,
            prefix: `role-${role}`,
          }),
        )
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }

  const output = {
    runId,
    commit: 'ec84c998',
    environment: { baseUrl, headed: true, browser: 'Chrome', workerCount: 1 },
    denominator: {
      catalogModules: manifest.modules.length,
      concreteCatalogRoutes: catalogRoutes.length,
      personas: personas.length,
      viewports,
      searchRoutes: searchRoutes.length,
    },
    catalogLedger,
    roleLedger,
    searchLedger,
    recoveryLedger,
    screenshots,
  }
  fs.writeFileSync(path.join(artifactRoot, 'desktop-audit-ledger-attempt2.json'), JSON.stringify(output, null, 2))
  process.stdout.write(
    JSON.stringify({
      catalogChecks: catalogLedger.length,
      roleChecks: roleLedger.length,
      searchChecks: searchLedger.length,
      screenshots: screenshots.length,
      catalogOverflow: catalogLedger.filter((entry) => entry.metrics.overflow > 1).length,
      redirects: [...catalogLedger, ...roleLedger].filter((entry) => entry.redirectedToLogin).length,
      pageErrors: [...catalogLedger, ...roleLedger].flatMap((entry) => entry.pageErrors).length,
      serverErrors: [...catalogLedger, ...roleLedger].flatMap((entry) => entry.serverErrors).length,
    }, null, 2),
  )
}

run().catch((error) => {
  fs.writeFileSync(path.join(artifactRoot, 'runner-error.txt'), error.stack || String(error))
  console.error(error)
  process.exitCode = 1
})
