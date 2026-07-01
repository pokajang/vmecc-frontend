// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourHost from '../OnboardingTourHost'
import { dashboardQuickTour } from 'src/onboarding/dashboardQuickTourConfig'
import { inspectionQuickTour } from 'src/onboarding/inspectionQuickTourConfig'
import { leaveManagementQuickTour } from 'src/onboarding/leaveManagementQuickTourConfig'
import { myLeaveQuickTour } from 'src/onboarding/myLeaveQuickTourConfig'
import { myOvertimeQuickTour } from 'src/onboarding/myOvertimeQuickTourConfig'
import { overtimeManagementQuickTour } from 'src/onboarding/overtimeManagementQuickTourConfig'
import { payrollClaimsQuickTour } from 'src/onboarding/payrollClaimsQuickTourConfig'
import { rosterManagementQuickTour } from 'src/onboarding/rosterManagementQuickTourConfig'
import { salaryClaimsManagementQuickTour } from 'src/onboarding/salaryClaimsManagementQuickTourConfig'
import { staffDirectoryQuickTour } from 'src/onboarding/staffDirectoryQuickTourConfig'
import { teamDirectoryQuickTour } from 'src/onboarding/teamDirectoryQuickTourConfig'
import { usersQuickTour } from 'src/onboarding/usersQuickTourConfig'

const eligibilityState = vi.hoisted(() => ({
  eligible: true,
  isResolved: true,
}))

vi.mock('src/hooks/useOvertimeEligibility', () => ({
  default: () => eligibilityState,
}))

vi.mock('../OnboardingTourRunner', () => ({
  default: ({ config }) => <div data-testid="tour-runner">{config.id}</div>,
}))

const completeTrtUser = {
  id: 12,
  name: 'TRT User',
  roles: ['Tactical Response Team'],
  permissions: ['reports.inspection.view'],
  ic_number: '900101-10-1234',
  phone: '012 345 6789',
  address: 'Lot 1',
  state: 'Selangor',
  emergency_contact: {
    name: 'Emergency Contact',
    relationship: 'Sibling',
    phone: '013 345 6789',
  },
  medical_info: {
    noKnownCriticalMedicalInfo: true,
  },
}

