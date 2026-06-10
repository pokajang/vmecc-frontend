import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Loader } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { CAlert, CButton, CContainer } from '@coreui/react'
import { useSelector } from 'react-redux'
import ButtonLoader from 'src/components/ButtonLoader'
import {
  deleteUser,
  fetchAuditLogs,
  fetchTeams,
  fetchUserSessions,
  fetchUsers,
  lockUser,
  replaceUserRoleAssignments,
  restoreUser,
  sendUserPasswordReset,
  unlockUser,
  updateUserStatus,
} from 'src/services/apiClient'
import BackButton from 'src/components/BackButton'
import { CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import UserConfirmModal from 'src/components/users/UserConfirmModal'
import UserRoleModal from 'src/components/users/UserRoleModal'
import UserSummaryCard from 'src/components/users/UserSummaryCard'
import LoginRecordsPanel from 'src/components/users/LoginRecordsPanel'
import UserSessionsPanel from 'src/components/users/UserSessionsPanel'
import UserAuditPanel from 'src/components/users/UserAuditPanel'
import { exportWorkbook } from 'src/utils/exportXlsx'
import { EMPTY, formatDateTime, renderStatus, toSlug } from 'src/utils/users'
import { hasPermission } from 'src/utils/authz'
import { createDefaultAssignment, roles } from './CreateStaffForm'
import {
  ensurePrimaryAssignment,
  getScopeTypeForRole,
  toApiRoleAssignmentsPayload,
  toEditableRoleAssignments,
} from 'src/utils/roleAssignments'

const formatAuditAction = (value) => {
  if (!value) return EMPTY
  return value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const getActorLabel = (log) => {
  if (log.actor?.name) return log.actor.name
  if (log.actor?.email) return log.actor.email
  return EMPTY
}

const getAuditDetails = (log) => {
  if (log.action === 'user_status_changed') {
    const from = log.metadata?.from || EMPTY
    const to = log.metadata?.to || EMPTY
    return `Status changed from ${from} to ${to}`
  }
  if (log.action === 'user_created') {
    const role = log.metadata?.role
    return role ? `User created with role ${role}` : 'User created'
  }
  if (log.action === 'user_role_changed') {
    const fromRoles = Array.isArray(log.metadata?.from_roles) ? log.metadata.from_roles : []
    const toRoles = Array.isArray(log.metadata?.to_roles) ? log.metadata.to_roles : []
    const fromLabel = fromRoles.length ? fromRoles.join(', ') : EMPTY
    const toLabel = toRoles.length ? toRoles.join(', ') : EMPTY
    return `Roles changed from ${fromLabel} to ${toLabel}`
  }
  if (log.action === 'password_reset_sent') {
    const method = log.metadata?.method || 'admin'
    return `Password reset sent (${method})`
  }
  if (log.action === 'user_deleted') return 'User deleted'
  if (log.action === 'user_permanently_deleted') return 'User permanently deleted'
  if (log.action === 'user_restored') return 'User restored'
  if (log.action === 'user_locked') return 'User locked'
  if (log.action === 'user_unlocked') return 'User unlocked'
  if (log.action === 'user_session_revoked') return 'Session revoked'
  if (log.action === 'user_sessions_revoked_all') return 'All sessions revoked'
  return log.metadata?.note || EMPTY
}

// --- modal state reducer ---

const MODAL_KEYS = [
  'deactivate',
  'activate',
  'reset',
  'delete',
  'restore',
  'lock',
  'unlock',
  'role',
]
const initialModalState = Object.fromEntries(MODAL_KEYS.map((k) => [k, false]))

const modalReducer = (state, action) => {
  if (action.type === 'open') return { ...initialModalState, [action.modal]: true }
  if (action.type === 'close') return { ...state, [action.modal]: false }
  return state
}

const defaultRole = roles.includes('Contract Manager')
  ? 'Contract Manager'
  : roles[0] || 'Contract Manager'

const UserProfile = () => {
  const { id, slug } = useParams()
  const navigate = useNavigate()
  const authUser = useSelector((state) => state.authUser)
  const canManageUsers = useMemo(() => hasPermission(authUser, 'users.manage'), [authUser])
  const canAssignRoles = useMemo(() => hasPermission(authUser, 'roles.assign'), [authUser])

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [actionUpdating, setActionUpdating] = useState(false)
  const [modalState, dispatchModal] = useReducer(modalReducer, initialModalState)
  const [teams, setTeams] = useState([])
  const [roleAssignments, setRoleAssignments] = useState([createDefaultAssignment(defaultRole)])
  const [actionMessage, setActionMessage] = useState(null)
  const [exporting, setExporting] = useState(false)
  const actionTimerRef = useRef(null)

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [usersResponse, teamsResponse] = await Promise.all([
          fetchUsers({ include_deleted: 1 }),
          fetchTeams(),
        ])
        const found = (usersResponse?.data || []).find((u) => String(u.id) === String(id))
        if (!found) {
          setError('User not found.')
        } else {
          setUser(found)
          setRoleAssignments(toEditableRoleAssignments(found))
        }
        setTeams(teamsResponse?.data || [])
      } catch (err) {
        setError(err.payload?.message || 'Unable to load user.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canManageUsers, id])

  useEffect(() => {
    if (!user?.id) return
    const desired = toSlug(user.name || user.email || 'user')
    if (slug !== desired) {
      navigate(`/admin/users/${user.id}/${desired}`, { replace: true })
    }
  }, [navigate, slug, user?.email, user?.id, user?.name])

  useEffect(() => {
    return () => {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current)
    }
  }, [])

  const pushActionMessage = useCallback((type, message) => {
    setActionMessage({ type, message })
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current)
    actionTimerRef.current = setTimeout(() => setActionMessage(null), 3000)
  }, [])

  const isSelf = useMemo(
    () =>
      String(authUser?.id || '') === String(user?.id || '') ||
      (authUser?.email && user?.email && authUser.email === user.email),
    [authUser?.email, authUser?.id, user?.email, user?.id],
  )

  const sessionsActionsDisabled = !!user?.deleted_at || (user?.status && user.status !== 'Active')
  const sessionsDisabledReason = user?.deleted_at
    ? 'User is deleted.'
    : user?.status && user.status !== 'Active'
      ? 'User is not active.'
      : ''

  const handleToggleStatus = useCallback(async () => {
    if (!user || statusUpdating || isSelf) return
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    setStatusUpdating(true)
    try {
      await updateUserStatus(user.id, nextStatus)
      setUser((prev) => (prev ? { ...prev, status: nextStatus } : prev))
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to update status.')
    } finally {
      setStatusUpdating(false)
    }
  }, [isSelf, pushActionMessage, statusUpdating, user])

  const handleStatusClick = useCallback(() => {
    if (isSelf || user?.deleted_at) return
    dispatchModal({ type: 'open', modal: user?.status === 'Active' ? 'deactivate' : 'activate' })
  }, [isSelf, user?.deleted_at, user?.status])

  const addRoleAssignment = useCallback(() => {
    setRoleAssignments((prev) => [...prev, createDefaultAssignment(defaultRole)])
  }, [])

  const removeRoleAssignment = useCallback((index) => {
    setRoleAssignments((prev) => ensurePrimaryAssignment(prev.filter((_, idx) => idx !== index)))
  }, [])

  const changeRoleAssignment = useCallback((index, field, value) => {
    setRoleAssignments((prev) => {
      if (field === 'is_primary') {
        return prev.map((assignment, idx) => ({ ...assignment, is_primary: idx === index }))
      }
      return prev.map((assignment, idx) => {
        if (idx !== index) return assignment
        if (field === 'role') {
          const scopeType = getScopeTypeForRole(value)
          return {
            ...assignment,
            role: value,
            scope_type: scopeType,
            team_id:
              scopeType === 'site' || scopeType === 'client_site' ? assignment.team_id : null,
          }
        }
        return { ...assignment, [field]: value }
      })
    })
  }, [])

  const handleConfirmDeactivate = useCallback(() => {
    dispatchModal({ type: 'close', modal: 'deactivate' })
    handleToggleStatus()
  }, [handleToggleStatus])

  const handleConfirmActivate = useCallback(() => {
    dispatchModal({ type: 'close', modal: 'activate' })
    handleToggleStatus()
  }, [handleToggleStatus])

  const handleRoleUpdate = useCallback(async () => {
    if (!user || actionUpdating || isSelf) return
    setActionUpdating(true)
    try {
      const response = await replaceUserRoleAssignments(
        user.id,
        toApiRoleAssignmentsPayload(roleAssignments),
      )
      const nextUser = response?.user || {}
      setUser((prev) =>
        prev
          ? {
              ...prev,
              roles: nextUser.roles || prev.roles,
              role_assignments: nextUser.role_assignments || prev.role_assignments,
            }
          : prev,
      )
      setRoleAssignments(
        toEditableRoleAssignments({
          roles: nextUser.roles || user.roles,
          role_assignments: nextUser.role_assignments || user.role_assignments,
        }),
      )
      pushActionMessage('success', 'Role assignments updated.')
      dispatchModal({ type: 'close', modal: 'role' })
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to update role assignments.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, isSelf, pushActionMessage, roleAssignments, user])

  const handlePasswordReset = useCallback(async () => {
    if (!user || actionUpdating || isSelf) return
    setActionUpdating(true)
    try {
      await sendUserPasswordReset(user.id)
      pushActionMessage('success', 'Password reset link sent.')
      dispatchModal({ type: 'close', modal: 'reset' })
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to send reset link.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, isSelf, pushActionMessage, user])

  const handleDeleteUser = useCallback(async () => {
    if (!user || actionUpdating || isSelf) return
    setActionUpdating(true)
    try {
      await deleteUser(user.id)
      pushActionMessage('success', 'User deleted.')
      navigate('/admin/users')
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to delete user.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, isSelf, navigate, pushActionMessage, user])

  const handleRestoreUser = useCallback(async () => {
    if (!user || actionUpdating) return
    setActionUpdating(true)
    try {
      const response = await restoreUser(user.id)
      setUser((prev) =>
        prev ? { ...prev, deleted_at: null, status: response?.user?.status || prev.status } : prev,
      )
      pushActionMessage('success', 'User restored.')
      dispatchModal({ type: 'close', modal: 'restore' })
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to restore user.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, pushActionMessage, user])

  const handleLockUser = useCallback(async () => {
    if (!user || actionUpdating || isSelf) return
    setActionUpdating(true)
    try {
      const response = await lockUser(user.id, 'admin_lock')
      setUser((prev) =>
        prev
          ? {
              ...prev,
              locked_at: response?.user?.locked_at || new Date().toISOString(),
              lock_reason: response?.user?.lock_reason || 'admin_lock',
              failed_login_count: response?.user?.failed_login_count ?? prev.failed_login_count,
            }
          : prev,
      )
      pushActionMessage('success', 'Account locked.')
      dispatchModal({ type: 'close', modal: 'lock' })
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to lock account.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, isSelf, pushActionMessage, user])

  const handleUnlockUser = useCallback(async () => {
    if (!user || actionUpdating) return
    setActionUpdating(true)
    try {
      await unlockUser(user.id)
      setUser((prev) =>
        prev ? { ...prev, locked_at: null, lock_reason: null, failed_login_count: 0 } : prev,
      )
      pushActionMessage('success', 'Account unlocked.')
      dispatchModal({ type: 'close', modal: 'unlock' })
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to unlock account.')
    } finally {
      setActionUpdating(false)
    }
  }, [actionUpdating, pushActionMessage, user])

  const handleOpenRoleModal = useCallback(() => {
    setRoleAssignments(toEditableRoleAssignments(user))
    dispatchModal({ type: 'open', modal: 'role' })
  }, [user])

  const handleExportXlsx = useCallback(async () => {
    if (!user || exporting) return
    setExporting(true)
    try {
      const [sessionsRes, logsRes] = await Promise.all([
        fetchUserSessions(user.id),
        fetchAuditLogs({ subject_id: user.id, limit: 200 }),
      ])

      const loginHeaders = ['#', 'Time', 'Status', 'Reason', 'IP', 'Device']
      const loginRows = (user.login_records || []).map((record, index) => {
        const { label } = renderStatus(record.status)
        const when =
          record.timestamp || record.logged_at || record.created_at || record.time || null
        const reason = record.reason || record.error || EMPTY
        const ip = record.ip_address || EMPTY
        const device = record.device_info || record.user_agent || record.device_id || EMPTY
        return [index + 1, formatDateTime(when), label, reason, ip, device]
      })

      const sessions = sessionsRes?.data || []
      const sessionHeaders = ['#', 'Status', 'Device', 'IP', 'Created', 'Last seen', 'Expires']
      const sessionRows = sessions.map((session, index) => {
        const status = session.active
          ? 'Active'
          : session.revoked_at || session.logged_out_at
            ? 'Revoked'
            : 'Expired'
        return [
          index + 1,
          status,
          session.user_agent || '-',
          session.ip_address || '-',
          formatDateTime(session.created_at),
          formatDateTime(session.last_seen_at),
          formatDateTime(session.expires_at),
        ]
      })

      const logs = logsRes?.data || []
      const auditHeaders = ['#', 'Time', 'Action', 'Actor', 'IP', 'Details']
      const auditRows = logs.map((log, index) => [
        index + 1,
        formatDateTime(log.created_at),
        formatAuditAction(log.action),
        getActorLabel(log),
        log.ip_address || EMPTY,
        getAuditDetails(log),
      ])

      const userSlug = toSlug(user.name || user.email || 'user')
      exportWorkbook({
        sheets: [
          { name: 'Login Records', headers: loginHeaders, rows: loginRows },
          { name: 'Active Sessions', headers: sessionHeaders, rows: sessionRows },
          { name: 'Admin Activity (latest 200)', headers: auditHeaders, rows: auditRows },
        ],
        filename: `user-${userSlug}-activity-${new Date().toISOString().slice(0, 10)}.xlsx`,
      })
    } catch (err) {
      pushActionMessage('danger', err.payload?.message || 'Unable to export activity.')
    } finally {
      setExporting(false)
    }
  }, [exporting, pushActionMessage, user])

  if (loading) {
    return (
      <div className="text-center py-5 text-body-secondary">
        <Loader size={24} className="icon-spin" />
      </div>
    )
  }

  if (!canManageUsers) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to view users.
      </CAlert>
    )
  }

  if (error || !user) {
    return (
      <CAlert color="danger" className="my-4">
        {error || 'User not found.'}
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <BackButton to="/admin/users" />
        <div className="d-flex align-items-center gap-2">
          <CButton
            size="sm"
            color={user.status === 'Active' ? 'danger' : 'secondary'}
            variant="outline"
            disabled={statusUpdating || isSelf || user.deleted_at}
            onClick={handleStatusClick}
            title={
              isSelf
                ? 'You cannot change your own status.'
                : user.deleted_at
                  ? 'Restore the user before changing status.'
                  : undefined
            }
          >
            {statusUpdating ? (
              <ButtonLoader label="Updating..." />
            ) : user.deleted_at ? (
              'Deleted'
            ) : user.status === 'Active' ? (
              'Deactivate'
            ) : (
              'Activate'
            )}
          </CButton>
          <CDropdown alignment="end">
            <CDropdownToggle color="secondary" variant="outline" size="sm">
              More
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem
                onClick={handleExportXlsx}
                disabled={exporting}
                className="cursor-pointer"
              >
                {exporting ? <ButtonLoader label="Exporting..." /> : 'Export XLSX'}
              </CDropdownItem>
              {user.deleted_at ? (
                <CDropdownItem
                  onClick={() => dispatchModal({ type: 'open', modal: 'restore' })}
                  disabled={actionUpdating}
                  className="cursor-pointer"
                >
                  Restore user
                </CDropdownItem>
              ) : (
                <>
                  <CDropdownItem
                    onClick={() => dispatchModal({ type: 'open', modal: 'reset' })}
                    disabled={actionUpdating || isSelf}
                    className="cursor-pointer"
                  >
                    Reset password
                  </CDropdownItem>
                  <CDropdownItem
                    onClick={handleOpenRoleModal}
                    disabled={actionUpdating || isSelf || !canAssignRoles}
                    className="cursor-pointer"
                  >
                    Manage roles
                  </CDropdownItem>
                  <CDropdownItem
                    onClick={() => dispatchModal({ type: 'open', modal: 'delete' })}
                    disabled={actionUpdating || isSelf}
                    className="text-danger cursor-pointer"
                  >
                    Delete user
                  </CDropdownItem>
                  {user.locked_at ? (
                    <CDropdownItem
                      onClick={() => dispatchModal({ type: 'open', modal: 'unlock' })}
                      disabled={actionUpdating || isSelf}
                      className="cursor-pointer"
                    >
                      Unlock account
                    </CDropdownItem>
                  ) : (
                    <CDropdownItem
                      onClick={() => dispatchModal({ type: 'open', modal: 'lock' })}
                      disabled={actionUpdating || isSelf}
                      className="text-danger cursor-pointer"
                    >
                      Lock account
                    </CDropdownItem>
                  )}
                </>
              )}
            </CDropdownMenu>
          </CDropdown>
        </div>
      </div>

      {actionMessage && (
        <CAlert color={actionMessage.type} className="my-3">
          {actionMessage.message}
        </CAlert>
      )}

      <UserSummaryCard user={user} />

      <UserConfirmModal
        visible={modalState.deactivate}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${user?.name || 'this user'} from the system? The user will be notified and will no longer be able to access the system.`}
        confirmLabel="Deactivate"
        confirmColor="danger"
        onConfirm={handleConfirmDeactivate}
        onClose={() => dispatchModal({ type: 'close', modal: 'deactivate' })}
        confirmDisabled={statusUpdating}
        cancelDisabled={statusUpdating}
      />

      <UserConfirmModal
        visible={modalState.activate}
        title="Activate User"
        message={`Are you sure you want to activate ${user?.name || 'this user'} for the system? The user will be notified and will regain access to the system.`}
        confirmLabel="Activate"
        confirmColor="success"
        onConfirm={handleConfirmActivate}
        onClose={() => dispatchModal({ type: 'close', modal: 'activate' })}
        confirmDisabled={statusUpdating}
        cancelDisabled={statusUpdating}
      />

      <UserRoleModal
        visible={modalState.role}
        roleAssignments={roleAssignments}
        teams={teams}
        onAddAssignment={addRoleAssignment}
        onRemoveAssignment={removeRoleAssignment}
        onChangeAssignment={changeRoleAssignment}
        onClose={() => dispatchModal({ type: 'close', modal: 'role' })}
        onConfirm={handleRoleUpdate}
        confirmDisabled={actionUpdating || isSelf || !canAssignRoles}
        loading={actionUpdating}
      />

      <UserConfirmModal
        visible={modalState.reset}
        title="Reset Password"
        message={`Send a password reset link to ${user?.email || 'this user'}?`}
        confirmLabel="Send reset link"
        confirmColor="primary"
        onConfirm={handlePasswordReset}
        onClose={() => dispatchModal({ type: 'close', modal: 'reset' })}
        confirmDisabled={actionUpdating || isSelf}
        cancelDisabled={actionUpdating}
      />

      <UserConfirmModal
        visible={modalState.delete}
        title="Delete User"
        message={`This will disable access for ${user?.name || 'this user'}. You can restore later.`}
        confirmLabel="Delete"
        confirmColor="danger"
        onConfirm={handleDeleteUser}
        onClose={() => dispatchModal({ type: 'close', modal: 'delete' })}
        confirmDisabled={actionUpdating || isSelf}
        cancelDisabled={actionUpdating}
      />

      <UserConfirmModal
        visible={modalState.restore}
        title="Restore User"
        message={`Restore access for ${user?.name || 'this user'}?`}
        confirmLabel="Restore"
        confirmColor="success"
        onConfirm={handleRestoreUser}
        onClose={() => dispatchModal({ type: 'close', modal: 'restore' })}
        confirmDisabled={actionUpdating}
        cancelDisabled={actionUpdating}
      />

      <UserConfirmModal
        visible={modalState.lock}
        title="Lock Account"
        message={`Lock access for ${user?.name || 'this user'}? This will revoke active sessions.`}
        confirmLabel="Lock account"
        confirmColor="danger"
        onConfirm={handleLockUser}
        onClose={() => dispatchModal({ type: 'close', modal: 'lock' })}
        confirmDisabled={actionUpdating || isSelf}
        cancelDisabled={actionUpdating}
      />

      <UserConfirmModal
        visible={modalState.unlock}
        title="Unlock Account"
        message={`Unlock access for ${user?.name || 'this user'}? Failed login counters will be reset.`}
        confirmLabel="Unlock account"
        confirmColor="success"
        onConfirm={handleUnlockUser}
        onClose={() => dispatchModal({ type: 'close', modal: 'unlock' })}
        confirmDisabled={actionUpdating || isSelf}
        cancelDisabled={actionUpdating}
      />

      <LoginRecordsPanel records={user?.login_records || []} lastLoginAt={user?.last_login_at} />
      <UserSessionsPanel
        userId={user.id}
        actionsDisabled={sessionsActionsDisabled}
        actionsDisabledReason={sessionsDisabledReason}
      />
      <UserAuditPanel userId={user.id} />
    </CContainer>
  )
}

export default UserProfile
