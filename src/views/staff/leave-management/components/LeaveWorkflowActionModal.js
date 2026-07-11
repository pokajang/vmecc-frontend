import React from 'react'
import {
  CBadge,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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
  const remarksRequired = actionType === 'reject' || actionType === 'request_correction'
  const showRemarksHelper = !remarksRequired && String(actionLabel || '').toLowerCase() !== 'review'

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" scrollable>
      <CModalHeader>
        <CModalTitle>{actionLabel} leave request</CModalTitle>
      </CModalHeader>
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
              <CFormLabel
                htmlFor="leave-workflow-remarks"
                className="small text-body-secondary mb-1"
              >
                {remarksRequired ? 'Remarks (required)' : 'Remarks (optional)'}
              </CFormLabel>
              <CFormInput
                id="leave-workflow-remarks"
                type="text"
                value={remarks}
                onChange={(event) => onRemarksChange(event.target.value)}
                placeholder="Add your remarks"
                invalid={Boolean(rejectError)}
                aria-required={remarksRequired}
                aria-describedby={rejectError ? 'leave-workflow-remarks-error' : undefined}
              />
              {rejectError ? (
                <div id="leave-workflow-remarks-error" className="invalid-feedback d-block">
                  {rejectError}
                </div>
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
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        <CButton
          color={
            actionType === 'reject'
              ? 'danger'
              : actionType === 'request_correction'
                ? 'warning'
                : 'primary'
          }
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
