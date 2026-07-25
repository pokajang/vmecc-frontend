import { expect, test } from '@playwright/test'

const user = {
  id: 902,
  name: 'Extinguisher Catalogue Auditor',
  email: 'extinguisher.audit@example.test',
  status: 'active',
  permissions: [
    'self.dashboard',
    'reports.view',
    'reports.inspection.view',
    'reports.inspection.extinguishers.manage',
  ],
  roles: ['System Admin'],
}

const asset = {
  id: 'fe-coverage-42',
  catalogId: 42,
  lockVersion: 3,
  zone: '1',
  location: 'Canteen',
  mainLocation: 'Canteen',
  subLocation: 'Canteen',
  idLocNo: 'CAN-002',
  feType: 'DP 9KG',
  barcodeNo: 'SR072024Y171649',
  certificationValidity: '2026-09-13',
  daysLeft: 55,
  lifecycleStatus: 'active',
  latestInspectionAt: '2026-07-18T08:30:00+08:00',
  inspectedBy: 'Inspection Tester',
  physical: 'Good',
  signage: 'Good',
  boxKey: 'Yes',
  boxGlass: 'Yes',
  operational: 'Good',
  issueCount: 0,
  openIssueCount: 0,
  evidenceCount: 0,
  reportCount: 1,
  checks: [
    { key: 'physical', label: 'FE Physical Condition', value: 'Good', hasDefect: false },
    { key: 'signage', label: 'FE Signage Condition', value: 'Good', hasDefect: false },
    { key: 'boxKey', label: 'FE Box Key Availability', value: 'Yes', hasDefect: false },
    { key: 'boxGlass', label: 'FE Box Glass Availability', value: 'Yes', hasDefect: false },
    { key: 'operational', label: 'Operational Condition', value: 'Good', hasDefect: false },
  ],
}

const historyRecord = {
  reportId: 91,
  displayId: 'INS-2026-001',
  submittedAt: '2026-07-18T08:30:00+08:00',
  submittedBy: 'Inspection Tester',
  issueCount: 0,
  evidenceCount: 0,
  status: 'checked',
  checks: asset.checks,
}

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (page) => {
  await page.route('**:8000/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')

    if (path === '/auth/session') return json(route, { user, csrf_token: 'audit-token' })
    if (path === '/settings/modules') {
      return json(route, {
        data: {
          registry: [],
          configured: {},
          effective: {},
          forceAllEnabled: true,
          fallbackMode: true,
        },
      })
    }
    if (path === '/settings/system-maintenance') {
      return json(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (path === '/inspection/fire-extinguishers/coverage/42') {
      return json(route, { data: { ...asset, historyRecords: [historyRecord] }, meta: {} })
    }
    if (path === '/inspection/fire-extinguishers/42/inspection-history') {
      return json(route, {
        data: [historyRecord],
        meta: { page: 1, perPage: 25, lastPage: 1, total: 1 },
      })
    }
    if (path === '/inspection/fire-extinguishers/coverage') {
      return json(route, {
        data: [asset],
        meta: {
          page: 1,
          perPage: 10,
          lastPage: 1,
          total: 1,
          filtered: 1,
          summary: {
            total: 1,
            inspected: 1,
            notInspected: 0,
            issues: 0,
            duplicates: 0,
            locatorDuplicates: 0,
            expired: 0,
          },
          lifecycleSummary: { all: 1, active: 1, outOfService: 0, retired: 0 },
          options: { zones: ['1'], locations: ['Canteen'], inspectors: ['Inspection Tester'] },
        },
      })
    }
    if (path === '/workflow/notifications/unread-count') {
      return json(route, { data: { unread_count: 0 } })
    }

    return json(route, { data: [], meta: {} })
  })
}

const expectNoPageOverflow = async (page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true)
}

test('catalogue and detail pages remain usable across desktop, tablet, and mobile', async ({
  page,
}, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installApiStubs(page)

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/inspection/all-extinguishers', { waitUntil: 'domcontentloaded' })
  const tableRow = page.locator('tbody tr').filter({ hasText: 'CAN-002' }).first()
  await expect(tableRow).toBeVisible()
  await expect(tableRow).toHaveCSS('cursor', 'pointer')
  await expectNoPageOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('extinguisher-catalog-desktop.png'),
    fullPage: true,
  })

  await tableRow.locator('td').nth(1).click()
  await expect(page).toHaveURL(/\/inspection\/all-extinguishers\/42$/)
  await expect(page.getByRole('heading', { name: 'CAN-002' })).toBeVisible()
  await expect(page.getByText(/^Inspection history/)).toBeVisible()
  await expectNoPageOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('extinguisher-detail-desktop.png'),
    fullPage: true,
  })

  await page.setViewportSize({ width: 820, height: 1000 })
  await page.goto('/inspection/all-extinguishers', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('tbody tr').filter({ hasText: 'CAN-002' }).first()).toBeVisible()
  const tabletSearch = page.getByLabel('Search records').last()
  await expect(tabletSearch).toBeVisible()
  const tabletSearchBox = await tabletSearch.boundingBox()
  const tabletSearchMetrics = await tabletSearch.evaluate((element) => ({
    parentClassName: element.parentElement?.className,
    rowClassName: element.closest('.row')?.className,
    parentFlex: getComputedStyle(element.parentElement).flex,
    parentMinWidth: getComputedStyle(element.parentElement).minWidth,
  }))
  expect(tabletSearchBox).not.toBeNull()
  expect(tabletSearchBox.width, JSON.stringify(tabletSearchMetrics)).toBeGreaterThanOrEqual(180)
  await expectNoPageOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('extinguisher-catalog-tablet.png'),
    fullPage: true,
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/inspection', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('inspection-all-extinguishers')).toBeVisible()
  await page.getByTestId('inspection-all-extinguishers').click()
  await expect.poll(() => new URL(page.url()).pathname).toBe('/inspection/all-extinguishers')
  await expect.poll(() => new URL(page.url()).searchParams.get('from')).toBeTruthy()
  await expect.poll(() => new URL(page.url()).searchParams.get('to')).toBeTruthy()
  await expect(page.getByTestId('all-extinguishers-section-mobile')).toBeVisible()
  await expect(page.getByText('CAN-002', { exact: true }).first()).toBeVisible()
  await expectNoPageOverflow(page)

  await page.goto('/inspection/all-extinguishers/42', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'CAN-002' })).toBeVisible()
  await expect(page.locator('.all-extinguishers-history-cards').last()).toBeVisible()
  await expectNoPageOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('extinguisher-detail-mobile.png'),
    fullPage: true,
  })

  expect(pageErrors).toEqual([])
})
