import { expect, test } from '@playwright/test'

const user = {
  id: 901,
  name: 'Dashboard Reviewer',
  email: 'dashboard.reviewer@example.test',
  status: 'active',
  ic_number: '900101-01-9010',
  phone: '0123456789',
  address: '1 Dashboard Way',
  state: 'Selangor',
  emergency_contact: { name: 'Emergency Contact', relationship: 'Sibling', phone: '0198765432' },
  medical_info: { noKnownCriticalMedicalInfo: true },
  permissions: ['*'],
  roles: ['System Administrator'],
}

const dashboardStats = {
  payroll: {
    pendingApprovals: 3,
    approvedUnpaidCount: 2,
    approvedUnpaidTotalMyr: 4600,
    incompleteContracts: 1,
    staffWithOpenClaims: 4,
    paidThisMonthCount: 7,
    paidThisMonthTotalMyr: 12000,
    activeAssignments: 15,
    assignmentDrafts: 2,
    monthlyTrend: [
      { month: 'Feb', count: 4 },
      { month: 'Mar', count: 6 },
      { month: 'Apr', count: 5 },
      { month: 'May', count: 8 },
      { month: 'Jun', count: 7 },
      { month: 'Jul', count: 10 },
    ],
    byType: { salary: 12, expense: 5, other: 2 },
    byStatus: { pending: 3, pendingReview: 1, pendingApproval: 2, approved: 5, paid: 7 },
  },
  overtime: {
    pendingApprovals: 2,
    approvedHoursThisPeriod: 48,
    staffWithOpenRequests: 3,
    submittedThisPeriod: 8,
    approvedRequestsThisPeriod: 6,
    monthlyTrend: [
      { month: 'Feb', count: 2 },
      { month: 'Mar', count: 5 },
      { month: 'Apr', count: 4 },
      { month: 'May', count: 7 },
      { month: 'Jun', count: 6 },
      { month: 'Jul', count: 8 },
    ],
    byType: { weekday: 10, weekend: 4, holiday: 2 },
    byStatus: { pending: 2, approved: 9, rejected: 1, cancelled: 1 },
    byTeam: [
      { team: 'Alpha', count: 8 },
      { team: 'Bravo', count: 5 },
    ],
  },
  leave: {
    pendingApprovals: 4,
    approvedDaysThisPeriod: 16,
    staffCurrentlyOnLeave: 2,
    staffWithPendingRequests: 3,
    monthlyTrend: [
      { month: 'Feb', count: 3 },
      { month: 'Mar', count: 6 },
      { month: 'Apr', count: 4 },
      { month: 'May', count: 7 },
      { month: 'Jun', count: 5 },
      { month: 'Jul', count: 8 },
    ],
    byTeam: [
      { team: 'Alpha', count: 7 },
      { team: 'Bravo', count: 5 },
    ],
  },
  roster: {
    teamsOnDuty: 3,
    draftsPendingPublish: 2,
    monthlyTrend: [
      { month: 'Feb', scheduledDays: 18 },
      { month: 'Mar', scheduledDays: 22 },
      { month: 'Apr', scheduledDays: 20 },
      { month: 'May', scheduledDays: 24 },
      { month: 'Jun', scheduledDays: 23 },
      { month: 'Jul', scheduledDays: 26 },
    ],
    teams: [
      { name: 'Alpha', memberCount: 7, dayShifts: 14, nightShifts: 12, totalShifts: 26 },
      { name: 'Bravo', memberCount: 6, dayShifts: 12, nightShifts: 10, totalShifts: 22 },
    ],
  },
  reports: {
    pendingReview: 3,
    pendingApproval: 2,
    submittedThisPeriod: 11,
    monthlyTrend: [
      { month: 'Feb', count: 4 },
      { month: 'Mar', count: 5 },
      { month: 'Apr', count: 7 },
      { month: 'May', count: 6 },
      { month: 'Jun', count: 9 },
      { month: 'Jul', count: 11 },
    ],
    byType: { erco: 8, drill: 5, fitnessTest: 3 },
    ercoByIncidentType: [{ type: 'Fire alarm', count: 4 }],
    byPersonnel: [{ name: 'A. Rahman', count: 5 }],
  },
}

