// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'

let authUser = {
  name: 'Admin',
  roles: ['Admin'],
  permissions: [
    'self.dashboard',
    'dashboard.payroll.view',
    'dashboard.overtime.view',
    'dashboard.leave.view',
    'dashboard.roster.view',
    'dashboard.reports.view',
  ],
}

let moduleActivation = {
  'dashboard.payroll': true,
  'dashboard.overtime': true,
  'dashboard.leave': true,
  'dashboard.roster': true,
  'dashboard.reports': true,
}

let dashboardStats = {
  loading: false,
  error: null,
  stats: {
    payroll: { pendingApprovals: 2, approvedUnpaidCount: 1 },
    overtime: { pendingApprovals: 3 },
    leave: { pendingApprovals: 4 },
    roster: { draftsPendingPublish: 5 },
    reports: { pendingReview: 6, pendingApproval: 7 },
  },
  moduleStats: {
    payroll: {
      loading: false,
      error: null,
      stats: { pendingApprovals: 2, approvedUnpaidCount: 1 },
    },
    overtime: { loading: false, error: null, stats: { pendingApprovals: 3 } },
    leave: { loading: false, error: null, stats: { pendingApprovals: 4 } },
    roster: { loading: false, error: null, stats: { draftsPendingPublish: 5 } },
    reports: { loading: false, error: null, stats: { pendingReview: 6, pendingApproval: 7 } },
  },
}

let dashboardActionQueue = {
  loading: false,
  error: null,
  retry: vi.fn(),
  items: [
    {
      key: 'leave.review',
      module: 'leave',
      action: 'review',
      label: 'Leave requests pending your review',
      count: 2,
      to: '/staff/leave-management/leaves?action=review',
    },
    {
      key: 'reports.inspection.review',
      module: 'inspection',
      action: 'review',
      label: 'Inspections pending your review',
      count: 3,
      to: '/inspection?scope=actionable&action=review',
    },
  ],
}

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ authUser, moduleActivation }),
}))

vi.mock('../hooks/useDashboardStats', () => ({
  default: () => dashboardStats,
}))

vi.mock('../hooks/useDashboardActionQueue', () => ({
  default: () => dashboardActionQueue,
}))

vi.mock('../components/PayrollStats', () => ({
  PayrollKpiTiles: () => <div>Payroll KPI</div>,
  PayrollOperationsCard: () => <div>Payroll operations</div>,
  PayrollAssignmentsCard: () => <div>Payroll assignments</div>,
  PayrollActivityChart: () => <div>Payroll activity</div>,
  PayrollStatusBreakdown: () => <div>Payroll status</div>,
}))
vi.mock('../components/OvertimeStats', () => ({
  OvertimeKpiTiles: () => <div>Overtime KPI</div>,
  OvertimeOperationsCard: () => <div>Overtime operations</div>,
  OvertimeTeamCard: () => <div>Overtime team</div>,
  OvertimeActivityChart: () => <div>Overtime activity</div>,
  OvertimeStatusBreakdown: () => <div>Overtime status</div>,
}))
vi.mock('../components/LeaveStats', () => ({
  LeaveKpiTiles: () => <div>Leave KPI</div>,
  LeaveActivityChart: () => <div>Leave activity</div>,
  LeaveTeamBreakdown: () => <div>Leave team</div>,
}))
vi.mock('../components/RosterStats', () => ({
  RosterKpiTiles: () => <div>Roster KPI</div>,
  RosterActivityChart: () => <div>Roster activity</div>,
  RosterTeamBreakdown: () => <div>Roster team</div>,
}))
vi.mock('../components/ReportStats', () => ({
  ReportKpiTiles: () => <div>Report KPI</div>,
  ReportActivityChart: () => <div>Report activity</div>,
  ReportBreakdown: () => <div>Report breakdown</div>,
}))

const resetDefaults = () => {
  authUser = {
    name: 'Admin',
    roles: ['Admin'],
    permissions: [
      'self.dashboard',
      'dashboard.payroll.view',
      'dashboard.overtime.view',
      'dashboard.leave.view',
      'dashboard.roster.view',
      'dashboard.reports.view',
    ],
  }
  moduleActivation = {
    'dashboard.payroll': true,
    'dashboard.overtime': true,
    'dashboard.leave': true,
    'dashboard.roster': true,
    'dashboard.reports': true,
  }
  dashboardStats = {
    loading: false,
    error: null,
    stats: {
      payroll: { pendingApprovals: 2, approvedUnpaidCount: 1 },
      overtime: { pendingApprovals: 3 },
      leave: { pendingApprovals: 4 },
      roster: { draftsPendingPublish: 5 },
      reports: { pendingReview: 6, pendingApproval: 7 },
    },
    moduleStats: {
      payroll: {
        loading: false,
        error: null,
        stats: { pendingApprovals: 2, approvedUnpaidCount: 1 },
      },
      overtime: { loading: false, error: null, stats: { pendingApprovals: 3 } },
      leave: { loading: false, error: null, stats: { pendingApprovals: 4 } },
      roster: { loading: false, error: null, stats: { draftsPendingPublish: 5 } },
      reports: { loading: false, error: null, stats: { pendingReview: 6, pendingApproval: 7 } },
    },
  }
  dashboardActionQueue = {
    loading: false,
    error: null,
    retry: vi.fn(),
    items: [
      {
        key: 'leave.review',
        module: 'leave',
        action: 'review',
        label: 'Leave requests pending your review',
        count: 2,
        to: '/staff/leave-management/leaves?action=review',
      },
      {
        key: 'reports.inspection.review',
        module: 'inspection',
        action: 'review',
        label: 'Inspections pending your review',
        count: 3,
        to: '/inspection?scope=actionable&action=review',
      },
    ],
  }
}