const renderHost = (authUser, moduleActivation = null) => {
  const store = createStore((state = { authUser, moduleActivation }) => state)
  render(
    <Provider store={store}>
      <OnboardingTourHost />
    </Provider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('OnboardingTourHost', () => {
  beforeEach(() => {
    eligibilityState.eligible = true
    eligibilityState.isResolved = true
  })

  it('mounts ready tour configs from the registry', () => {
    renderHost(completeTrtUser)

    expect(screen.getByTestId('tour-runner').textContent).toBe(inspectionQuickTour.id)
  })

  it('mounts manual-launch tour configs even when automatic prerequisites are incomplete', () => {
    renderHost({ ...completeTrtUser, phone: '' })

    expect(screen.getByTestId('tour-runner').textContent).toBe(inspectionQuickTour.id)
  })

  it('mounts Dashboard when the user can access self.dashboard', () => {
    renderHost({ ...completeTrtUser, permissions: ['reports.inspection.view', 'self.dashboard'] })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, dashboardQuickTour.id]),
    )
  })

  it('mounts self-service leave when the user can access leave', () => {
    renderHost({ ...completeTrtUser, permissions: ['reports.inspection.view', 'self.leave'] })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, myLeaveQuickTour.id]),
    )
  })

  it('mounts self-service overtime only when the module is enabled and eligibility resolves true', () => {
    renderHost(
      { ...completeTrtUser, permissions: ['reports.inspection.view', 'self.overtime'] },
      {
        effective: {
          'overtime.self_service': {
            enabled: true,
          },
        },
      },
    )

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, myOvertimeQuickTour.id]),
    )
  })

  it('does not mount self-service overtime when eligibility resolves false', () => {
    eligibilityState.eligible = false

    renderHost(
      { ...completeTrtUser, permissions: ['reports.inspection.view', 'self.overtime'] },
      {
        effective: {
          'overtime.self_service': {
            enabled: true,
          },
        },
      },
    )

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual([
      inspectionQuickTour.id,
    ])
  })

  it('mounts Payroll / Claims only when the full payroll route family is enabled', () => {
    renderHost(
      { ...completeTrtUser, permissions: ['reports.inspection.view', 'self.payroll'] },
      {
        effective: {
          'payroll.self_service': {
            enabled: true,
          },
          'payroll.claims': {
            enabled: true,
          },
          'payroll.payslips': {
            enabled: true,
          },
        },
      },
    )

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, payrollClaimsQuickTour.id]),
    )
  })

  it('does not mount Payroll / Claims when part of the payroll route family is disabled', () => {
    renderHost(
      { ...completeTrtUser, permissions: ['reports.inspection.view', 'self.payroll'] },
      {
        effective: {
          'payroll.self_service': {
            enabled: true,
          },
          'payroll.claims': {
            enabled: false,
          },
          'payroll.payslips': {
            enabled: true,
          },
        },
      },
    )

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual([
      inspectionQuickTour.id,
    ])
  })

  it('mounts Staff Directory when the user can access staff records', () => {
    renderHost({ ...completeTrtUser, permissions: ['reports.inspection.view', 'staff.view'] })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, staffDirectoryQuickTour.id]),
    )
  })

  it('mounts Team Directory when the user can view teams', () => {
    renderHost({ ...completeTrtUser, permissions: ['reports.inspection.view', 'teams.view'] })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, teamDirectoryQuickTour.id]),
    )
  })

  it('mounts Leave Management when the user can manage leave', () => {
    renderHost({
      ...completeTrtUser,
      permissions: ['reports.inspection.view', 'staff.leave.manage'],
    })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, leaveManagementQuickTour.id]),
    )
  })

  it('mounts Overtime Management when the user can manage overtime', () => {
    renderHost({
      ...completeTrtUser,
      permissions: ['reports.inspection.view', 'staff.overtime.manage'],
    })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, overtimeManagementQuickTour.id]),
    )
  })

  it('mounts Salary & Claims only when payroll.salary_claims_management is enabled', () => {
    renderHost(
      { ...completeTrtUser, permissions: ['reports.inspection.view', 'staff.salary.manage'] },
      {
        effective: {
          'payroll.salary_claims_management': {
            enabled: true,
          },
        },
      },
    )

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, salaryClaimsManagementQuickTour.id]),
    )
  })

  it('does not mount Salary & Claims when payroll.salary_claims_management is disabled', () => {
    renderHost(
      { ...completeTrtUser, permissions: ['reports.inspection.view', 'staff.salary.manage'] },
      {
        effective: {
          'payroll.salary_claims_management': {
            enabled: false,
          },
        },
      },
    )

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual([
      inspectionQuickTour.id,
    ])
  })

  it('mounts Roster Management when the user can manage rosters', () => {
    renderHost({ ...completeTrtUser, permissions: ['reports.inspection.view', 'rosters.manage'] })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, rosterManagementQuickTour.id]),
    )
  })

  it('mounts Users when the user can manage users', () => {
    renderHost({ ...completeTrtUser, permissions: ['reports.inspection.view', 'users.manage'] })

    expect(screen.getAllByTestId('tour-runner').map((node) => node.textContent)).toEqual(
      expect.arrayContaining([inspectionQuickTour.id, usersQuickTour.id]),
    )
  })

  it('does not mount Users when users.manage is missing', () => {
    renderHost({ ...completeTrtUser, permissions: ['reports.inspection.view'] })

    expect(screen.queryByText(usersQuickTour.id)).toBeNull()
    expect(screen.queryByText('users')).toBeNull()
    expect(
      screen
        .queryAllByTestId('tour-runner')
        .map((node) => node.textContent)
        .includes(usersQuickTour.id),
    ).toBe(false)
  })

  it('does not mount inaccessible tutorial configs', () => {
    renderHost({ ...completeTrtUser, permissions: [] })

    expect(screen.queryByTestId('tour-runner')).toBeNull()
  })
})