const fulfillJson = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const installDashboardStubs = async (page) => {
  let notificationRead = false
  let notificationsDeleted = false

  await page.route('http://localhost:8000/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    const method = route.request().method()

    if (path === '/auth/session') return fulfillJson(route, { user, csrf_token: 'dashboard-token' })
    if (path === '/settings/modules') {
      return fulfillJson(route, {
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
      return fulfillJson(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (path === '/dashboard/action-queue') {
      return fulfillJson(route, {
        items: [
          {
            key: 'leave.review',
            module: 'leave',
            label: 'Leave requests pending review',
            count: 4,
            to: '/leave',
          },
        ],
      })
    }
    if (path === '/stats') return fulfillJson(route, dashboardStats)
    if (path === '/workflow/notifications/unread-count') {
      const count = notificationsDeleted || notificationRead ? 0 : 1
      return fulfillJson(route, { data: { count, unread_count: count } })
    }
    if (path === '/workflow/notifications/read-all' && method === 'POST') {
      notificationRead = true
      return fulfillJson(route, { data: { updated: 1 } })
    }
    if (path === '/workflow/notifications' && method === 'DELETE') {
      notificationsDeleted = true
      return fulfillJson(route, { data: { deleted: 1 } })
    }
    if (path === '/workflow/notifications') {
      return fulfillJson(route, {
        data: notificationsDeleted
          ? []
          : [
              {
                id: 247,
                module: 'inspection',
                event: 'submitted',
                title: 'azamhusain9 submitted Inspection INS-01-2472026.',
                createdAt: '2026-07-24T09:55:00.000Z',
                read: notificationRead,
                actionRequiredForViewer: false,
                reportType: 'inspection',
                reportUid: 'INS-01-2472026',
              },
            ],
      })
    }

    return fulfillJson(route, { data: [], meta: {} })
  })
}

const expectNoHorizontalPageOverflow = async (page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true)
}

const expectMobileDrawerItemsFit = async (dialog) => {
  const issues = await dialog.evaluate((drawer) => {
    const drawerBounds = drawer.getBoundingClientRect()

    return [...drawer.querySelectorAll('.mobile-overlay-item')].flatMap((item) => {
      const itemBounds = item.getBoundingClientRect()
      const label = item.querySelector('.mobile-overlay-item-label')
      const labelStyle = label ? getComputedStyle(label) : null
      const labelLineHeight = labelStyle ? Number.parseFloat(labelStyle.lineHeight) : 0
      const itemIssues = []

      if (itemBounds.left < drawerBounds.left - 1 || itemBounds.right > drawerBounds.right + 1) {
        itemIssues.push(`${label?.textContent?.trim() || 'Unnamed item'} escapes the drawer`)
      }
      if (itemBounds.height < 44) {
        itemIssues.push(`${label?.textContent?.trim() || 'Unnamed item'} is below 44px`)
      }
      if (label && label.scrollWidth > label.clientWidth + 1) {
        itemIssues.push(`${label.textContent.trim()} clips horizontally`)
      }
      if (
        label &&
        labelLineHeight > 0 &&
        label.getBoundingClientRect().height > labelLineHeight * 1.2
      ) {
        itemIssues.push(`${label.textContent.trim()} wraps`)
      }

      return itemIssues
    })
  })

  expect(issues).toEqual([])
}

const expectTypographyContract = async (page, { mobile = false } = {}) => {
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('16px "Manrope Variable"')))
    .toBe(true)

  const family = await page
    .locator('body')
    .evaluate((element) => getComputedStyle(element).fontFamily)
  expect(family).toContain('Manrope Variable')
  await expect(page.locator('body')).toHaveCSS('font-weight', '500')

  const title = page.getByRole('heading', { name: 'Dashboard Overview' })
  await expect(title).toHaveCSS('font-weight', '700')
  await expect(title).toHaveCSS('font-size', mobile ? '22px' : '24px')
  await expect(page.locator('.dashboard-overview__description')).toHaveCSS('font-weight', '500')

  if (mobile) {
    await expect(page.locator('.dashboard-metric-list__summary').first()).toHaveCSS(
      'font-size',
      '16px',
    )
    await expect(page.locator('.app-bottom-nav-label').first()).toHaveCSS('font-size', '13px')
    await expect(page.locator('.app-bottom-nav-label').first()).toHaveCSS('font-weight', '600')
    const overflowingBottomNavLabels = await page
      .locator('.app-bottom-nav-label')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.scrollWidth > node.clientWidth + 1)
          .map((node) => node.textContent.trim()),
      )
    expect(overflowingBottomNavLabels).toEqual([])
    await expect(page.locator('.dashboard-module-card__subtext').first()).toHaveCSS(
      'font-weight',
      '500',
    )
  }
}

