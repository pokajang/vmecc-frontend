import React from 'react'
import { CBadge, CButton, CFormCheck, CFormInput, CFormLabel } from '@coreui/react'
import ResponsiveWorkflowActionDialog from 'src/components/workflow/ResponsiveWorkflowActionDialog'
import { formatDuration } from 'src/views/overtime/utils'

const OvertimeWorkflowActionModal = ({
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
  getDisplayOvertimeId,
  getStartDateTimeLabel,
  getEndDateTimeLabel,
  onClose,
  onSubmit,
}) => {
  const showRemarksHelper =
    !['reject', 'request_correction'].includes(actionType) &&
    String(actionLabel || '').toLowerCase() !== 'review'

  const body = (
    <>
      {!record ? (
        <div className="text-body-secondary small">No overtime claim details available.</div>
      ) : (
        <>
          <div className="d-grid gap-2">
            {[
              { label: 'Overtime ID', value: getDisplayOvertimeId(record) },
              { label: 'Employee', value: record.employee || '-' },
              { label: 'Team', value: record.team || '-' },
              { label: 'Start', value: getStartDateTimeLabel(record) },
              { label: 'End', value: getEndDateTimeLabel(record) },
              { label: 'Duration', value: formatDuration(record.durationMinutes) },
              {
                label: 'Status',
                value: (
                  <CBadge color={statusColorMap[record.status] || 'secondary'}>
                    {record.status || '-'}
                  </CBadge>
                ),
              },
              { label: 'Submitted On', value: formatDate(record.appliedAt) },
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
              htmlFor="overtime-workflow-remarks"
              className="small text-body-secondary mb-1"
            >
              {['reject', 'request_correction'].includes(actionType)
                ? 'Remarks (required)'
                : 'Remarks (optional)'}
            </CFormLabel>
            <CFormInput
              id="overtime-workflow-remarks"
              type="text"
              value={remarks}
              onChange={(event) => onRemarksChange(event.target.value)}
              placeholder="Add your remarks"
              invalid={Boolean(rejectError)}
              aria-required={['reject', 'request_correction'].includes(actionType)}
              aria-describedby={rejectError ? 'overtime-workflow-remarks-error' : undefined}
            />
            {rejectError ? (
              <div id="overtime-workflow-remarks-error" className="invalid-feedback d-block">
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
                id="overtime-workflow-responsibility-confirmation"
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
        </>
      )}
    </>
  )
  const footer = (
    <>
      <CButton color="secondary" variant="outline" onClick={onClose}>
        Cancel
      </CButton>
      <CButton
        color={actionType === 'reject' ? 'danger' : 'primary'}
        onClick={onSubmit}
        disabled={!record || actionDisabled}
      >
        {actionLabel}
      </CButton>
    </>
  )

  return (
    <ResponsiveWorkflowActionDialog
      visible={visible}
      title={`${actionLabel} overtime claim`}
      body={body}
      footer={footer}
      onClose={onClose}
      className="overtime-workflow-modal"
    />
  )
}

export default OvertimeWorkflowActionModal
