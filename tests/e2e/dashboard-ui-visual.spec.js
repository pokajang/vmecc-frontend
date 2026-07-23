import { expect, test } from '@playwright/test'

const user = {
  id: 901,
  name: 'Dashboard Reviewer',
  email: 'dashboard.reviewer@example.test',
  status: 'active',
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
  await page.route('http://localhost:8000/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')

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
      return fulfillJson(route, { data: { unread_count: 0 } })
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

test('dashboard has a usable desktop and mobile composition', async ({ page }, testInfo) => {
  await installDashboardStubs(page)

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Select dashboard reporting period' })).toBeVisible()
  await expect(page.getByText('Leave requests pending review')).toBeVisible()
  await expectNoHorizontalPageOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png') })

  await page.setViewportSize({ width: 820, height: 1000 })
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible()
  await expectNoHorizontalPageOverflow(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Dashboard Overview' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'This Month' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Collapse Payroll Claims' })).toBeVisible()
  await expect
    .poll(async () => {
      const cards = await page.locator('.dashboard-kpi-row').first().locator(':scope > div').all()
      const [firstCard, secondCard] = await Promise.all(
        cards.slice(0, 2).map((card) => card.boundingBox()),
      )
      return Boolean(firstCard && secondCard && secondCard.y > firstCard.y)
    })
    .toBe(true)
  await expectNoHorizontalPageOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true })
})
