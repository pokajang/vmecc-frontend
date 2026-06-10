import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CAlert, CButton, CToast, CToastBody, CToastHeader, CToaster } from '@coreui/react'
import { Pencil, Save } from 'lucide-react'
import ButtonLoader from 'src/components/ButtonLoader'
import TableLoader from 'src/components/TableLoader'
import { useSelector } from 'react-redux'
import { hasPermission } from 'src/utils/authz'
import {
  LOCKED_ROLE,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PERM_TO_GROUP,
  VIEW_MODE_MATRIX,
  VIEW_MODE_ROLE,
  VIEW_MODE_STORAGE_KEY,
} from './rolePermissionDomain'
import {
  RolePermissionLegend,
  RolePermissionMatrixTable,
  RolePermissionRoleEditor,
  RolePermissionToolbar,
} from './components/RolePermissionMatrixSections'
import useRolePermissionData from './hooks/useRolePermissionData'

const scrollbarStyle = `
  .rpm-scroll::-webkit-scrollbar {
    height: 4px;
    width: 4px;
  }
  .rpm-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .rpm-scroll::-webkit-scrollbar-thumb {
    background: #dee2e6;
    border-radius: 4px;
  }
  .rpm-scroll::-webkit-scrollbar-thumb:hover {
    background: #adb5bd;
  }
`

