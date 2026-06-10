import React from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react'

const SalaryClaimPaymentModal = ({
  visible = false,
  mode = 'mark',
  scope = 'single',
  selectedCount = 0,
  record = null,
  values = {},
  errors = {},
  onChange = () => {},
  onClose = () => {},
  onSubmit = () => {},
  isSubmitting = false,
}) => {
  const isMarkMode = mode === 'mark'
  const title = isMarkMode
    ? scope === 'bulk'
      ? 'Bulk Mark Paid'
      : 'Mark Paid'
    : scope === 'bulk'
      ? 'Bulk Unmark Paid'
      : 'Unmark Paid'
  const actionLabel = isMarkMode
    ? scope === 'bulk'
      ? 'Mark selected paid'
      : 'Mark Paid'
    : scope === 'bulk'
      ? 'Unmark selected'
      : 'Unmark Paid'

  return (
    <CModal visible={visible} alignment="center" onClose={onClose}>
      <CModalHeader>{title}</CModalHeader>
      <CModalBody className="d-grid gap-3">
        {scope === 'bulk' ? (
          <div className="text-body-secondary">
            {selectedCount} claim{selectedCount === 1 ? '' : 's'} selected.
          </div>
        ) : (
          <div className="text-body-secondary">
            Claim: <strong>{record?.id || '-'}</strong>
          </div>
        )}

        {isMarkMode ? (
          <>
            <div>
              <CFormLabel htmlFor="salary-mark-paid-date">Payment Date</CFormLabel>
              <CFormInput
                id="salary-mark-paid-date"
                type="date"
                value={values.paymentDate || ''}
                onChange={(event) => onChange('paymentDate', event.target.value)}
              />
              {errors.paymentDate ? <div className="text-danger small mt-1">{errors.paymentDate}</div> : null}
            </div>
            <div>
              <CFormLabel htmlFor="salary-mark-paid-reference">Payment Reference (optional)</CFormLabel>
              <CFormInput
                id="salary-mark-paid-reference"
                value={values.paymentReference || ''}
                onChange={(event) => onChange('paymentReference', event.target.value)}
                placeholder="Bank transfer ref / voucher no."
              />
            </div>
            <div>
              <CFormLabel htmlFor="salary-mark-paid-note">Payment Note (optional)</CFormLabel>
              <CFormTextarea
                id="salary-mark-paid-note"
                rows={3}
                value={values.paymentNote || ''}
                onChange={(event) => onChange('paymentNote', event.target.value)}
              />
            </div>
          </>
        ) : (
          <div>
            <CFormLabel htmlFor="salary-unmark-paid-reason">Reason</CFormLabel>
            <CFormTextarea
              id="salary-unmark-paid-reason"
              rows={4}
              value={values.reason || ''}
              onChange={(event) => onChange('reason', event.target.value)}
            />
            {errors.reason ? <div className="text-danger small mt-1">{errors.reason}</div> : null}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </CButton>
        <CButton color={isMarkMode ? 'success' : 'warning'} onClick={onSubmit} disabled={isSubmitting}>
          {actionLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default SalaryClaimPaymentModal
