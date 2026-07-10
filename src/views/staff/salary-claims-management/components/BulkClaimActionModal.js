import React from 'react'
import {
  CButton,
  CFormCheck,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import BulkActionButton from 'src/views/staff/components/BulkActionButton'
import BulkSelectionSummaryPreview from './BulkSelectionSummaryPreview'

const BulkClaimActionModal = ({ vm, handlers }) => {
  const {
    visible,
    action,
    selectedCount,
    summary,
    remarks,
    declarationChecked,
    declarationLabel,
    declarationError,
    rejectError,
  } = vm
  const {
    onClose,
    onSubmit,
    onRemarksChange,
    onDeclarationChange,
    onClearRejectError,
    onClearDeclarationError,
  } = handlers

  return (
    <CModal visible={visible} alignment="center" onClose={onClose}>
      <CModalHeader>
        <CModalTitle>
          {action === 'reject' ? 'Bulk reject claims' : 'Bulk approve claims'}
        </CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        <BulkSelectionSummaryPreview
          summary={summary || { count: selectedCount, sampleItems: [], remainingCount: 0 }}
        />
        {action === 'reject' ? (
          <>
            <CFormLabel htmlFor="bulk-reject-remarks">Remarks</CFormLabel>
            <CFormTextarea
              id="bulk-reject-remarks"
              rows={4}
              value={remarks}
              onChange={(event) => {
                onRemarksChange(event.target.value)
                if (rejectError && String(event.target.value || '').trim()) {
                  onClearRejectError()
                }
              }}
            />
            {rejectError && <div className="text-danger small">{rejectError}</div>}
          </>
        ) : (
          <>
            <CFormCheck
              id="bulk-approve-declaration"
              label={declarationLabel}
              checked={declarationChecked}
              onChange={(event) => {
                onDeclarationChange(event.target.checked)
                if (event.target.checked && declarationError) {
                  onClearDeclarationError()
                }
              }}
            />
            {declarationError && <div className="text-danger small">{declarationError}</div>}
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Cancel
        </CButton>
        <BulkActionButton
          label={action === 'reject' ? 'Reject selected' : 'Approve selected'}
          intent={action === 'reject' ? 'reject' : 'approve'}
          onClick={onSubmit}
        />
      </CModalFooter>
    </CModal>
  )
}

export default BulkClaimActionModal
