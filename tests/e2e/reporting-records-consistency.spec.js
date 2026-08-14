const { expect, test } = require('@playwright/test')
const {
  getControlledBrowserApiBaseUrl,
  installControlledApiRequestGuard,
} = require('./support/controlled-api-stubs')

const apiBaseUrl = getControlledBrowserApiBaseUrl()
const routes = [
  { key: 'inspection', path: '/inspection' },
  { key: 'erco', path: '/report/erco' },
  { key: 'drill', path: '/report/drill' },
  { key: 'fitness-test', path: '/report/fitness-test' },
]

const user = {
  id: 904,
  name: 'Reporting Records Auditor',
  email: 'reporting.records@example.test',
  status: 'active',
  permissions: ['*'],
  roles: ['System Administrator'],
}

const records = routes.map(({ key }, index) => ({
  report_uid: `records-consistency-${key}`,
  display_id: `QA-${String(index + 1).padStart(2, '0')}`,
  report_type: key,
  status: 'Submitted',
  submitted_at: '2026-08-13T04:30:00.000Z',
  created_at: '2026-08-13T04:30:00.000Z',
  updated_at: '2026-08-13T04:30:00.000Z',
  payload: {
    incidentType: key === 'inspection' ? 'Fire Extinguisher' : 'Controlled report',
    inspectionType: key === 'inspection' ? 'Fire Extinguisher' : undefined,
    location: 'Generator House with a deliberately long location name',
    reportDate: '2026-08-13',
    reportTime: '12:30',
    submittedBy: user.name,
  },
  record_actions_version: 1,
  record_actions: {
    view: { applicable: true, allowed: true },
    back: { applicable: true, allowed: true },
  },
}))

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (page) => {
  await installControlledApiRequestGuard(page, apiBaseUrl)
  const handleApiRoute = async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.replace(/^\/api/, '')
    const method = request.method().toUpperCase()

    if (pathname === '/auth/session') {
      return json(route, { user, csrf_token: 'reporting-records-token' })
    }
    if (pathname === '/settings/modules') {
      return json(route, {
        data: { registry: [], configured: {}, effective: {}, fallbackMode: true },
      })
    }
    if (pathname === '/settings/system-maintenance') {
      return json(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (pathname === '/workflow/notifications/unread-count') {
      return json(route, { data: { unread_count: 0 } })
    }
    if (pathname === '/reports/draft') return json(route, { data: null })
    if (pathname === '/reports/drafts') return json(route, { data: [], meta: { total: 0 } })
    if (pathname === '/reports/inspection/checklist-summary') {
      return json(route, { data: { totalReports: 1, withChecklist: 1, withoutChecklist: 0 } })
    }
    if (pathname === '/reports') {
      const type = url.searchParams.get('reportType') || url.searchParams.get('report_type')
      const matching = type ? records.filter((record) => record.report_type === type) : records
      return json(route, { data: matching, meta: { total: matching.length } })
    }
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      return json(route, { message: `Unexpected controlled mutation: ${method} ${pathname}` }, 409)
    }
    return json(route, { data: [], meta: {} })
  }
  const apiOrigins = new Set([apiBaseUrl, apiBaseUrl.replace('127.0.0.1', 'localhost')])
  for (const origin of apiOrigins) {
    await page.route(`${origin}/**`, handleApiRoute)
  }
}

const openMobileRecords = async (page, path) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => window.scrollTo(0, 0))
  const viewAll = page.getByRole('button', { name: /^View all(?: \(\d+\))?$/ }).first()
  await expect(viewAll).toBeVisible()
  await viewAll.click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('section[aria-label="Report records"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Records$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
}

const expectSharedRecordsContract = async (page) => {
  const visibleScope = page.locator('.workflow-scope-segmented--text:visible').first()
  await expect(visibleScope).toBeVisible()
  const mine = visibleScope.getByRole('button', { name: 'Mine' })
  const all = visibleScope.getByRole('button', { name: 'All' })
  await expect(mine).toHaveAttribute('aria-pressed', 'true')
  await all.focus()
  await expect(all).toBeFocused()
  await all.press('Enter')
  await expect(all).toHaveAttribute('aria-pressed', 'true')
  await mine.click()
  await expect(mine).toHaveAttribute('aria-pressed', 'true')

  const search = page.getByPlaceholder('Search records').first()
  await expect(search).toBeVisible()
  const searchRadius = await search.evaluate((element) =>
    parseFloat(getComputedStyle(element).borderRadius),
  )
  expect(searchRadius).toBeGreaterThan(15)

  const filter = page.locator('.inspection-report-records-filter-row .table-filter-trigger').first()
  await expect(filter).toBeVisible()
  const filterStyle = await filter.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      backgroundColor: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
      height: element.getBoundingClientRect().height,
      width: element.getBoundingClientRect().width,
    }
  })
  expect(['rgba(0, 0, 0, 0)', 'transparent']).toContain(filterStyle.backgroundColor)
  expect(parseFloat(filterStyle.borderTopWidth)).toBe(0)
  expect(filterStyle.height).toBeGreaterThanOrEqual(44)
  expect(filterStyle.width).toBeGreaterThanOrEqual(44)

  const pageSize = page.locator('.data-table-footer--compact-mobile:visible select')
  await expect(pageSize).toBeVisible()
  await pageSize.selectOption('5')
  await expect(pageSize).toHaveValue('5')
  await pageSize.selectOption('all')
  await expect(pageSize).toHaveValue('all')

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe('Reporting records consistency', () => {
  test.beforeEach(async ({ page }) => {
    await installApiStubs(page)
  })

  test('keeps all four mobile records journeys on one visual contract', async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })

    for (const viewport of [
      { name: 'narrow', width: 320, height: 700 },
      { name: 'standard', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      for (const route of routes) {
        await test.step(`${viewport.name}-${route.key}`, async () => {
          await openMobileRecords(page, route.path)
          await expectSharedRecordsContract(page)
          const footer = page.locator('.data-table-footer--compact-mobile:visible')
          await expect(footer).toBeVisible()
          await expect(footer).toContainText(/1 of 1/)

          if (viewport.name === 'standard') {
            await page.screenshot({
              path: testInfo.outputPath(`${route.key}-mobile-light.png`),
              fullPage: true,
              animations: 'disabled',
            })
            await page.evaluate(() =>
              document.documentElement.setAttribute('data-coreui-theme', 'dark'),
            )
            await expectSharedRecordsContract(page)
            await page.screenshot({
              path: testInfo.outputPath(`${route.key}-mobile-dark.png`),
              fullPage: true,
              animations: 'disabled',
            })
            await page.evaluate(() =>
              document.documentElement.setAttribute('data-coreui-theme', 'light'),
            )
          }
        })
      }
    }
  })

  test('keeps all four desktop records routes structurally aligned', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    for (const route of routes) {
      await test.step(route.key, async () => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })
        const recordsCard = page.locator('.card.d-none.d-md-block').filter({
          has: page.locator('.workflow-scope-segmented'),
        })
        await expect(recordsCard.first()).toBeVisible()
        await expect(
          recordsCard.first().locator('input.form-control-sm[placeholder="Search records"]'),
        ).toBeVisible()
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(1)
        await page.screenshot({
          path: testInfo.outputPath(`${route.key}-desktop-light.png`),
          fullPage: true,
          animations: 'disabled',
        })
      })
    }
  })
})
