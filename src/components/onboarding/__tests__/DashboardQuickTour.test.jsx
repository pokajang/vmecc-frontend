// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { dashboardQuickTour } from 'src/onboarding/dashboardQuickTourConfig'
import {
  DASHBOARD_TOUR_KEY,
  DASHBOARD_TOUR_REPLAY_EVENT,
  DASHBOARD_TOUR_VERSION,
} from 'src/onboarding/dashboardTour'
import Dashboard from 'src/views/dashboard/Dashboard'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [DASHBOARD_TOUR_KEY]: {
          version: DASHBOARD_TOUR_VERSION,
          lastStartedAt: new Date().toISOString(),
        },
      },
    }),
  ),
}))

vi.mock('src/views/dashboard/hooks/useMyStats', () => ({
  default: () => ({ stats: {}, loading: false, error: null }),
}))

vi.mock('src/views/dashboard/hooks/useDashboardStats', () => ({
  default: () => ({
    loading: false,
    error: null,
    moduleStats: {},
    stats: {
      payroll: { pendingApprovals: 2, approvedUnpaidCount: 1 },
      overtime: { pendingApprovals: 3 },
      leave: { pendingApprovals: 4 },
      roster: { draftsPendingPublish: 5 },
      reports: { pendingReview: 6, pendingApproval: 7 },
    },
  }),
}))

vi.mock('src/views/dashboard/components/MyStats', () => ({ default: () => <div>My stats</div> }))
vi.mock('src/views/dashboard/components/PayrollStats', () => ({
  PayrollKpiTiles: () => <div>Payroll KPI</div>,
  PayrollOperationsCard: () => <div>Payroll operations</div>,
  PayrollAssignmentsCard: () => <div>Payroll assignments</div>,
  PayrollActivityChart: () => <div>Payroll activity</div>,
  PayrollStatusBreakdown: () => <div>Payroll status</div>,
}))
vi.mock('src/views/dashboard/components/OvertimeStats', () => ({
  OvertimeKpiTiles: () => <div>Overtime KPI</div>,
  OvertimeOperationsCard: () => <div>Overtime operations</div>,
  OvertimeTeamCard: () => <div>Overtime team</div>,
  OvertimeActivityChart: () => <div>Overtime activity</div>,
  OvertimeStatusBreakdown: () => <div>Overtime status</div>,
}))
vi.mock('src/views/dashboard/components/LeaveStats', () => ({
  LeaveKpiTiles: () => <div>Leave KPI</div>,
  LeaveActivityChart: () => <div>Leave activity</div>,
  LeaveTeamBreakdown: () => <div>Leave team</div>,
}))
vi.mock('src/views/dashboard/components/RosterStats', () => ({
  RosterKpiTiles: () => <div>Roster KPI</div>,
  RosterActivityChart: () => <div>Roster activity</div>,
  RosterTeamBreakdown: () => <div>Roster team</div>,
}))
vi.mock('src/views/dashboard/components/ReportStats', () => ({
  ReportKpiTiles: () => <div>Report KPI</div>,
  ReportActivityChart: () => <div>Report activity</div>,
  ReportBreakdown: () => <div>Report breakdown</div>,
}))

vi.mock('react-joyride', () => import('./joyrideTestMock'))

const createStorageMock = () => {
  let values = {}
  return {
    getItem: vi.fn((key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
    ),
    setItem: vi.fn((key, value) => {
      values[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete values[key]
    }),
    clear: vi.fn(() => {
      values = {}
    }),
  }
}

const dashboardUser = {
  id: 91,
  name: 'Dashboard User',
  email: 'dashboard@example.test',
  roles: ['Representative'],
  permissions: [
    'self.dashboard',
    'dashboard.payroll.view',
    'dashboard.overtime.view',
    'dashboard.leave.view',
    'dashboard.roster.view',
    'dashboard.reports.view',
  ],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const DashboardRouteShell = () => {
  const location = useLocation()

  if (location.pathname !== '/dashboard') {
    return <main data-testid="outside-route">Outside route</main>
  }

  return <Dashboard />
}

const renderTour = ({ authUser = dashboardUser, initialPath = '/dashboard' } = {}) => {
  const store = createStore((state = { authUser, moduleActivation: null }) => state)

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <NavigationGuardProvider>
          <LocationProbe />
          <DashboardRouteShell />
          <OnboardingTourRunner config={dashboardQuickTour} />
        </NavigationGuardProvider>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 120,
    height: 40,
    top: 0,
    right: 120,
    bottom: 40,
    left: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('dashboardQuickTour', () => {
  it('shows the prompt on /dashboard and starts the dashboard walkthrough', async () => {
    renderTour()

    expect(screen.getByText('Start Dashboard tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Dashboard workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Dashboard workspace' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Period control' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'My stats panel' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Action queue' })
  })

  it('replays from outside the route family and navigates to /dashboard', async () => {
    renderTour({ initialPath: '/messages' })

    window.dispatchEvent(
      new CustomEvent(DASHBOARD_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: dashboardUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Dashboard workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/dashboard')
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
  })
})
