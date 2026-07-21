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
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useReportIsMobile from '../hooks/useReportIsMobile'

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
  const isMobile = useReportIsMobile()
  const action = ACTION_META[actionType] || ACTION_META.review
  const isReject = actionType === 'reject'
  const trimmedRemarks = String(remarks || '').trim()
  const isSubmitDisabled =
    !record || actionDisabled || !declarationChecked || (isReject && !trimmedRemarks)
  const showRemarksHelper = !isReject && actionType !== 'review'
  const title = `${action.label} report`
  const body = (
    <div className="d-grid gap-3">
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
            <CFormLabel
              htmlFor="report-workflow-remarks"
              className="small text-body-secondary mb-1"
            >
              {action.remarksLabel}
            </CFormLabel>
            <CFormInput
              id="report-workflow-remarks"
              type="text"
              value={remarks}
              onChange={(event) => onRemarksChange?.(event.target.value)}
              placeholder="Add your remarks"
              invalid={Boolean(rejectError)}
              aria-required={isReject}
              aria-describedby={rejectError ? 'report-workflow-remarks-error' : undefined}
            />
            {rejectError ? (
              <div id="report-workflow-remarks-error" className="invalid-feedback d-block">
                {rejectError}
              </div>
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
    </div>
  )
  const actions = (
    <>
      <CButton color="secondary" variant="outline" onClick={onClose}>
        Cancel
      </CButton>
      <CButton color={action.color} onClick={onSubmit} disabled={isSubmitDisabled}>
        {action.label}
      </CButton>
    </>
  )

  if (isMobile) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        className="mobile-bottom-drawer--confirm"
        onClose={onClose}
      >
        {body}
        <div className="mobile-bottom-drawer__footer d-flex flex-wrap justify-content-end gap-2">
          {actions}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" fullscreen="sm" scrollable>
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ReportWorkflowActionModal
