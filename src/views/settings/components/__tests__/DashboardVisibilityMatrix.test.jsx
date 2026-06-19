// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import DashboardVisibilityMatrix from '../../DashboardVisibilityMatrix'
import { fetchRolePermissions, fetchSession, saveRolePermissions } from 'src/services/apiClient'

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: () => ({
    id: 1,
    name: 'System Admin',
    permissions: ['settings.manage'],
  }),
}))

vi.mock('src/services/apiClient', () => ({
  fetchRolePermissions: vi.fn(),
  fetchSession: vi.fn(),
  saveRolePermissions: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DashboardVisibilityMatrix', () => {
  const loadPermissions = () => {
    fetchRolePermissions.mockResolvedValue({
      roles: ['System Administrator', 'HR Manager', 'Employee'],
      permissions: ['dashboard.payroll.view', 'dashboard.overtime.view', 'dashboard.leave.view'],
      matrix: {
        'System Administrator': [
          'dashboard.payroll.view',
          'dashboard.overtime.view',
          'dashboard.leave.view',
        ],
        'HR Manager': ['dashboard.payroll.view', 'dashboard.overtime.view'],
        Employee: ['dashboard.leave.view'],
      },
    })
    fetchSession.mockResolvedValue({ user: { id: 1, permissions: ['settings.manage'] } })
    saveRolePermissions.mockResolvedValue({ changed: ['Employee'] })
  }

  it('edits one role at a time and saves the existing matrix shape', async () => {
    loadPermissions()
    render(<DashboardVisibilityMatrix />)

    await screen.findByText('Dashboard Visibility Role Editor')
    expect(screen.getByLabelText('Role').value).toBe('HR Manager')
    expect(screen.getByText('Payroll Claims')).toBeTruthy()

    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByLabelText('HR Manager - Leave'))

    const changedItems = screen.getByText('Changed Items').parentElement
    expect(within(changedItems).getByText('HR Manager')).toBeTruthy()
    expect(changedItems.textContent).toContain('Leave')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => expect(saveRolePermissions).toHaveBeenCalledTimes(1))
    expect(saveRolePermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        'HR Manager': expect.arrayContaining([
          'dashboard.payroll.view',
          'dashboard.overtime.view',
          'dashboard.leave.view',
        ]),
        Employee: expect.arrayContaining(['dashboard.leave.view']),
      }),
    )
  })

  it('keeps the advanced matrix available', async () => {
    loadPermissions()
    render(<DashboardVisibilityMatrix />)

    await screen.findByText('Dashboard Visibility Role Editor')
    fireEvent.click(screen.getByText('Matrix'))

    expect(screen.getByText('Dashboard Visibility Matrix')).toBeTruthy()
    expect(screen.getByText('Dashboard Section')).toBeTruthy()
    expect(screen.getAllByText('HR Manager').length).toBeGreaterThan(0)
  })
})
