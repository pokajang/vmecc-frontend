import React from 'react'
import {
  CAlert,
  CButton,
  CButtonGroup,
  CFormInput,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Lock, X } from 'lucide-react'
import {
  LOCKED_ROLE,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  VIEW_MODE_MATRIX,
  VIEW_MODE_ROLE,
} from '../rolePermissionDomain'

export const RolePermissionToolbar = ({
  activeFocusedRole,
  changesOnly,
  clearFilters,
  editMode,
  filteredPermissions,
  groupFilter,
  hasActiveFilters,
  permissions,
  permSearch,
  roleFilter,
  roles,
  roleViewOptions,
  setChangesOnly,
  setFocusedRole,
  setGroupFilter,
  setPermSearch,
  setRoleFilter,
  setViewMode,
  viewMode,
}) => (
  <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
    {viewMode === VIEW_MODE_ROLE ? (
      <CFormSelect
        size="sm"
        value={activeFocusedRole}
        onChange={(e) => setFocusedRole(e.target.value)}
        style={{ maxWidth: 240 }}
      >
        {roleViewOptions.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </CFormSelect>
    ) : (
      <CFormSelect
        size="sm"
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
        style={{ maxWidth: 220 }}
      >
        <option value="All">All Roles</option>
        {roles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </CFormSelect>
    )}
    <CFormSelect
      size="sm"
      value={groupFilter}
      onChange={(e) => setGroupFilter(e.target.value)}
      style={{ maxWidth: 170 }}
    >
      <option value="All">All Groups</option>
      {PERMISSION_GROUPS.map((group) => (
        <option key={group.label} value={group.label}>
          {group.label}
        </option>
      ))}
    </CFormSelect>
    <CFormInput
      size="sm"
      placeholder="Search permissions..."
      value={permSearch}
      onChange={(e) => setPermSearch(e.target.value)}
      style={{ maxWidth: 220 }}
    />
    {editMode && (
      <label
        className="d-flex align-items-center gap-1 small text-muted mb-0"
        style={{ cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          className="form-check-input mt-0"
          checked={changesOnly}
          onChange={(e) => setChangesOnly(e.target.checked)}
        />
        Changes only
      </label>
    )}
    {hasActiveFilters && (
      <CButton
        size="sm"
        className="text-muted px-2 py-1 border-0 bg-transparent shadow-none d-flex align-items-center gap-1"
        onClick={clearFilters}
      >
        <X size={12} />
        Clear
      </CButton>
    )}
    <span className="small text-muted">
      {filteredPermissions.length} of {permissions.length} permissions
      {viewMode === VIEW_MODE_ROLE && activeFocusedRole && ` | ${activeFocusedRole}`}
      {viewMode === VIEW_MODE_MATRIX && roleFilter !== 'All' && ` | ${roleFilter}`}
    </span>
    <CButtonGroup size="sm" role="group" aria-label="Role permissions view" className="ms-auto">
      <CButton
        color={viewMode === VIEW_MODE_MATRIX ? 'primary' : 'light'}
        onClick={() => setViewMode(VIEW_MODE_MATRIX)}
      >
        Matrix
      </CButton>
      <CButton
        color={viewMode === VIEW_MODE_ROLE ? 'primary' : 'light'}
        onClick={() => setViewMode(VIEW_MODE_ROLE)}
      >
        Role-focused
      </CButton>
    </CButtonGroup>
  </div>
)

export const RolePermissionMatrixTable = ({
  editMode,
  groupedRows,
  localMatrix,
  saving,
  serverMatrix,
  togglePermission,
  visibleRoles,
}) => (
  <div className="rounded-3 shadow-sm overflow-hidden bg-white mt-2">
    <div className="rpm-scroll" style={{ overflowX: 'auto' }}>
      <CTable align="middle" className="mb-0" hover responsive>
        <CTableHead color="light">
          <CTableRow>
            <CTableHeaderCell
              className="align-middle"
              style={{
                minWidth: 200,
                position: 'sticky',
                left: 0,
                zIndex: 2,
                background: '#f8f9fa',
              }}
            >
              Permission
            </CTableHeaderCell>
            {visibleRoles.map((role) => (
              <CTableHeaderCell
                key={role}
                className="text-center align-middle"
                style={{ minWidth: 140 }}
              >
                {role === LOCKED_ROLE && (
                  <Lock size={12} className="me-1 text-muted align-text-bottom" />
                )}
                {role}
              </CTableHeaderCell>
            ))}
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {groupedRows.length === 0 && (
            <CTableRow>
              <CTableDataCell
                colSpan={visibleRoles.length + 1}
                className="text-center text-muted py-4 small"
              >
                No permissions match the current filters.
              </CTableDataCell>
            </CTableRow>
          )}
          {groupedRows.map((item, index) => {
            if (item.type === 'header') {
              return (
                <CTableRow key={`group-${item.group}-${index}`} className="table-light">
                  <CTableDataCell
                    colSpan={visibleRoles.length + 1}
                    className="small fw-semibold text-muted py-1 px-3"
                    style={{
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontSize: '0.7rem',
                    }}
                  >
                    {item.group}
                  </CTableDataCell>
                </CTableRow>
              )
            }

            const { perm } = item
            const label = PERMISSION_LABELS[perm] || perm
            return (
              <CTableRow key={perm}>
                <CTableDataCell
                  className="align-middle"
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    background: '#fff',
                  }}
                >
                  <div className="fw-medium">{label}</div>
                  <div className="text-muted small">{perm}</div>
                </CTableDataCell>
                {visibleRoles.map((role) => {
                  const isLocked = role === LOCKED_ROLE
                  const checked = isLocked ? true : (localMatrix[role] || new Set()).has(perm)
                  const wasChecked = isLocked ? true : new Set(serverMatrix[role] || []).has(perm)
                  const changed = !isLocked && checked !== wasChecked

                  return (
                    <CTableDataCell
                      key={role}
                      className="text-center align-middle"
                      style={{
                        background: changed ? (checked ? '#d1f5d3' : '#fde8e8') : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={checked}
                        disabled={isLocked || !editMode || saving}
                        onChange={() => togglePermission(role, perm)}
                        aria-label={`${role} - ${label}`}
                        style={{ cursor: isLocked || !editMode ? 'default' : 'pointer' }}
                      />
                    </CTableDataCell>
                  )
                })}
              </CTableRow>
            )
          })}
        </CTableBody>
      </CTable>
    </div>
  </div>
)

export const RolePermissionRoleEditor = ({
  activeFocusedRole,
  editMode,
  groupedRows,
  localMatrix,
  saving,
  serverMatrix,
  togglePermission,
}) => (
  <div className="p-3">
    {!activeFocusedRole && (
      <CAlert color="warning" className="mb-0">
        No roles available.
      </CAlert>
    )}
    {activeFocusedRole && groupedRows.length === 0 && (
      <div className="text-center text-muted py-4 small">
        No permissions match the current filters.
      </div>
    )}
    {activeFocusedRole &&
      groupedRows.map((item, index) => {
        if (item.type === 'header') {
          return (
            <div
              key={`role-group-${item.group}-${index}`}
              className="small fw-semibold text-muted mt-3 mb-2"
              style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.7rem' }}
            >
              {item.group}
            </div>
          )
        }

        const { perm } = item
        const label = PERMISSION_LABELS[perm] || perm
        const isLocked = activeFocusedRole === LOCKED_ROLE
        const checked = isLocked ? true : (localMatrix[activeFocusedRole] || new Set()).has(perm)
        const wasChecked = isLocked
          ? true
          : new Set(serverMatrix[activeFocusedRole] || []).has(perm)
        const changed = !isLocked && checked !== wasChecked

        return (
          <div
            key={`role-${activeFocusedRole}-${perm}`}
            className="d-flex justify-content-between align-items-center border rounded px-3 py-2 mb-2"
            style={{ background: changed ? (checked ? '#d1f5d3' : '#fde8e8') : '#fff' }}
          >
            <div>
              <div className="fw-medium">{label}</div>
              <div className="text-muted small">{perm}</div>
            </div>
            <input
              type="checkbox"
              className="form-check-input"
              checked={checked}
              disabled={isLocked || !editMode || saving}
              onChange={() => togglePermission(activeFocusedRole, perm)}
              aria-label={`${activeFocusedRole} - ${label}`}
              style={{ cursor: isLocked || !editMode ? 'default' : 'pointer' }}
            />
          </div>
        )
      })}
  </div>
)

export const RolePermissionLegend = () => (
  <div className="pt-2 mt-2 border-top text-muted small">
    <Lock size={11} className="me-1 align-text-bottom" />
    System Administrator always has all permissions and cannot be edited. &nbsp;Changes take effect
    immediately for active sessions.
    <span
      className="ms-2"
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        background: '#d1f5d3',
        border: '1px solid #ccc',
        verticalAlign: 'middle',
      }}
    />
    &nbsp;= adding&nbsp;
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        background: '#fde8e8',
        border: '1px solid #ccc',
        verticalAlign: 'middle',
      }}
    />
    &nbsp;= removing (unsaved)
  </div>
)
