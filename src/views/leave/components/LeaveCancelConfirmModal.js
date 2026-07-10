import React from 'react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'

const LeaveCancelConfirmModal = ({
  testId = '',
  visible,
  record,
  statusLabel = '',
  pendingActionHint = '',
  getDisplayLeaveId,
  onClose,
  onConfirm,
}) => {
  const body = !record ? (
    <div className="text-body-secondary small">No leave request details available.</div>
  ) : (
    <div className="d-grid gap-2">
      <div>
        You are about to cancel leave request{' '}
        <span className="fw-semibold">{getDisplayLeaveId(record)}</span>.
      </div>
      <div className="small text-body-secondary">
        <div>
          <span className="me-1">Leave Type:</span>
          <span>{record.leaveType || '-'}</span>
        </div>
        <div>
          <span className="me-1">Current Status:</span>
          <span>{statusLabel || record.status || '-'}</span>
        </div>
        {pendingActionHint ? (
          <div>
            <span className="me-1">Current Action:</span>
            <span>{pendingActionHint}</span>
          </div>
        ) : null}
      </div>
      <div className="small text-warning-emphasis bg-warning-subtle border border-warning-subtle rounded px-2 py-1">
        Cancelled leave cannot be undone.
      </div>
    </div>
  )
  return (
    <ActionConfirmModal
      testId={testId}
      visible={visible}
      title="Confirm leave cancellation"
      message={body}
      cancelLabel="Keep leave"
      confirmLabel="Cancel leave"
      confirmColor="danger"
      confirmDisabled={!record}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

export default LeaveCancelConfirmModal
