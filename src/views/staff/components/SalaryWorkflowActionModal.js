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

const toMoneyOrNull = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const sumItemAmountsOrNull = (record = {}) => {
  const items = Array.isArray(record?.items) ? record.items : []
  if (items.length === 0) return null
  return items.reduce((sum, item) => {
    const amount = toMoneyOrNull(item?.amount)
    return sum + (amount === null ? 0 : amount)
  }, 0)
}

const resolveWorkflowModalAmount = (record = {}) => {
  const isSalaryClaim = String(record?.type || '').trim() === 'salary'
  if (isSalaryClaim) {
    const projectedNet = toMoneyOrNull(record?.projectedNetPayout)
    if (projectedNet !== null) return projectedNet
  } else {
    const itemTotal = sumItemAmountsOrNull(record)
    if (itemTotal !== null) return itemTotal
  }

  const claimedAmount = toMoneyOrNull(record?.amount)
  return claimedAmount !== null ? claimedAmount : 0
}

const SalaryWorkflowActionModal = ({
  visible,
  record,
  actionLabel = 'Approve',
  actionType = 'approve',
  actionDisabled = false,
  remarks = '',
  onRemarksChange,
  showDeclaration = true,
  declarationRequired = false,
  declarationChecked = false,
  onDeclarationChange,
  declarationLabel = '',
  declarationError = '',
  rejectError = '',
  statusColorMap = {},
  formatDate,
  formatCurrency,
  toTypeLabel,
  onClose,
  onSubmit,
}) => {
  const showRemarksHelper =
    actionType !== 'reject' && String(actionLabel || '').toLowerCase() !== 'check'
  const isSalaryClaim = String(record?.type || '').trim() === 'salary'
  const displayAmount = resolveWorkflowModalAmount(record)
  const baselineNet = toMoneyOrNull(record?.payrollSnapshot?.net)
  const adjustmentsTotal = toMoneyOrNull(record?.adjustmentsTotal)
  const approvedOvertimePayout = toMoneyOrNull(record?.approvedOvertimePayout)
  const projectedNetPayout = toMoneyOrNull(record?.projectedNetPayout)
  const expenseItemsTotal = isSalaryClaim ? null : sumItemAmountsOrNull(record)
  const claimedAmount = toMoneyOrNull(record?.amount)

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" scrollable>
      <CModalHeader>{actionLabel} Claim</CModalHeader>
      <CModalBody className="d-grid gap-3">
        {!record ? (
          <div className="text-body-secondary small">No claim details available.</div>
        ) : (
          <>
            <div className="d-grid gap-2">
              {[
                { label: 'Claim ID', value: record.id || '-' },
                { label: 'Employee', value: record.ownerLabel || '-' },
                { label: 'Type', value: toTypeLabel(record.type) },
                { label: 'Period', value: record.period || '-' },
                { label: 'Category', value: record.category || '-' },
                {
                  label: 'Status',
                  value: (
                    <CBadge color={statusColorMap[record.status] || 'secondary'}>
                      {record.status || '-'}
                    </CBadge>
                  ),
                },
                { label: 'Amount', value: formatCurrency(displayAmount) },
                { label: 'Submitted On', value: formatDate(record.submittedAt) },
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

            <div className="border rounded-3 px-3 py-2">
              <div className="small text-body-secondary mb-2">
                {isSalaryClaim ? 'Salary Breakdown' : 'Claim Breakdown'}
              </div>
              <div className="d-grid gap-1">
                {isSalaryClaim ? (
                  <>
                    <div className="d-flex justify-content-between gap-3">
                      <span className="small text-body-secondary">Baseline Net</span>
                      <span className="text-end text-break">
                        {baselineNet === null ? '-' : formatCurrency(baselineNet)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between gap-3">
                      <span className="small text-body-secondary">Adjustments</span>
                      <span className="text-end text-break">
                        {adjustmentsTotal === null ? '-' : formatCurrency(adjustmentsTotal)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between gap-3">
                      <span className="small text-body-secondary">Approved OT Payout</span>
                      <span className="text-end text-break">
                        {approvedOvertimePayout === null
                          ? '-'
                          : formatCurrency(approvedOvertimePayout)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between gap-3 fw-semibold">
                      <span className="small text-body-secondary">Final Payable</span>
                      <span className="text-end text-break">
                        {projectedNetPayout === null
                          ? formatCurrency(displayAmount)
                          : formatCurrency(projectedNetPayout)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="d-flex justify-content-between gap-3">
                      <span className="small text-body-secondary">Expense Items Total</span>
                      <span className="text-end text-break">
                        {expenseItemsTotal === null ? '-' : formatCurrency(expenseItemsTotal)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between gap-3 fw-semibold">
                      <span className="small text-body-secondary">Claimed Amount</span>
                      <span className="text-end text-break">
                        {claimedAmount === null ? '-' : formatCurrency(claimedAmount)}
                      </span>
                    </div>
                  </>
                )}
              </div>
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
                    Optional for check/review/approve. Required when rejecting.
                  </div>
                )
              )}
            </div>

            {showDeclaration ? (
              <div>
                <CFormCheck
                  id="salary-workflow-responsibility-confirmation"
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

export default SalaryWorkflowActionModal
