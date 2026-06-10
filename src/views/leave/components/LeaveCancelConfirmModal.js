import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'

const LeaveCancelConfirmModal = ({
  visible,
  record,
  statusLabel = '',
  pendingActionHint = '',
  getDisplayLeaveId,
  onClose,
  onConfirm,
}) => (
  <CModal visible={visible} onClose={onClose} alignment="center">
    <CModalHeader>Confirm Leave Cancellation</CModalHeader>
    <CModalBody>
      {!record ? (
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
      )}
    </CModalBody>
    <CModalFooter>
      <CButton color="light" onClick={onClose}>
        Keep Leave
      </CButton>
      <CButton color="danger" onClick={onConfirm} disabled={!record}>
        Cancel Leave
      </CButton>
    </CModalFooter>
  </CModal>
)

export default LeaveCancelConfirmModal
