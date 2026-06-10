import React from 'react'
import { CBadge, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { EMPTY, formatDateTime, formatDaysAgo } from 'src/utils/users'
import { getPrimaryRoleLabel } from 'src/utils/authz'

const renderRowRight = (label, content) => (
  <div className="d-flex justify-content-between align-items-center">
    <span className="text-muted">{label}</span>
    <span className="ms-3 text-end">{content}</span>
  </div>
)

const renderDateWithAgo = (value) => {
  const formatted = formatDateTime(value)
  const ago = formatDaysAgo(value)
  if (formatted === EMPTY) return formatted
  return (
    <span className="d-inline-flex flex-wrap align-items-center gap-1">
      <span>{formatted}</span>
      {ago && <span className="text-muted small">({ago})</span>}
    </span>
  )
}

const UserSummaryCard = ({ user }) => (
  <CCard className="mb-4">
    <CCardHeader>System User</CCardHeader>
    <CCardBody className="d-grid gap-2">
      {renderRowRight('Name', user.name || EMPTY)}
      {renderRowRight('Email', user.email || EMPTY)}
      {renderRowRight('Status', user.deleted_at ? 'Deleted' : user.status || EMPTY)}
      {renderRowRight(
        'Account lock',
        user.locked_at ? `Locked (${formatDateTime(user.locked_at)})` : 'Not locked',
      )}
      {renderRowRight('Failed logins', String(user.failed_login_count ?? 0))}
      {renderRowRight('Created at', renderDateWithAgo(user.created_at || user.createdAt || null))}
      <div className="d-flex justify-content-between align-items-center">
        <span className="text-muted">Roles</span>
        <span className="ms-3 text-end">
          {(user.roles || []).length === 0
            ? EMPTY
            : user.roles.map((r) => (
                <CBadge
                  color={r === getPrimaryRoleLabel(user) ? 'primary' : 'success'}
                  key={r}
                  className="ms-1"
                >
                  {r}
                </CBadge>
              ))}
        </span>
      </div>
    </CCardBody>
  </CCard>
)

export default UserSummaryCard