afterEach(() => {
  cleanup()
  resetDefaults()
})

it('renders a global period control and the personalized action queue', () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )

  expect(screen.getByRole('group', { name: 'Select dashboard reporting period' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'This Month' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
  const periodDropdown = screen.getByTestId('dashboard-period-dropdown')
  expect(periodDropdown.textContent).toContain('This Month')
  fireEvent.click(screen.getByTestId('dashboard-period-option-3m'))
  expect(periodDropdown.textContent).toContain('3M')
  expect(screen.getByText('Action Queue')).toBeTruthy()
  expect(screen.getByText('Leave requests pending your review')).toBeTruthy()
  expect(screen.getByText('Inspections pending your review')).toBeTruthy()
  expect(
    screen
      .getAllByRole('link')
      .some((link) => link.getAttribute('href') === '/staff/leave-management/leaves?action=review'),
  ).toBe(true)
  expect(
    screen
      .getAllByRole('link')
      .some((link) => link.getAttribute('href') === '/inspection?scope=actionable&action=review'),
  ).toBe(true)
  expect(screen.getByTestId('dashboard-module-payroll').getAttribute('data-visible')).toBe(
    'visible',
  )
  expect(screen.getByTestId('dashboard-module-overtime').getAttribute('data-visible')).toBe(
    'visible',
  )
  expect(screen.getByTestId('dashboard-module-leave').getAttribute('data-visible')).toBe('visible')
  expect(screen.getByTestId('dashboard-module-roster').getAttribute('data-visible')).toBe('visible')
  expect(screen.getByTestId('dashboard-module-reports').getAttribute('data-visible')).toBe(
    'visible',
  )

  const payrollCollapse = screen.getByRole('button', { name: 'Collapse Payroll Claims' })
  fireEvent.click(payrollCollapse)
  expect(payrollCollapse.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByText('Payroll KPI')).toBeNull()
})

it('marks role-limited modules as hidden at stable data-testid locations', () => {
  authUser.permissions = ['self.dashboard']
  dashboardActionQueue.items = []
  dashboardStats.loading = false
  dashboardStats.stats = {}
  dashboardStats.moduleStats = {
    payroll: { loading: false, error: null, stats: {} },
    overtime: { loading: false, error: null, stats: {} },
    leave: { loading: false, error: null, stats: {} },
    roster: { loading: false, error: null, stats: {} },
    reports: { loading: false, error: null, stats: {} },
  }

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )

  expect(screen.getByTestId('dashboard-module-payroll').getAttribute('data-visible')).toBe('hidden')
  expect(screen.getByTestId('dashboard-module-overtime').getAttribute('data-visible')).toBe(
    'hidden',
  )
  expect(screen.getByTestId('dashboard-module-leave').getAttribute('data-visible')).toBe('hidden')
  expect(screen.getByTestId('dashboard-module-roster').getAttribute('data-visible')).toBe('hidden')
  expect(screen.getByTestId('dashboard-module-reports').getAttribute('data-visible')).toBe('hidden')
  expect(screen.getByTestId('dashboard-action-queue-empty').textContent).toContain(
    'All caught up - no actions need attention.',
  )
})

it('shows module and action-queue fallback states when stats fail to load', () => {
  dashboardActionQueue.items = []
  dashboardActionQueue.error = 'Action queue failed'
  dashboardStats.stats = {}
  dashboardStats.moduleStats = {
    payroll: { loading: false, error: 'Payroll failed', stats: {} },
    overtime: { loading: false, error: null, stats: {} },
    leave: { loading: false, error: null, stats: {} },
    roster: { loading: false, error: null, stats: {} },
    reports: { loading: false, error: null, stats: {} },
  }

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )

  expect(screen.getByTestId('dashboard-action-queue-error')).toBeTruthy()
  expect(screen.getByTestId('dashboard-payroll-error')).toBeTruthy()
})
