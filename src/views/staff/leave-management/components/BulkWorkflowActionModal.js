import React from 'react'
import { CButton, CFormCheck, CFormLabel, CFormTextarea } from '@coreui/react'
import ResponsiveWorkflowActionDialog from 'src/components/workflow/ResponsiveWorkflowActionDialog'
import BulkActionButton from 'src/views/staff/components/BulkActionButton'

const toPluralLabel = (value = 'record') => {
  const normalized = String(value || 'record').trim()
  if (!normalized) return 'records'
  return normalized.endsWith('s') ? normalized : `${normalized}s`
}

const BulkWorkflowActionModal = ({
  visible,
  action = 'approve',
  actionLabel = 'Approve',
  entityLabel = 'record',
  selectedCount = 0,
  remarks = '',
  declarationChecked = false,
  declarationLabel = '',
  declarationError = '',
  rejectError = '',
  isSubmitting = false,
  onClose,
  onSubmit,
  onRemarksChange,
  onDeclarationChange,
  onClearRejectError,
  onClearDeclarationError,
}) => {
  const singularLabel = String(entityLabel || 'record').trim() || 'record'
  const pluralLabel = toPluralLabel(singularLabel)
  const title =
    action === 'reject'
      ? `Bulk reject ${pluralLabel}`
      : `Bulk ${String(actionLabel).toLowerCase()} ${pluralLabel}`
  const submitLabel = action === 'reject' ? 'Reject selected' : `${actionLabel} selected`

  const handleClose = () => {
    if (!isSubmitting) onClose?.()
  }
  const body = (
    <>
      <div className="text-body-secondary">
        {selectedCount} {selectedCount === 1 ? singularLabel : pluralLabel} selected.
      </div>
      {action === 'reject' ? (
        <>
          <CFormLabel htmlFor="bulk-workflow-reject-remarks">Remarks</CFormLabel>
          <CFormTextarea
            id="bulk-workflow-reject-remarks"
            rows={4}
            value={remarks}
            onChange={(event) => {
              onRemarksChange?.(event.target.value)
              if (rejectError && String(event.target.value || '').trim()) {
                onClearRejectError?.()
              }
            }}
          />
          {rejectError ? <div className="text-danger small">{rejectError}</div> : null}
        </>
      ) : (
        <>
          <CFormCheck
            id="bulk-workflow-approve-declaration"
            label={declarationLabel}
            checked={declarationChecked}
            onChange={(event) => {
              onDeclarationChange?.(event.target.checked)
              if (event.target.checked && declarationError) {
                onClearDeclarationError?.()
              }
            }}
          />
          {declarationError ? <div className="text-danger small">{declarationError}</div> : null}
        </>
      )}
    </>
  )
  const footer = (
    <>
      <CButton color="secondary" variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </CButton>
      <BulkActionButton
        label={submitLabel}
        intent={action === 'reject' ? 'reject' : 'approve'}
        onClick={onSubmit}
        disabled={isSubmitting}
      />
    </>
  )

  return (
    <ResponsiveWorkflowActionDialog
      visible={visible}
      title={title}
      body={body}
      footer={footer}
      onClose={handleClose}
    />
  )
}

export default BulkWorkflowActionModal
