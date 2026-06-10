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

const ACTION_META = {
  review: { label: 'Review', color: 'primary', remarksLabel: 'Remarks (optional)' },
  approve: { label: 'Approve', color: 'primary', remarksLabel: 'Remarks (optional)' },
  reject: { label: 'Reject', color: 'danger', remarksLabel: 'Remarks (required)' },
}

const formatRecordDateTime = (record, formatDateTime) =>
  formatDateTime?.(
    record?.incidentDate || record?.reportDate || '',
    record?.incidentTime || record?.reportTime || '',
  ) || '--'

const ReportWorkflowActionModal = ({
  visible,
  actionType = 'review',
  record,
  remarks = '',
  onRemarksChange,
  declarationChecked = false,
  onDeclarationChange,
  declarationLabel = '',
  declarationError = '',
  rejectError = '',
  actionDisabled = false,
  renderStatusBadge,
  formatDateTime,
  onClose,
  onSubmit,
}) => {
  const action = ACTION_META[actionType] || ACTION_META.review
  const isReject = actionType === 'reject'
  const trimmedRemarks = String(remarks || '').trim()
  const isSubmitDisabled =
    !record || actionDisabled || !declarationChecked || (isReject && !trimmedRemarks)
  const showRemarksHelper = !isReject && actionType !== 'review'

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" fullscreen="sm" scrollable>
      <CModalHeader>{action.label} Report</CModalHeader>
      <CModalBody className="d-grid gap-3">
        {!record ? (
          <div className="text-body-secondary small">No report details available.</div>
        ) : (
          <>
            <div className="d-grid gap-2">
              {[
                { label: 'Report ID', value: record.displayId || record.id || '-' },
                { label: 'Type', value: record.incidentType || '-' },
                { label: 'Location', value: record.location || '-' },
                { label: 'Reported At', value: formatRecordDateTime(record, formatDateTime) },
                {
                  label: 'Status',
                  value:
                    typeof renderStatusBadge === 'function' ? (
                      renderStatusBadge(record.status || '-')
                    ) : (
                      <CBadge color="secondary">{record.status || '-'}</CBadge>
                    ),
                },
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
              <div className="small text-body-secondary mb-1">{action.remarksLabel}</div>
              <CFormInput
                type="text"
                value={remarks}
                onChange={(event) => onRemarksChange?.(event.target.value)}
                placeholder="Add your remarks"
                invalid={Boolean(rejectError)}
              />
              {rejectError ? (
                <div className="invalid-feedback d-block">{rejectError}</div>
              ) : (
                showRemarksHelper && (
                  <div className="small text-body-secondary mt-1">
                    Optional for approve actions. Required when rejecting.
                  </div>
                )
              )}
            </div>

            <div>
              <CFormCheck
                id="report-workflow-responsibility-confirmation"
                checked={declarationChecked}
                onChange={(event) => onDeclarationChange?.(event.target.checked)}
                label={declarationLabel}
              />
              {declarationError ? (
                <div className="invalid-feedback d-block">{declarationError}</div>
              ) : (
                <div className="small text-body-secondary mt-1">Required for this action.</div>
              )}
            </div>

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
        <CButton color={action.color} onClick={onSubmit} disabled={isSubmitDisabled}>
          {action.label}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ReportWorkflowActionModal