const RolePermissionMatrix = () => {
  const authUser = useSelector((state) => state.authUser)
  const canManage = useMemo(() => hasPermission(authUser, 'settings.manage'), [authUser])
  const toaster = useRef()
  const [toast, addToast] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [permSearch, setPermSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')
  const [changesOnly, setChangesOnly] = useState(false)
  const [focusedRole, setFocusedRole] = useState('')
  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
      return stored === VIEW_MODE_ROLE ? VIEW_MODE_ROLE : VIEW_MODE_MATRIX
    } catch {
      return VIEW_MODE_MATRIX
    }
  })

  const pushToast = useCallback((message, { title = '', color = 'light' } = {}) => {
    addToast(
      <CToast autohide delay={4000} color={color}>
        {title && (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        )}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const {
    cancel,
    error,
    loading,
    localMatrix,
    permissions,
    roles,
    save,
    saving,
    serverMatrix,
    togglePermission,
  } = useRolePermissionData({ editMode, setEditMode, setChangesOnly, pushToast })

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
    } catch {
      // Non-fatal in private mode / restricted environments.
    }
  }, [viewMode])

  const visibleRoles = useMemo(
    () => (roleFilter === 'All' ? roles : roles.filter((role) => role === roleFilter)),
    [roles, roleFilter],
  )
  const roleViewOptions = useMemo(
    () => roles.filter((role) => String(role || '').trim().length > 0),
    [roles],
  )
  const defaultFocusedRole = useMemo(
    () => roleViewOptions.find((role) => role !== LOCKED_ROLE) || roleViewOptions[0] || '',
    [roleViewOptions],
  )
  const activeFocusedRole =
    focusedRole && roleViewOptions.includes(focusedRole) ? focusedRole : defaultFocusedRole
  const activeRolesForChanges = useMemo(
    () =>
      viewMode === VIEW_MODE_ROLE ? (activeFocusedRole ? [activeFocusedRole] : []) : visibleRoles,
    [activeFocusedRole, viewMode, visibleRoles],
  )

  const orderedPermissions = useMemo(() => {
    const grouped = PERMISSION_GROUPS.flatMap((group) => group.permissions)
    const ungrouped = permissions.filter((permission) => !grouped.includes(permission))
    return [...grouped.filter((permission) => permissions.includes(permission)), ...ungrouped]
  }, [permissions])

  const filteredPermissions = useMemo(() => {
    const query = permSearch.trim().toLowerCase()
    return orderedPermissions.filter((permission) => {
      const label = (PERMISSION_LABELS[permission] || permission).toLowerCase()
      const group = (PERM_TO_GROUP[permission] || '').toLowerCase()
      if (groupFilter !== 'All' && PERM_TO_GROUP[permission] !== groupFilter) return false
      if (
        query &&
        !label.includes(query) &&
        !permission.includes(query) &&
        !group.includes(query)
      ) {
        return false
      }
      if (!changesOnly) return true
      return activeRolesForChanges.some((role) => {
        if (role === LOCKED_ROLE) return false
        const current = (localMatrix[role] || new Set()).has(permission)
        const previous = new Set(serverMatrix[role] || []).has(permission)
        return current !== previous
      })
    })
  }, [
    activeRolesForChanges,
    changesOnly,
    groupFilter,
    localMatrix,
    orderedPermissions,
    permSearch,
    serverMatrix,
  ])

  const groupedRows = useMemo(() => {
    const result = []
    let lastGroup = null
    for (const permission of filteredPermissions) {
      const group = PERM_TO_GROUP[permission] || 'Other'
      if (group !== lastGroup) {
        result.push({ type: 'header', group })
        lastGroup = group
      }
      result.push({ type: 'row', perm: permission })
    }
    return result
  }, [filteredPermissions])

  const hasActiveFilters =
    permSearch ||
    groupFilter !== 'All' ||
    (viewMode === VIEW_MODE_MATRIX && roleFilter !== 'All') ||
    (viewMode === VIEW_MODE_ROLE && activeFocusedRole && activeFocusedRole !== defaultFocusedRole)

  const clearFilters = useCallback(() => {
    setPermSearch('')
    setGroupFilter('All')
    if (viewMode === VIEW_MODE_MATRIX) {
      setRoleFilter('All')
    } else {
      setFocusedRole(defaultFocusedRole)
    }
    setChangesOnly(false)
  }, [defaultFocusedRole, viewMode])

  if (!canManage) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to manage role permissions.
      </CAlert>
    )
  }

  return (
    <>
      <style>{scrollbarStyle}</style>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="fw-semibold">
            {viewMode === VIEW_MODE_ROLE ? 'Role Permission Editor' : 'Role Permission Matrix'}
          </span>
          <div className="d-flex align-items-center">
            {editMode ? (
              <>
                <CButton
                  size="sm"
                  className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                  onClick={save}
                  disabled={saving || loading}
                >
                  {saving ? (
                    <ButtonLoader label="Saving..." size={13} />
                  ) : (
                    <Save size={13} className="me-1 align-text-bottom" />
                  )}
                  {!saving ? 'Save' : null}
                </CButton>
                <CButton
                  size="sm"
                  className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                  onClick={cancel}
                  disabled={saving}
                >
                  Cancel
                </CButton>
              </>
            ) : (
              <CButton
                size="sm"
                className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
                onClick={() => setEditMode(true)}
                disabled={loading}
              >
                <Pencil size={13} className="me-1 align-text-bottom" />
                Edit
              </CButton>
            )}
          </div>
        </div>

        {!loading && !error && (
          <RolePermissionToolbar
            activeFocusedRole={activeFocusedRole}
            changesOnly={changesOnly}
            clearFilters={clearFilters}
            editMode={editMode}
            filteredPermissions={filteredPermissions}
            groupFilter={groupFilter}
            hasActiveFilters={hasActiveFilters}
            permissions={permissions}
            permSearch={permSearch}
            roleFilter={roleFilter}
            roles={roles}
            roleViewOptions={roleViewOptions}
            setChangesOnly={setChangesOnly}
            setFocusedRole={setFocusedRole}
            setGroupFilter={setGroupFilter}
            setPermSearch={setPermSearch}
            setRoleFilter={setRoleFilter}
            setViewMode={setViewMode}
            viewMode={viewMode}
          />
        )}

        {loading && <TableLoader />}

        {!loading && error && (
          <div className="p-3">
            <CAlert color="danger" className="mb-0">
              {error}
            </CAlert>
          </div>
        )}

        {!loading && !error && viewMode === VIEW_MODE_MATRIX && (
          <RolePermissionMatrixTable
            editMode={editMode}
            groupedRows={groupedRows}
            localMatrix={localMatrix}
            saving={saving}
            serverMatrix={serverMatrix}
            togglePermission={togglePermission}
            visibleRoles={visibleRoles}
          />
        )}

        {!loading && !error && viewMode === VIEW_MODE_ROLE && (
          <RolePermissionRoleEditor
            activeFocusedRole={activeFocusedRole}
            editMode={editMode}
            groupedRows={groupedRows}
            localMatrix={localMatrix}
            saving={saving}
            serverMatrix={serverMatrix}
            togglePermission={togglePermission}
          />
        )}

        {!loading && !error && <RolePermissionLegend />}
      </div>
    </>
  )
}

export default RolePermissionMatrix
