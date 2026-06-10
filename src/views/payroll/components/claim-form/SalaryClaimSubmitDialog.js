import React from 'react'
import ClaimSubmitModal from './ClaimSubmitModal'
import { formatCurrency } from './utils/claimFormUtils'
import { PAYROLL_MONTH_OPTIONS } from './utils/salaryClaimUtils'

const SalaryClaimSubmitDialog = ({
  visible,
  period,
  assignedSalarySnapshot,
  totalAmount,
  overtimeTotals,
  projectedNetPayout,
  submitLineItems,
  submitDeclarationChecked,
  setSubmitDeclarationChecked,
  setSubmitModalVisible,
  openAttachmentPreview,
  confirmSubmit,
  isSubmitting = false,
}) => (
  <ClaimSubmitModal
    visible={visible}
    title="Submit Salary Payout Confirmation"
    summaryItems={[
      {
        label: 'Payroll month',
        value: PAYROLL_MONTH_OPTIONS.find((option) => option.value === period)?.label || period,
      },
      { label: 'Assigned net payout', value: formatCurrency(assignedSalarySnapshot.net) },
      { label: 'Total adjustments', value: formatCurrency(totalAmount) },
      {
        label: 'Approved overtime payout',
        value: formatCurrency(overtimeTotals.totalPayoutApproved),
      },
    ]}
    lineItems={submitLineItems}
    lineItemsLabel="Adjustment Summary"
    lineItemsVariant="compact"
    showTotalRow={false}
    finalHighlightLabel="Your Salary This Month (Final Payout)"
    finalHighlightValue={formatCurrency(projectedNetPayout)}
    onPreviewAttachment={openAttachmentPreview}
    declarationId="salary-submit-declaration"
    declarationLabel="I confirm the salary payout baseline and listed additions/deductions are accurate, with supporting documents attached where available."
    declarationChecked={submitDeclarationChecked}
    onDeclarationChange={setSubmitDeclarationChecked}
    onClose={() => {
      if (isSubmitting) return
      setSubmitModalVisible(false)
      setSubmitDeclarationChecked(false)
    }}
    onConfirm={confirmSubmit}
    isSubmitting={isSubmitting}
    confirmLabel={isSubmitting ? 'Submitting...' : 'Confirm Submit'}
  />
)

export default SalaryClaimSubmitDialog
