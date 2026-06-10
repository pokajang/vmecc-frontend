import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  createUser,
  deleteUser,
  fetchTeams,
  fetchUsers,
  lockUser,
  replaceUserRoleAssignments,
  restoreUser,
  sendUserPasswordReset,
  unlockUser,
  updateUserStatus,
} from 'src/services/apiClient'
import { createDefaultAssignment, roleScopeMap } from 'src/views/users/CreateStaffForm'
import {
  ensurePrimaryAssignment,
  toApiRoleAssignmentsPayload,
  toEditableRoleAssignments,
} from 'src/utils/roleAssignments'

const BULK_CHUNK_SIZE = 50

const chunkArray = (arr, size) => {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const bulkSettled = async (items, fn) => {
  const results = []
  for (const chunk of chunkArray(items, BULK_CHUNK_SIZE)) {
    const chunkResults = await Promise.allSettled(chunk.map(fn))
    results.push(...chunkResults)
  }
  return results
}

// --- modal state reducer ---

const MODAL_KEYS = ['reset', 'delete', 'permanentDelete', 'restore', 'deactivate', 'activate', 'lock', 'unlock', 'role']

const initialModalState = Object.fromEntries(MODAL_KEYS.map((k) => [k, false]))

const modalReducer = (state, action) => {
  if (action.type === 'open') return { ...initialModalState, [action.modal]: true }
  if (action.type === 'close') return { ...state, [action.modal]: false }
  return state
}

const useUsers = ({ isAdmin, roles = [], isSelf }) => {
  const defaultRole = roles.includes('Contract Manager')
    ? 'Contract Manager'
    : roles[0] || 'Contract Manager'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', email: '' })
  const [roleAssignments, setRoleAssignments] = useState([createDefaultAssignment(defaultRole)])
  const [teams, setTeams] = useState([])
  const [submitStatus, setSubmitStatus] = useState({ loading: false, message: null, type: null })
  const [statusMessage, setStatusMessage] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [actionUpdating, setActionUpdating] = useState(false)
  const [actionUser, setActionUser] = useState(null)
  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState)
  const [roleModalAssignments, setRoleModalAssignments] = useState([
    createDefaultAssignment(defaultRole),
  ])
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const statusTimerRef = useRef(null)
  const hasLoadedRef = useRef(false)

  const pushStatus = useCallback((type, message, delay = 3000) => {
    setStatusMessage({ type, message })
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), delay)
  }, [])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (isMounted) {
        if (hasLoadedRef.current) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }
        setError(null)
      }
      try {
        const [usersRes, teamsRes] = await Promise.all([
          fetchUsers({ include_deleted: 1 }),
          fetchTeams(),
        ])
        if (isMounted) {
          setUsers(usersRes?.data || [])
          setTeams(teamsRes?.data || [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err.payload?.message || 'Unable to load users.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setRefreshing(false)
          hasLoadedRef.current = true
        }
      }
    }
    if (isAdmin) {
      load()
    } else {
      setLoading(false)
    }
    return () => {
      isMounted = false
    }
  }, [isAdmin])

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (submitStatus.loading) return
      setSubmitStatus({ loading: true, message: null, type: null })
      try {
        const payload = {
          ...form,
          role_assignments: roleAssignments.map((assignment, index) => {
            const role = assignment.role || defaultRole
            const scopeType = roleScopeMap[role] || assignment.scope_type || 'office'
            return {
              ...assignment,
              role,
              scope_type: scopeType,
              is_primary: index === 0 || assignment.is_primary,
            }
          }),
        }
        payload.role_assignments = toApiRoleAssignmentsPayload(payload.role_assignments)
        const response = await createUser(payload)
        setUsers((prev) => [...prev, response.user])
        setForm({ name: '', email: '' })
        setRoleAssignments([createDefaultAssignment(defaultRole)])
        setSubmitStatus({ loading: false, message: null, type: null })
        setShowForm(false)
        pushStatus('success', 'User created and invitation sent.')
      } catch (err) {
        setSubmitStatus({
          loading: false,
          message: err.payload?.message || err.message || 'Unable to create user.',
          type: 'danger',
        })
      }
    },
    [defaultRole, form, pushStatus, roleAssignments, submitStatus.loading],
  )

  const toggleForm = useCallback(() => {
    setShowForm((prev) => !prev)
    setSubmitStatus({ loading: false, message: null, type: null })
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
  }, [])

  const cancelForm = useCallback(() => {
    setShowForm(false)
    setForm({ name: '', email: '' })
    setRoleAssignments([createDefaultAssignment(defaultRole)])
    setSubmitStatus({ loading: false, message: null, type: null })
  }, [defaultRole])

  const addRoleAssignment = useCallback(() => {
    setRoleAssignments((prev) => [...prev, createDefaultAssignment(defaultRole)])
  }, [defaultRole])

  const removeRoleAssignment = useCallback(
    (index) => {
      setRoleAssignments((prev) => {
        const next = prev.filter((_, idx) => idx !== index)
        if (next.length === 0) return [createDefaultAssignment(defaultRole)]
        return next.map((assignment, idx) => ({ ...assignment, is_primary: idx === 0 }))
      })
    },
    [defaultRole],
  )

  const changeRoleAssignment = useCallback((index, field, value) => {
    setRoleAssignments((prev) => {
      if (field === 'is_primary') {
        return prev.map((assignment, idx) => ({ ...assignment, is_primary: idx === index }))
      }
      return prev.map((assignment, idx) => {
        if (idx !== index) return assignment
        if (field === 'role') {
          const nextScope = roleScopeMap[value] || assignment.scope_type || 'office'
          return {
            ...assignment,
            role: value,
            scope_type: nextScope,
            team_id:
              nextScope === 'site' || nextScope === 'client_site' ? assignment.team_id : null,
          }
        }
        return { ...assignment, [field]: value }
      })
    })
  }, [])

  const openResetModal = useCallback((user) => {
    setActionUser(user)
    dispatchModal({ type: 'open', modal: 'reset' })
  }, [])

  const openDeleteModal = useCallback((user) => {
    setActionUser(user)
    dispatchModal({ type: 'open', modal: 'delete' })
  }, [])

  const openPermanentDeleteModal = useCallback((user) => {
    setActionUser(user)
    dispatchModal({ type: 'open', modal: 'permanentDelete' })
  }, [])

  const openRestoreModal = useCallback((user) => {
    setActionUser(user)
    dispatchModal({ type: 'open', modal: 'restore' })
  }, [])

  const openLockModal = useCallback((user) => {
    setActionUser(user)
    dispatchModal({ type: 'open', modal: 'lock' })
  }, [])

  const openUnlockModal = useCallback((user) => {
    setActionUser(user)
    dispatchModal({ type: 'open', modal: 'unlock' })
  }, [])

  const openRoleModal = useCallback((user) => {
    setActionUser(user)
    setRoleModalAssignments(toEditableRoleAssignments(user))
    dispatchModal({ type: 'open', modal: 'role' })
  }, [])

  const addRoleModalAssignment = useCallback(() => {
    setRoleModalAssignments((prev) => [...prev, createDefaultAssignment(defaultRole)])
  }, [defaultRole])

  const removeRoleModalAssignment = useCallback(
    (index) => {
      setRoleModalAssignments((prev) => {
        const next = prev.filter((_, idx) => idx !== index)
        if (next.length === 0) return [createDefaultAssignment(defaultRole)]
        return ensurePrimaryAssignment(next)
      })
    },
    [defaultRole],
  )

  const changeRoleModalAssignment = useCallback((index, field, value) => {
    setRoleModalAssignments((prev) => {
      if (field === 'is_primary') {
        return prev.map((assignment, idx) => ({ ...assignment, is_primary: idx === index }))
      }
      return prev.map((assignment, idx) => {
        if (idx !== index) return assignment
        if (field === 'role') {
          const nextScope = roleScopeMap[value] || assignment.scope_type || 'office'
          return {
            ...assignment,
            role: value,
            scope_type: nextScope,
            team_id:
              nextScope === 'site' || nextScope === 'client_site' ? assignment.team_id : null,
          }
        }
        return { ...assignment, [field]: value }
      })
    })
  }, [])

  const openStatusModal = useCallback((user) => {
    setActionUser(user)
    dispatchModal({ type: 'open', modal: user?.status === 'Active' ? 'deactivate' : 'activate' })
  }, [])

  const closeResetModal = useCallback(() => dispatchModal({ type: 'close', modal: 'reset' }), [])
  const closeDeleteModal = useCallback(() => dispatchModal({ type: 'close', modal: 'delete' }), [])
  const closePermanentDeleteModal = useCallback(() => dispatchModal({ type: 'close', modal: 'permanentDelete' }), [])
  const closeRestoreModal = useCallback(() => dispatchModal({ type: 'close', modal: 'restore' }), [])
  const closeDeactivateModal = useCallback(() => dispatchModal({ type: 'close', modal: 'deactivate' }), [])
  const closeActivateModal = useCallback(() => dispatchModal({ type: 'close', modal: 'activate' }), [])
  const closeLockModal = useCallback(() => dispatchModal({ type: 'close', modal: 'lock' }), [])
  const closeUnlockModal = useCallback(() => dispatchModal({ type: 'close', modal: 'unlock' }), [])
  const closeRoleModal = useCallback(() => dispatchModal({ type: 'close', modal: 'role' }), [])

  const isSelfUser = useCallback(
    (user) => (typeof isSelf === 'function' ? isSelf(user) : false),
    [isSelf],
  )

  const handleToggleStatus = useCallback(
    async (user) => {
      if (user.deleted_at) {
        pushStatus('warning', 'Restore the user before changing status.')
        return
      }
      if (isSelfUser(user)) {
        pushStatus('warning', 'You cannot change your own status.')
        return
      }
      const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active'
      try {
        await updateUserStatus(user.id, nextStatus)
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)))
        pushStatus('success', `User ${nextStatus.toLowerCase()}d.`)
      } catch (err) {
        pushStatus('danger', err.payload?.message || err.message || 'Unable to update status.')
      }
    },
    [isSelfUser, pushStatus],
  )

  const handleRoleUpdate = useCallback(async () => {
    if (!actionUser || actionUpdating) return
    setActionUpdating(true)
    try {
      const response = await replaceUserRoleAssignments(
        actionUser.id,
        toApiRoleAssignmentsPayload(roleModalAssignments),
      )
      const nextUser = response?.user || {}
      setUsers((prev) =>
        prev.map((u) =>
          u.id === actionUser.id
            ? {
                ...u,
                roles: nextUser.roles || u.roles,
                role_assignments: nextUser.role_assignments || u.role_assignments,
              }
            : u,
        ),
      )
      pushStatus('success', 'Role assignments updated.')
      dispatchModal({ type: 'close', modal: 'role' })
    } catch (err) {
      pushStatus('danger', err.payload?.message || 'Unable to update role assignments.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, pushStatus, roleModalAssignments])

  const handlePasswordReset = useCallback(async () => {
    if (!actionUser || actionUpdating) return
    setActionUpdating(true)
    try {
      await sendUserPasswordReset(actionUser.id)
      pushStatus('success', 'Password reset link sent.')
      dispatchModal({ type: 'close', modal: 'reset' })
    } catch (err) {
      pushStatus('danger', err.payload?.message || 'Unable to send reset link.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, pushStatus])

  const handleDeleteUser = useCallback(async () => {
    if (!actionUser || actionUpdating) return
    if (isSelfUser(actionUser)) {
      pushStatus('warning', 'You cannot delete your own account.')
      return
    }
    setActionUpdating(true)
    try {
      await deleteUser(actionUser.id)
      const deletedAt = new Date().toISOString()
      setUsers((prev) =>
        prev.map((u) => (u.id === actionUser.id ? { ...u, deleted_at: deletedAt } : u)),
      )
      pushStatus('success', 'User deleted.')
      dispatchModal({ type: 'close', modal: 'delete' })
    } catch (err) {
      pushStatus('danger', err.payload?.message || 'Unable to delete user.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, isSelfUser, pushStatus])

  const handlePermanentDeleteUser = useCallback(async () => {
    if (!actionUser || actionUpdating) return
    if (isSelfUser(actionUser)) {
      pushStatus('warning', 'You cannot delete your own account.')
      return
    }
    if (!actionUser.deleted_at) {
      pushStatus('warning', 'Delete the user first before permanent delete.')
      return
    }
    setActionUpdating(true)
    try {
      await deleteUser(actionUser.id, { permanent: true })
      setUsers((prev) => prev.filter((u) => u.id !== actionUser.id))
      pushStatus('success', 'User permanently deleted.')
      dispatchModal({ type: 'close', modal: 'permanentDelete' })
    } catch (err) {
      pushStatus('danger', err.payload?.message || 'Unable to permanently delete user.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, isSelfUser, pushStatus])

  const handleRestoreUser = useCallback(async () => {
    if (!actionUser || actionUpdating) return
    setActionUpdating(true)
    try {
      const response = await restoreUser(actionUser.id)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === actionUser.id
            ? { ...u, deleted_at: null, status: response?.user?.status || u.status }
            : u,
        ),
      )
      pushStatus('success', 'User restored.')
      dispatchModal({ type: 'close', modal: 'restore' })
    } catch (err) {
      pushStatus('danger', err.payload?.message || 'Unable to restore user.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, pushStatus])

  const handleLockUser = useCallback(async () => {
    if (!actionUser || actionUpdating) return
    if (isSelfUser(actionUser)) {
      pushStatus('warning', 'You cannot lock your own account.')
      return
    }
    setActionUpdating(true)
    try {
      const response = await lockUser(actionUser.id, 'admin_lock')
      setUsers((prev) =>
        prev.map((u) =>
          u.id === actionUser.id
            ? {
                ...u,
                locked_at: response?.user?.locked_at || new Date().toISOString(),
                lock_reason: response?.user?.lock_reason || 'admin_lock',
                failed_login_count: response?.user?.failed_login_count ?? u.failed_login_count,
              }
            : u,
        ),
      )
      pushStatus('success', 'User locked.')
      dispatchModal({ type: 'close', modal: 'lock' })
    } catch (err) {
      pushStatus('danger', err.payload?.message || 'Unable to lock user.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, isSelfUser, pushStatus])

  const handleUnlockUser = useCallback(async () => {
    if (!actionUser || actionUpdating) return
    setActionUpdating(true)
    try {
      await unlockUser(actionUser.id)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === actionUser.id
            ? {
                ...u,
                locked_at: null,
                lock_reason: null,
                failed_login_count: 0,
              }
            : u,
        ),
      )
      pushStatus('success', 'User unlocked.')
      dispatchModal({ type: 'close', modal: 'unlock' })
    } catch (err) {
      pushStatus('danger', err.payload?.message || 'Unable to unlock user.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, pushStatus])

  const bulkUpdateStatus = useCallback(
    async (userIds, status) => {
      if (!Array.isArray(userIds) || userIds.length === 0 || bulkUpdating) return
      setBulkUpdating(true)
      try {
        const targets = users.filter(
          (u) =>
            userIds.includes(u.id) &&
            !isSelfUser(u) &&
            !u.deleted_at &&
            (u.status || '') !== status,
        )
        if (targets.length === 0) {
          pushStatus('warning', 'No applicable users selected for this action.')
          return
        }
        const results = await bulkSettled(targets, (u) => updateUserStatus(u.id, status))
        const succeeded = targets
          .filter((_, idx) => results[idx].status === 'fulfilled')
          .map((u) => u.id)
        setUsers((prev) => prev.map((u) => (succeeded.includes(u.id) ? { ...u, status } : u)))
        const failed = targets.length - succeeded.length
        pushStatus(
          failed ? 'warning' : 'success',
          `Updated status for ${succeeded.length} user(s).${failed ? ` ${failed} failed.` : ''}`,
        )
      } finally {
        setBulkUpdating(false)
      }
    },
    [bulkUpdating, isSelfUser, pushStatus, users],
  )

  const bulkDeleteUsers = useCallback(
    async (userIds) => {
      if (!Array.isArray(userIds) || userIds.length === 0 || bulkUpdating) return
      setBulkUpdating(true)
      try {
        const targets = users.filter(
          (u) => userIds.includes(u.id) && !isSelfUser(u) && !u.deleted_at,
        )
        if (targets.length === 0) {
          pushStatus('warning', 'No applicable users selected for this action.')
          return
        }
        const results = await bulkSettled(targets, (u) => deleteUser(u.id))
        const succeeded = targets
          .filter((_, idx) => results[idx].status === 'fulfilled')
          .map((u) => u.id)
        if (succeeded.length > 0) {
          const deletedAt = new Date().toISOString()
          setUsers((prev) =>
            prev.map((u) => (succeeded.includes(u.id) ? { ...u, deleted_at: deletedAt } : u)),
          )
        }
        const failed = targets.length - succeeded.length
        pushStatus(
          failed ? 'warning' : 'success',
          `Deleted ${succeeded.length} user(s).${failed ? ` ${failed} failed.` : ''}`,
        )
      } finally {
        setBulkUpdating(false)
      }
    },
    [bulkUpdating, isSelfUser, pushStatus, users],
  )

  const bulkRestoreUsers = useCallback(
    async (userIds) => {
      if (!Array.isArray(userIds) || userIds.length === 0 || bulkUpdating) return
      setBulkUpdating(true)
      try {
        const targets = users.filter(
          (u) => userIds.includes(u.id) && !isSelfUser(u) && !!u.deleted_at,
        )
        if (targets.length === 0) {
          pushStatus('warning', 'No applicable users selected for this action.')
          return
        }
        const results = await bulkSettled(targets, (u) => restoreUser(u.id))
        const succeeded = results
          .map((result, idx) =>
            result.status === 'fulfilled'
              ? {
                  id: targets[idx].id,
                  status: result.value?.user?.status || targets[idx].status,
                }
              : null,
          )
          .filter(Boolean)
        if (succeeded.length > 0) {
          setUsers((prev) =>
            prev.map((u) => {
              const hit = succeeded.find((entry) => entry.id === u.id)
              return hit ? { ...u, deleted_at: null, status: hit.status } : u
            }),
          )
        }
        const failed = targets.length - succeeded.length
        pushStatus(
          failed ? 'warning' : 'success',
          `Restored ${succeeded.length} user(s).${failed ? ` ${failed} failed.` : ''}`,
        )
      } finally {
        setBulkUpdating(false)
      }
    },
    [bulkUpdating, isSelfUser, pushStatus, users],
  )

  const bulkDeleteUsersPermanently = useCallback(
    async (userIds) => {
      if (!Array.isArray(userIds) || userIds.length === 0 || bulkUpdating) return
      setBulkUpdating(true)
      try {
        const targets = users.filter(
          (u) => userIds.includes(u.id) && !isSelfUser(u) && !!u.deleted_at,
        )
        if (targets.length === 0) {
          pushStatus('warning', 'No applicable users selected for this action.')
          return
        }
        const results = await bulkSettled(targets, (u) => deleteUser(u.id, { permanent: true }))
        const succeeded = results
          .map((result, idx) => (result.status === 'fulfilled' ? targets[idx].id : null))
          .filter(Boolean)
        if (succeeded.length > 0) {
          setUsers((prev) => prev.filter((u) => !succeeded.includes(u.id)))
        }
        const failed = targets.length - succeeded.length
        pushStatus(
          failed ? 'warning' : 'success',
          `Permanently deleted ${succeeded.length} user(s).${failed ? ` ${failed} failed.` : ''}`,
        )
      } finally {
        setBulkUpdating(false)
      }
    },
    [bulkUpdating, isSelfUser, pushStatus, users],
  )

  return {
    users,
    loading,
    refreshing,
    error,
    form,
    roleAssignments,
    teams,
    submitStatus,
    statusMessage,
    showForm,
    actionUpdating,
    actionUser,
    confirmResetOpen: modalState.reset,
    confirmDeleteOpen: modalState.delete,
    confirmPermanentDeleteOpen: modalState.permanentDelete,
    confirmRestoreOpen: modalState.restore,
    confirmDeactivateOpen: modalState.deactivate,
    confirmActivateOpen: modalState.activate,
    confirmLockOpen: modalState.lock,
    confirmUnlockOpen: modalState.unlock,
    roleModalOpen: modalState.role,
    roleModalAssignments,
    addRoleModalAssignment,
    removeRoleModalAssignment,
    changeRoleModalAssignment,
    bulkUpdating,
    handleChange,
    addRoleAssignment,
    removeRoleAssignment,
    changeRoleAssignment,
    handleSubmit,
    toggleForm,
    closeForm,
    cancelForm,
    openResetModal,
    openDeleteModal,
    openPermanentDeleteModal,
    openRestoreModal,
    openRoleModal,
    openStatusModal,
    openLockModal,
    openUnlockModal,
    closeResetModal,
    closeDeleteModal,
    closePermanentDeleteModal,
    closeRestoreModal,
    closeDeactivateModal,
    closeActivateModal,
    closeLockModal,
    closeUnlockModal,
    closeRoleModal,
    handleToggleStatus,
    handleRoleUpdate,
    handlePasswordReset,
    handleDeleteUser,
    handlePermanentDeleteUser,
    handleRestoreUser,
    handleLockUser,
    handleUnlockUser,
    bulkUpdateStatus,
    bulkDeleteUsers,
    bulkRestoreUsers,
    bulkDeleteUsersPermanently,
  }
}

export default useUsers
