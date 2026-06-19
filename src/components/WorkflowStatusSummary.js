import React from 'react'
import ApprovalGates from './ApprovalGates'

const WorkflowStatusSummary = ({
  statusLabel = '',
  nextActionLabel = '',
  gates = [],
  approvalHistory = [],
  isCancelled = false,
  className = '',
}) => {
  const primaryLabel = String(statusLabel || nextActionLabel || 'Status unavailable').trim()
  const secondaryLabel =
    statusLabel && nextActionLabel && statusLabel !== nextActionLabel ? nextActionLabel : ''

  return (
    <div className={`workflow-status-summary d-grid gap-1 ${className}`.trim()}>
      <div className="fw-semibold small">{primaryLabel}</div>
      {secondaryLabel ? <div className="small text-body-secondary">{secondaryLabel}</div> : null}
      {Array.isArray(gates) && gates.length > 0 ? (
        <ApprovalGates gates={gates} approvalHistory={approvalHistory} isCancelled={isCancelled} />
      ) : null}
    </div>
  )
}

export default WorkflowStatusSummary