test('dashboard has a usable desktop and mobile composition', async ({ page }, testInfo) => {
  await installDashboardStubs(page)

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Select dashboard reporting period' })).toBeVisible()
  await expect(page.getByText('Leave requests pending review')).toBeVisible()
  await expect(page.locator('.dashboard-analytics').first()).toHaveAttribute('open', '')
  await expect(
    page.getByTestId('dashboard-module-roster').locator('.dashboard-team-table-desktop'),
  ).toBeVisible()
  await expect(
    page.getByTestId('dashboard-module-roster').locator('.dashboard-team-summary-list'),
  ).toBeHidden()
  await expectNoHorizontalPageOverflow(page)
  await expectTypographyContract(page)
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png') })

  await page.setViewportSize({ width: 820, height: 1000 })
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible()
  await expectNoHorizontalPageOverflow(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible()
  const mobilePeriodDropdown = page.getByTestId('dashboard-period-dropdown')
  const mobilePeriodToggle = mobilePeriodDropdown.getByRole('button', {
    name: /Select dashboard reporting period/,
  })
  await expect(mobilePeriodToggle).toBeVisible()
  await expect(mobilePeriodToggle).toContainText('This Month')
  expect(
    await mobilePeriodToggle.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeLessThan(250)
  expect(
    await mobilePeriodToggle.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(40)
  await expect(page.getByRole('group', { name: 'Select dashboard reporting period' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Collapse Payroll Claims' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Collapse action queue' })).toBeVisible()
  await expect(
    page.getByTestId('dashboard-action-queue').locator('.dashboard-action-queue__header'),
  ).toHaveCSS('border-left-width', '4px')
  await page.getByTestId('dashboard-action-queue').locator('.dashboard-header-toggle').click()
  await expect(
    page.getByTestId('dashboard-action-queue').locator('.dashboard-action-queue__body'),
  ).toHaveCount(0)
  await page.getByTestId('dashboard-action-queue').locator('.dashboard-header-toggle').click()
  await expect(
    page.getByTestId('dashboard-action-queue').locator('.dashboard-action-queue__body'),
  ).toBeVisible()
  expect(
    await page
      .getByTestId('dashboard-module-payroll')
      .locator('.dashboard-module-card')
      .evaluate((card) => {
        const header = card.querySelector('.dashboard-module-card__header')
        const body = card.querySelector('.dashboard-module-card__body')
        return (
          header &&
          body &&
          getComputedStyle(header).backgroundColor === getComputedStyle(body).backgroundColor
        )
      }),
  ).toBe(true)
  await expect(page.locator('.dashboard-analytics').first()).not.toHaveAttribute('open', '')
  await expect(page.getByText('Payroll analytics')).toBeVisible()
  await expect(page.getByText('View details').first()).toBeVisible()
  await expectTypographyContract(page, { mobile: true })
  await expect
    .poll(async () => {
      const rows = await page
        .locator('.dashboard-kpi-row')
        .first()
        .locator('.dashboard-metric-list__item')
        .all()
      const [firstRow, secondRow] = await Promise.all(
        rows.slice(0, 2).map((row) => row.boundingBox()),
      )
      return Boolean(firstRow && secondRow && secondRow.y > firstRow.y)
    })
    .toBe(true)
  await expect(
    page.locator('.dashboard-kpi-row').first().locator('.dashboard-metric-list__item').first(),
  ).toHaveCSS('border-top-width', '0px')
  await expect(
    page.locator('.dashboard-kpi-row').first().locator('.dashboard-metric-list__item').nth(1),
  ).toHaveCSS('border-top-width', '1px')
  await expect(page.locator('.dashboard-summary-row--grouped').first()).toHaveCSS(
    'border-top-width',
    '1px',
  )
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true })
  await mobilePeriodToggle.click()
  await page.screenshot({
    path: testInfo.outputPath('dashboard-mobile-period-menu.png'),
    fullPage: true,
  })
  await page.getByTestId('dashboard-period-option-3m').click()
  await expect(mobilePeriodToggle).toContainText('3M')
  await page.locator('.dashboard-analytics__summary').first().click()
  await expect(page.locator('.dashboard-analytics').first()).toHaveAttribute('open', '')
  await expect(page.getByText('Payroll claims')).toBeVisible()
  const rosterModule = page.getByTestId('dashboard-module-roster')
  await rosterModule.locator('.dashboard-analytics__summary').click()
  await expect(rosterModule.locator('.dashboard-team-summary-list')).toBeVisible()
  await expect(rosterModule.locator('.dashboard-team-table-desktop')).toBeHidden()
  await page.screenshot({
    path: testInfo.outputPath('dashboard-mobile-roster-summary.png'),
    fullPage: true,
  })
  await expectNoHorizontalPageOverflow(page)

  await page.getByRole('button', { name: 'Open menu' }).click()
  const menuDialog = page.getByRole('dialog', { name: 'Menu' })
  await expect(menuDialog).toBeVisible()
  await expect(menuDialog.locator('.mobile-overlay-shell-title-text')).toHaveCSS(
    'font-size',
    '20px',
  )
  await expect(menuDialog.locator('.mobile-overlay-shell-title-text')).toHaveCSS(
    'font-weight',
    '700',
  )
  await expect(menuDialog.locator('.mobile-overlay-item-label').first()).toHaveCSS(
    'font-size',
    '16px',
  )
  await expect(menuDialog.locator('.mobile-overlay-item-label').first()).toHaveCSS(
    'font-weight',
    '600',
  )
  const overflowingMenuLabels = await menuDialog
    .locator('.mobile-overlay-item-label')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .map((node) => node.textContent.trim()),
    )
  expect(overflowingMenuLabels).toEqual([])
  const firstMenuItems = await menuDialog.locator('.mobile-overlay-item').all()
  const [firstMenuItem, secondMenuItem] = await Promise.all(
    firstMenuItems.slice(0, 2).map((item) => item.boundingBox()),
  )
  expect(firstMenuItem).not.toBeNull()
  expect(secondMenuItem).not.toBeNull()
  expect(Math.abs(secondMenuItem.y - firstMenuItem.y)).toBeLessThan(1)
  const inspectionMenuItem = menuDialog.getByRole('button', {
    name: 'Inspection',
    exact: true,
  })
  const ercoMenuItem = menuDialog.getByRole('button', { name: 'ERCO', exact: true })
  const [inspectionBox, ercoBox] = await Promise.all([
    inspectionMenuItem.boundingBox(),
    ercoMenuItem.boundingBox(),
  ])
  expect(inspectionBox).not.toBeNull()
  expect(ercoBox).not.toBeNull()
  expect(Math.abs(inspectionBox.y - ercoBox.y)).toBeLessThan(1)
  await expect(menuDialog.getByText('Team Directory', { exact: true })).toHaveCSS(
    'white-space',
    'nowrap',
  )
  for (const width of [320, 390, 430, 767]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(menuDialog).toBeVisible()
    await expectMobileDrawerItemsFit(menuDialog)
    await expectNoHorizontalPageOverflow(page)
    if (width === 320 || width === 767) {
      await page.screenshot({ path: testInfo.outputPath(`dashboard-menu-${width}px.png`) })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile-menu.png') })

  await menuDialog.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Open account menu' }).click()
  const accountDialog = page.getByRole('dialog', { name: 'Account drawer' })
  await expect(accountDialog).toBeVisible()
  for (const width of [320, 390, 430, 767]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(accountDialog).toBeVisible()
    await expectMobileDrawerItemsFit(accountDialog)
    await expectNoHorizontalPageOverflow(page)
    if (width === 320 || width === 767) {
      await page.screenshot({ path: testInfo.outputPath(`dashboard-account-${width}px.png`) })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile-account.png') })
  await accountDialog.getByRole('button', { name: 'Close', exact: true }).click()

  await page.getByRole('button', { name: 'Notifications' }).click()
  const notificationDialog = page.getByRole('dialog', { name: 'Notifications' })
  await expect(notificationDialog).toBeVisible()

  const markAllButton = notificationDialog.getByRole('button', {
    name: 'Mark all notifications as read',
  })
  const deleteAllButton = notificationDialog.getByRole('button', {
    name: 'Delete all notifications',
  })
  const refreshButton = notificationDialog.getByRole('button', {
    name: 'Refresh notifications',
  })
  await expect(markAllButton).toBeVisible()
  await expect(deleteAllButton).toBeVisible()
  await expect(refreshButton).toBeVisible()
  for (const actionButton of [markAllButton, deleteAllButton, refreshButton]) {
    const box = await actionButton.boundingBox()
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  expect(await markAllButton.textContent()).toBe('')
  expect(await deleteAllButton.textContent()).toBe('')
  expect(await refreshButton.textContent()).toBe('')
  await expect(notificationDialog.locator('.notification-item-dot')).toHaveCount(0)
  await expect(notificationDialog.locator('.notification-item-body')).toHaveCSS('flex-grow', '1')
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile-notifications.png') })

  await markAllButton.click()
  await expect(notificationDialog.getByText('All messages marked as read.')).toBeVisible()
  await refreshButton.click()
  await expect(notificationDialog.getByText('Messages refreshed successfully.')).toBeVisible()

  await deleteAllButton.click()
  await expect(notificationDialog.getByText('Delete all notifications?')).toBeVisible()
  await notificationDialog.getByRole('button', { name: 'Delete all', exact: true }).click()
  await expect(notificationDialog.getByText('All messages deleted.')).toBeVisible()
  await expect(notificationDialog.getByText('No notifications yet.')).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('dashboard-mobile-notifications-empty.png'),
  })
})
