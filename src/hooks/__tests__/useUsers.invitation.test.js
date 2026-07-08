// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useUsers from '../useUsers'

const createUser = vi.fn()
const deleteUser = vi.fn()
const fetchTeams = vi.fn()
const fetchUsers = vi.fn()
const lockUser = vi.fn()
const replaceUserRoleAssignments = vi.fn()
const restoreUser = vi.fn()
const sendUserPasswordReset = vi.fn()
const unlockUser = vi.fn()
const updateUserStatus = vi.fn()

vi.mock('src/services/apiClient', () => ({
  createUser: (...args) => createUser(...args),
  deleteUser: (...args) => deleteUser(...args),
  fetchTeams: (...args) => fetchTeams(...args),
  fetchUsers: (...args) => fetchUsers(...args),
  lockUser: (...args) => lockUser(...args),
  replaceUserRoleAssignments: (...args) => replaceUserRoleAssignments(...args),
  restoreUser: (...args) => restoreUser(...args),
  sendUserPasswordReset: (...args) => sendUserPasswordReset(...args),
  unlockUser: (...args) => unlockUser(...args),
  updateUserStatus: (...args) => updateUserStatus(...args),
}))

describe('useUsers invitation feedback', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fetchUsers.mockResolvedValue({ data: [] })
    fetchTeams.mockResolvedValue({ data: [] })
  })

  const submitSuccessPayload = {
    invitation_sent: true,
    user: { id: 'u-1', name: 'New Staff', email: 'new.staff@example.test' },
  }

  const submitWarningPayload = {
    invitation_sent: false,
    user: { id: 'u-2', name: 'Slow Mail', email: 'slow.mail@example.test' },
  }

  const makeSubmitEvent = () => ({ preventDefault: vi.fn() })

  it('shows queued success status when invitation is queued', async () => {
    createUser.mockResolvedValueOnce(submitSuccessPayload)

    const { result } = renderHook(() =>
      useUsers({ isAdmin: true, roles: ['Contract Manager'], isSelf: false }),
    )

    act(() => {
      result.current.handleChange({ target: { name: 'name', value: 'New Staff' } })
      result.current.handleChange({ target: { name: 'email', value: 'new.staff@example.test' } })
    })

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    await waitFor(() => {
      expect(result.current.statusMessage).toEqual({
        type: 'success',
        message: 'User created and invitation queued.',
      })
    })
  })

  it('shows warning status when invitation dispatch is not accepted', async () => {
    createUser.mockResolvedValueOnce(submitWarningPayload)

    const { result } = renderHook(() =>
      useUsers({ isAdmin: true, roles: ['Contract Manager'], isSelf: false }),
    )

    act(() => {
      result.current.handleChange({ target: { name: 'name', value: 'Slow Mail' } })
      result.current.handleChange({ target: { name: 'email', value: 'slow.mail@example.test' } })
    })

    await act(async () => {
      await result.current.handleSubmit(makeSubmitEvent())
    })

    await waitFor(() => {
      expect(result.current.statusMessage).toEqual({
        type: 'warning',
        message: 'User created, but the invitation email could not be sent.',
      })
    })
  })
})

describe('useUsers delete flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fetchTeams.mockResolvedValue({ data: [] })
  })

  const targetUser = {
    id: 'u-delete',
    name: 'Delete Target',
    email: 'delete.target@example.test',
    roles: ['HR'],
    status: 'Active',
    deleted_at: null,
  }

  it('soft deletes a user from the normal delete action', async () => {
    fetchUsers.mockResolvedValueOnce({ data: [targetUser] })
    deleteUser.mockResolvedValue({})

    const { result } = renderHook(() =>
      useUsers({ isAdmin: true, roles: ['Contract Manager'], isSelf: () => false }),
    )

    await waitFor(() => {
      expect(result.current.users).toHaveLength(1)
    })

    act(() => {
      result.current.openDeleteModal(targetUser)
    })

    await act(async () => {
      await result.current.handleDeleteUser()
    })

    expect(deleteUser).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith(targetUser.id)
    expect(result.current.users).toHaveLength(1)
    expect(result.current.users[0]).toMatchObject({
      id: targetUser.id,
      deleted_at: expect.any(String),
    })
    expect(result.current.confirmDeleteOpen).toBe(false)
    expect(result.current.statusMessage).toEqual({
      type: 'success',
      message: 'User deleted. You can restore this user later.',
    })
  })

  it('keeps the row available if the soft delete request fails', async () => {
    fetchUsers.mockResolvedValueOnce({ data: [targetUser] })
    deleteUser.mockRejectedValueOnce({
      payload: { message: 'Unable to delete user.' },
    })

    const { result } = renderHook(() =>
      useUsers({ isAdmin: true, roles: ['Contract Manager'], isSelf: () => false }),
    )

    await waitFor(() => {
      expect(result.current.users).toHaveLength(1)
    })

    act(() => {
      result.current.openDeleteModal(targetUser)
    })

    await act(async () => {
      await result.current.handleDeleteUser()
    })

    expect(deleteUser).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith(targetUser.id)
    expect(result.current.users).toHaveLength(1)
    expect(result.current.users[0].deleted_at).toBeNull()
    expect(result.current.confirmDeleteOpen).toBe(true)
    expect(result.current.statusMessage).toEqual({
      type: 'danger',
      message: 'Unable to delete user.',
    })
  })

  it('permanently deletes an already deleted user from the permanent delete action', async () => {
    const deletedUser = { ...targetUser, deleted_at: '2026-07-08T00:00:00.000Z' }
    fetchUsers.mockResolvedValueOnce({ data: [deletedUser] })
    deleteUser.mockResolvedValue({})

    const { result } = renderHook(() =>
      useUsers({ isAdmin: true, roles: ['Contract Manager'], isSelf: () => false }),
    )

    await waitFor(() => {
      expect(result.current.users).toHaveLength(1)
    })

    act(() => {
      result.current.openPermanentDeleteModal(deletedUser)
    })

    await act(async () => {
      await result.current.handlePermanentDeleteUser()
    })

    expect(deleteUser).toHaveBeenCalledTimes(1)
    expect(deleteUser).toHaveBeenCalledWith(targetUser.id, { permanent: true })
    expect(result.current.users).toEqual([])
    expect(result.current.confirmPermanentDeleteOpen).toBe(false)
    expect(result.current.statusMessage).toEqual({
      type: 'success',
      message: 'User permanently deleted.',
    })
  })
})
