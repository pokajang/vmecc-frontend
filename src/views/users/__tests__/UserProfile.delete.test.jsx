// @vitest-environment jsdom
import React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserProfile from '../UserProfile'

const deleteUser = vi.fn()
const fetchAuditLogs = vi.fn()
const fetchTeams = vi.fn()
const fetchUserSessions = vi.fn()
const fetchUsers = vi.fn()
const lockUser = vi.fn()
const replaceUserRoleAssignments = vi.fn()
const restoreUser = vi.fn()
const sendUserPasswordReset = vi.fn()
const unlockUser = vi.fn()
const updateUserStatus = vi.fn()

vi.mock('src/services/apiClient', () => ({
  deleteUser: (...args) => deleteUser(...args),
  fetchAuditLogs: (...args) => fetchAuditLogs(...args),
  fetchTeams: (...args) => fetchTeams(...args),
  fetchUserSessions: (...args) => fetchUserSessions(...args),
  fetchUsers: (...args) => fetchUsers(...args),
  lockUser: (...args) => lockUser(...args),
  replaceUserRoleAssignments: (...args) => replaceUserRoleAssignments(...args),
  restoreUser: (...args) => restoreUser(...args),
  sendUserPasswordReset: (...args) => sendUserPasswordReset(...args),
  unlockUser: (...args) => unlockUser(...args),
  updateUserStatus: (...args) => updateUserStatus(...args),
}))

vi.mock('src/components/users/LoginRecordsPanel', () => ({
  default: () => <div data-testid="login-records-panel" />,
}))

vi.mock('src/components/users/UserSessionsPanel', () => ({
  default: () => <div data-testid="sessions-panel" />,
}))

vi.mock('src/components/users/UserAuditPanel', () => ({
  default: () => <div data-testid="audit-panel" />,
}))

const profileUser = {
  id: 'u-delete',
  name: 'Delete Target',
  email: 'delete.target@example.test',
  roles: ['HR'],
  role_assignments: [],
  status: 'Active',
  deleted_at: null,
  last_login_at: null,
  failed_login_count: 0,
}

const authUser = {
  id: 'admin-user',
  email: 'admin@example.test',
  permissions: ['users.manage', 'roles.assign'],
}

const renderProfile = () => {
  const store = createStore((state = { authUser }) => state)

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/admin/users/u-delete/delete-target']}>
        <Routes>
          <Route path="/admin/users/:id/:slug" element={<UserProfile />} />
          <Route path="/admin/users" element={<div>Users list</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.resetAllMocks()
  fetchTeams.mockResolvedValue({ data: [] })
  fetchUserSessions.mockResolvedValue({ data: [] })
  fetchAuditLogs.mockResolvedValue({ data: [] })
})

describe('UserProfile delete flow', () => {
  it('soft deletes an active user before exposing restore and permanent delete actions', async () => {
    fetchUsers.mockResolvedValueOnce({ data: [profileUser] })
    deleteUser.mockResolvedValue({})
    renderProfile()

    expect(await screen.findByText('Delete Target')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.click(await screen.findByText('Delete user'))

    expect(screen.getByText('Delete User')).toBeTruthy()
    expect(
      screen.getByText(
        'Delete Delete Target from active user management? You can restore this user later.',
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith(profileUser.id)
    })
    expect(screen.getByText('User deleted. You can restore this user later.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Deleted' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'More' }))

    expect(await screen.findByText('Restore user')).toBeTruthy()
    expect(screen.getByText('Delete permanently')).toBeTruthy()
  })

  it('permanently deletes only from an already deleted profile', async () => {
    const deletedUser = { ...profileUser, deleted_at: '2026-07-08T00:00:00.000Z' }
    fetchUsers.mockResolvedValueOnce({ data: [deletedUser] })
    deleteUser.mockResolvedValue({})
    renderProfile()

    expect(await screen.findByText('Delete Target')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.click(await screen.findByText('Delete permanently'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith(profileUser.id, { permanent: true })
    })
    expect(await screen.findByText('Users list')).toBeTruthy()
  })
})
