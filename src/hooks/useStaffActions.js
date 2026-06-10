import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteUser,
  replaceUserRoleAssignments,
  restoreUser,
  sendInAppMessage,
} from 'src/services/apiClient'
import { createDefaultAssignment } from 'src/views/users/CreateStaffForm'
import {
  ensurePrimaryAssignment,
  getScopeTypeForRole,
  toApiRoleAssignmentsPayload,
  toEditableRoleAssignments,
} from 'src/utils/roleAssignments'

const useStaffActions = ({
  roleOptions = [],
  isSelf,
  onUserUpdate,
  canAssignRoles = true,
  canManageUsers = true,
  canMessage = true,
} = {}) => {
  const [actionUser, setActionUser] = useState(null)
  const [roleAssignments, setRoleAssignments] = useState([createDefaultAssignment(roleOptions[0])])
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [confirmTerminateOpen, setConfirmTerminateOpen] = useState(false)
  const [confirmRehireOpen, setConfirmRehireOpen] = useState(false)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [messageBody, setMessageBody] = useState('')
  const [actionUpdating, setActionUpdating] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const statusTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  const isSelfUser = useCallback(
    (user) => (typeof isSelf === 'function' ? isSelf(user) : !!isSelf),
    [isSelf],
  )

  const pushStatusMessage = useCallback((type, message) => {
    setStatusMessage({ type, message })
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), 3000)
  }, [])

  const applyUserUpdate = useCallback(
    (patchOrUpdater) => {
      if (!actionUser) return
      if (typeof onUserUpdate === 'function') onUserUpdate(actionUser.id, patchOrUpdater)
      setActionUser((prev) => {
        if (!prev) return prev
        if (typeof patchOrUpdater === 'function') return patchOrUpdater(prev)
        return { ...prev, ...patchOrUpdater }
      })
    },
    [actionUser, onUserUpdate],
  )

  const closeRoleModal = useCallback(() => setRoleModalOpen(false), [])
  const closeTerminateModal = useCallback(() => setConfirmTerminateOpen(false), [])
  const closeRehireModal = useCallback(() => setConfirmRehireOpen(false), [])
  const closeMessageModal = useCallback(() => setMessageModalOpen(false), [])

  const openRoleModal = useCallback((user) => {
    setActionUser(user)
    setRoleAssignments(toEditableRoleAssignments(user))
    setRoleModalOpen(true)
  }, [])

  const addRoleAssignment = useCallback(() => {
    setRoleAssignments((prev) => [...prev, createDefaultAssignment(roleOptions[0])])
  }, [roleOptions])

  const removeRoleAssignment = useCallback((index) => {
    setRoleAssignments((prev) => {
      const next = prev.filter((_, idx) => idx !== index)
      return ensurePrimaryAssignment(next)
    })
  }, [])

  const changeRoleAssignment = useCallback((index, field, value) => {
    setRoleAssignments((prev) => {
      if (field === 'is_primary') {
        return prev.map((row, idx) => ({ ...row, is_primary: idx === index }))
      }
      return prev.map((row, idx) => {
        if (idx !== index) return row
        if (field === 'role') {
          const scopeType = getScopeTypeForRole(value)
          return {
            ...row,
            role: value,
            scope_type: scopeType,
            team_id: scopeType === 'site' || scopeType === 'client_site' ? row.team_id : null,
          }
        }
        return { ...row, [field]: value }
      })
    })
  }, [])

  const openTerminateModal = useCallback((user) => {
    setActionUser(user)
    setConfirmTerminateOpen(true)
  }, [])

  const openRehireModal = useCallback((user) => {
    setActionUser(user)
    setConfirmRehireOpen(true)
  }, [])

  const openMessageModal = useCallback((user) => {
    setActionUser(user)
    setMessageBody('')
    setMessageModalOpen(true)
  }, [])

  const handleRoleUpdate = useCallback(async () => {
    if (!actionUser || actionUpdating || isSelfUser(actionUser)) return
    setActionUpdating(true)
    try {
      const response = await replaceUserRoleAssignments(
        actionUser.id,
        toApiRoleAssignmentsPayload(roleAssignments),
      )
      applyUserUpdate({
        roles: response?.user?.roles || [],
        role_assignments: response?.user?.role_assignments || [],
      })
      pushStatusMessage('success', 'Role assignments updated.')
      setRoleModalOpen(false)
    } catch (err) {
      pushStatusMessage('danger', err.payload?.message || 'Unable to update role assignments.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, applyUserUpdate, isSelfUser, pushStatusMessage, roleAssignments])

  const handleTerminate = useCallback(async () => {
    if (!actionUser || actionUpdating || isSelfUser(actionUser) || actionUser.deleted_at) return
    setActionUpdating(true)
    try {
      await deleteUser(actionUser.id)
      applyUserUpdate({ deleted_at: new Date().toISOString() })
      pushStatusMessage('success', 'Staff terminated.')
      setConfirmTerminateOpen(false)
    } catch (err) {
      pushStatusMessage('danger', err.payload?.message || 'Unable to terminate staff.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, applyUserUpdate, isSelfUser, pushStatusMessage])

  const handleRehire = useCallback(async () => {
    if (!actionUser || actionUpdating || !actionUser.deleted_at) return
    setActionUpdating(true)
    try {
      const response = await restoreUser(actionUser.id)
      applyUserUpdate((prev) => ({
        ...prev,
        deleted_at: null,
        status: response?.user?.status || prev.status,
      }))
      pushStatusMessage('success', 'Staff rehired.')
      setConfirmRehireOpen(false)
    } catch (err) {
      pushStatusMessage('danger', err.payload?.message || 'Unable to rehire staff.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, applyUserUpdate, pushStatusMessage])

  const handleSendMessage = useCallback(async () => {
    if (!actionUser || actionUpdating || !messageBody.trim()) {
      if (!messageBody.trim()) pushStatusMessage('warning', 'Message cannot be empty.')
      return
    }
    setActionUpdating(true)
    try {
      await sendInAppMessage({ to_user_id: actionUser.id, body: messageBody.trim() })
      pushStatusMessage('success', 'Message sent.')
      setMessageModalOpen(false)
    } catch (err) {
      pushStatusMessage('danger', err.payload?.message || 'Unable to send message.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, actionUser, messageBody, pushStatusMessage])

  const buildActionsFor = useCallback(
    (user) => {
      if (!user) return { items: [], primary: null }
      const self = isSelfUser(user)
      const isTerminated = !!user.deleted_at

      const changeRole = canAssignRoles
        ? {
            key: 'change-role',
            label: 'Manage roles',
            onClick: () => openRoleModal(user),
            disabled: actionUpdating || self || isTerminated,
            title: self ? 'You cannot change your own role.' : undefined,
          }
        : null

      const terminate = canManageUsers
        ? {
            key: 'terminate',
            label: 'Terminate',
            onClick: () => openTerminateModal(user),
            className: 'text-danger',
            disabled: actionUpdating || self || isTerminated,
            buttonColor: 'danger',
            title: self ? 'You cannot terminate your own account.' : undefined,
          }
        : null

      const rehire = canManageUsers
        ? {
            key: 'rehire',
            label: 'Rehire',
            onClick: () => openRehireModal(user),
            disabled: actionUpdating,
            buttonColor: 'success',
          }
        : null

      const sendMessage = canMessage
        ? {
            key: 'send-message',
            label: 'Send message',
            onClick: () => openMessageModal(user),
            disabled: actionUpdating || self || isTerminated,
            title: self ? 'You cannot message yourself.' : undefined,
          }
        : null

      const items = isTerminated
        ? [rehire].filter(Boolean)
        : [sendMessage, changeRole, terminate].filter(Boolean)
      const primary = isTerminated ? rehire : terminate || sendMessage || changeRole || null

      return { items, primary }
    },
    [
      actionUpdating,
      canAssignRoles,
      canManageUsers,
      canMessage,
      isSelfUser,
      openMessageModal,
      openRehireModal,
      openRoleModal,
      openTerminateModal,
    ],
  )

  const getActionItems = useCallback((user) => buildActionsFor(user).items, [buildActionsFor])
  const getPrimaryAction = useCallback((user) => buildActionsFor(user).primary, [buildActionsFor])

  return {
    statusMessage,
    actionUpdating,
    actionUser,
    roleAssignments,
    addRoleAssignment,
    removeRoleAssignment,
    changeRoleAssignment,
    roleModalOpen,
    confirmTerminateOpen,
    confirmRehireOpen,
    messageModalOpen,
    messageBody,
    setMessageBody,
    getActionItems,
    getPrimaryAction,
    handleRoleUpdate,
    handleTerminate,
    handleRehire,
    handleSendMessage,
    closeRoleModal,
    closeTerminateModal,
    closeRehireModal,
    closeMessageModal,
    roleOptions,
    canAssignRoles,
    canManageUsers,
  }
}

export default useStaffActions
