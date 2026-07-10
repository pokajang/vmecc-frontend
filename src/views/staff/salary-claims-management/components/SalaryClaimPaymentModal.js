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
  CModalTitle,
} from '@coreui/react'
import BulkSelectionSummaryPreview from './BulkSelectionSummaryPreview'

const SalaryClaimPaymentModal = ({
  visible = false,
  mode = 'mark',
  scope = 'single',
  selectedCount = 0,
  summary = null,
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
      ? 'Bulk mark paid'
      : 'Mark paid'
    : scope === 'bulk'
      ? 'Bulk unmark paid'
      : 'Unmark paid'
  const actionLabel = isMarkMode
    ? scope === 'bulk'
      ? 'Mark selected paid'
      : 'Mark paid'
    : scope === 'bulk'
      ? 'Unmark selected'
      : 'Unmark paid'

  return (
    <CModal
      visible={visible}
      alignment="center"
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
    >
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        {scope === 'bulk' ? (
          <BulkSelectionSummaryPreview
            summary={summary || { count: selectedCount, sampleItems: [], remainingCount: 0 }}
            showTotal={isMarkMode}
            totalLabel="Total payable"
          />
        ) : (
          <div className="text-body-secondary">
            Claim: <strong>{record?.id || '-'}</strong>
          </div>
        )}

        {isMarkMode ? (
          <>
            <div>
              <CFormLabel htmlFor="salary-mark-paid-date">Payment date</CFormLabel>
              <CFormInput
                id="salary-mark-paid-date"
                type="date"
                invalid={Boolean(errors.paymentDate)}
                aria-describedby={errors.paymentDate ? 'salary-mark-paid-date-error' : undefined}
                value={values.paymentDate || ''}
                onChange={(event) => onChange('paymentDate', event.target.value)}
              />
              {errors.paymentDate ? (
                <div id="salary-mark-paid-date-error" className="text-danger small mt-1">
                  {errors.paymentDate}
                </div>
              ) : null}
            </div>
            <div>
              <CFormLabel htmlFor="salary-mark-paid-reference">
                Payment reference (optional)
              </CFormLabel>
              <CFormInput
                id="salary-mark-paid-reference"
                value={values.paymentReference || ''}
                onChange={(event) => onChange('paymentReference', event.target.value)}
                placeholder="Bank transfer ref / voucher no."
              />
            </div>
            <div>
              <CFormLabel htmlFor="salary-mark-paid-note">Payment note (optional)</CFormLabel>
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
              invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? 'salary-unmark-paid-reason-error' : undefined}
              value={values.reason || ''}
              onChange={(event) => onChange('reason', event.target.value)}
            />
            {errors.reason ? (
              <div id="salary-unmark-paid-reason-error" className="text-danger small mt-1">
                {errors.reason}
              </div>
            ) : null}
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </CButton>
        <CButton
          color={isMarkMode ? 'success' : 'warning'}
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {actionLabel}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default SalaryClaimPaymentModal
