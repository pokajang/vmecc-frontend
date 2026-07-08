// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ authUser, moduleActivation }),
}))

vi.mock('../hooks/useDashboardStats', () => ({
  default: () => dashboardStats,
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
}

afterEach(() => {
  cleanup()
  resetDefaults()
})

it('renders a global period control and an action queue from existing stats', () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )

  expect(screen.getByRole('button', { name: /2026/ })).toBeTruthy()
  expect(screen.getByText('Action Queue')).toBeTruthy()
  expect(screen.getByText('Claims pending approval')).toBeTruthy()
  expect(screen.getAllByText('Requests pending approval').length).toBeGreaterThan(0)
  expect(screen.getByText('Draft days pending publish')).toBeTruthy()
  expect(screen.getByText('Reports pending review')).toBeTruthy()
  expect(
    screen
      .getAllByRole('link')
      .some((link) => link.getAttribute('href') === '/staff/salary-claims/claims'),
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
})

it('marks role-limited modules as hidden at stable data-testid locations', () => {
  authUser.permissions = ['self.dashboard']
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
  expect(screen.getByTestId('dashboard-action-queue-empty')).toBeTruthy()
})

it('shows module and action-queue fallback states when stats fail to load', () => {
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
