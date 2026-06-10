import React from 'react'
import {
  CBadge,
  CButton,
  CFormCheck,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react'

const LeaveWorkflowActionModal = ({
  visible,
  record,
  actionLabel = 'Approve',
  actionType = 'approve',
  actionDisabled = false,
  remarks,
  onRemarksChange,
  showDeclaration = true,
  declarationRequired = false,
  declarationChecked,
  onDeclarationChange,
  declarationLabel,
  declarationError,
  rejectError,
  statusColorMap,
  formatDate,
  getDisplayLeaveId,
  getStartDateTimeLabel,
  getEndDateTimeLabel,
  onClose,
  onSubmit,
}) => {
  const showRemarksHelper =
    actionType !== 'reject' && String(actionLabel || '').toLowerCase() !== 'review'

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" scrollable>
      <CModalHeader>{actionLabel} Leave Request</CModalHeader>
      <CModalBody className="d-grid gap-3">
        {!record ? (
          <div className="text-body-secondary small">No leave request details available.</div>
        ) : (
          <>
            <div className="d-grid gap-2">
              {[
                { label: 'Leave ID', value: getDisplayLeaveId(record) },
                { label: 'Employee', value: record.employee || '-' },
                { label: 'Team', value: record.team || '-' },
                { label: 'Leave Type', value: record.leaveType || '-' },
                { label: 'Start', value: getStartDateTimeLabel(record) },
                { label: 'End', value: getEndDateTimeLabel(record) },
                { label: 'Days', value: record.days || 0 },
                {
                  label: 'Status',
                  value: (
                    <CBadge color={statusColorMap[record.status] || 'secondary'}>
                      {record.status || '-'}
                    </CBadge>
                  ),
                },
                { label: 'Applied On', value: formatDate(record.appliedAt) },
                { label: 'Coverage By', value: record.coverBy || '-' },
                { label: 'Reason', value: record.reason || '-' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="d-flex justify-content-between align-items-start gap-3"
                >
                  <span className="text-body-secondary small">{item.label}</span>
                  <span className="text-end text-break">{item.value}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="small text-body-secondary mb-1">
                {actionType === 'reject' ? 'Remarks (required)' : 'Remarks (optional)'}
              </div>
              <CFormInput
                type="text"
                value={remarks}
                onChange={(event) => onRemarksChange(event.target.value)}
                placeholder="Add your remarks"
                invalid={Boolean(rejectError)}
              />
              {rejectError ? (
                <div className="invalid-feedback d-block">{rejectError}</div>
              ) : (
                showRemarksHelper && (
                  <div className="small text-body-secondary mt-1">
                    Optional for review/recommend/approve. Required when rejecting.
                  </div>
                )
              )}
            </div>

            {showDeclaration ? (
              <div>
                <CFormCheck
                  id="leave-workflow-responsibility-confirmation"
                  checked={declarationChecked}
                  onChange={(event) => onDeclarationChange(event.target.checked)}
                  label={declarationLabel}
                />
                {declarationRequired ? (
                  declarationError ? (
                    <div className="invalid-feedback d-block">{declarationError}</div>
                  ) : (
                    <div className="small text-body-secondary mt-1">Required for this action.</div>
                  )
                ) : null}
              </div>
            ) : null}

            <div className="small text-warning-emphasis bg-warning-subtle border border-warning-subtle rounded px-2 py-1">
              This action cannot be undone. Please confirm before proceeding.
            </div>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color={actionType === 'reject' ? 'danger' : 'primary'}
          onClick={onSubmit}
          disabled={!record || actionDisabled}
        >
          {actionLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default LeaveWorkflowActionModal
