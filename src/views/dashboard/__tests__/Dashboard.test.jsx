// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'

vi.mock('react-redux', () => ({
  useSelector: () => ({
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
  }),
}))

vi.mock('../hooks/useMyStats', () => ({
  default: () => ({ stats: {}, loading: false, error: null }),
}))

vi.mock('../hooks/useDashboardStats', () => ({
  default: () => ({
    loading: false,
    error: null,
    stats: {
      payroll: { pendingApprovals: 2, approvedUnpaidCount: 1 },
      overtime: { pendingApprovals: 3 },
      leave: { pendingApprovals: 4 },
      roster: { draftsPendingPublish: 5 },
      reports: { pendingReview: 6, pendingApproval: 7 },
    },
  }),
}))

vi.mock('../components/MyStats', () => ({ default: () => <div>My stats</div> }))
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

afterEach(() => cleanup())

it('renders a global period control and an action queue from existing stats', () => {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )

  expect(screen.getByRole('button', { name: 'June 2026' })).toBeTruthy()
  expect(screen.getByText('Action Queue')).toBeTruthy()
  expect(screen.getByText('Claims pending approval')).toBeTruthy()
  expect(screen.getAllByText('Requests pending approval').length).toBeGreaterThan(0)
  expect(screen.getByText('Draft days pending publish')).toBeTruthy()
  expect(screen.getByText('Reports pending review')).toBeTruthy()
})
