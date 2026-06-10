import React from 'react'
import { CCard, CCardBody } from '@coreui/react'
import RowActions from 'src/components/RowActions'
import { EMPTY } from 'src/utils/users'

const UserCard = ({ user, onView, onToggleStatus }) => {
  const canToggle = typeof onToggleStatus === 'function'
  const actionItems = canToggle
    ? [
        {
          key: 'toggle-status',
          label: user.status === 'Active' ? 'Deactivate' : 'Activate',
          onClick: () => onToggleStatus(user),
        },
      ]
    : []

  return (
    <CCard className="mb-3 cursor-pointer" role="button" onClick={onView}>
      <CCardBody className="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div className="fw-semibold">{user.name || EMPTY}</div>
          <div className="text-muted small">{(user.roles || []).join(', ') || EMPTY}</div>
        </div>
        {actionItems.length > 0 && <RowActions items={actionItems} />}
      </CCardBody>
    </CCard>
  )
}

export default UserCard
