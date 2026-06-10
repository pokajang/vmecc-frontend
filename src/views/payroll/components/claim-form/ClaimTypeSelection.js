import React from 'react'
import { CButton } from '@coreui/react'
import { BadgeDollarSign, Calendar, ReceiptText, ShieldCheck } from 'lucide-react'
import { buildClaimPeriodOptions } from './claimPeriodOptions'
import IconOptionGrid from 'src/components/IconOptionGrid'

const CLAIM_TYPE_OPTIONS = [
  {
    value: 'salary',
    title: 'Salary Claim',
    description:
      'Confirm assigned salary payout and add arrears, adjustments, or additional allowances.',
    icon: BadgeDollarSign,
  },
  {
    value: 'expense',
    title: 'Expense Claim',
    description: 'Claim business expenses like travel, fuel, meals, parking, and mobile bills.',
    icon: ReceiptText,
  },
  {
    value: 'other',
    title: 'Exceptional Claim',
    description:
      'Exception-only path for approved special cases that do not fit Salary or Expense claims.',
    icon: ShieldCheck,
  },
]

const CLAIM_PERIOD_OPTIONS = buildClaimPeriodOptions(2)

const ClaimTypeSelection = ({
  selectedType,
  onSelect,
  onContinue,
  onBack,
  onCancelEdit,
  periodValue,
  onPeriodChange,
  typeLocked = false,
  salaryPeriodLocks = {},
  backLabel = 'Back to claims',
  continueLabel = 'Continue',
  cancelLabel = 'Cancel edit',
}) => {
  const isSalaryType = selectedType === 'salary'
  const selectedSalaryPeriodLockReason = isSalaryType ? salaryPeriodLocks?.[periodValue] || '' : ''

  return (
    <div className="d-grid gap-4">
      <div>
        <div className="fw-semibold">Choose Claim Type</div>
        {typeLocked && (
          <div className="small text-body-secondary mt-1">
            Claim type is locked for this draft. You can still change claim month.
          </div>
        )}
      </div>
      <IconOptionGrid
        options={CLAIM_TYPE_OPTIONS}
        value={selectedType}
        onChange={(nextType) => onSelect(nextType)}
        variant="standard"
        columns={{ xs: 12, md: 6, lg: 4 }}
        rowClassName="g-3"
        ariaLabel="Choose Claim Type"
        disabled={typeLocked}
        testIdPrefix="claim-type"
      />

      {selectedType && (
        <div className="d-grid gap-2">
          <div className="fw-semibold">Choose Claim Month</div>
          {isSalaryType && (
            <div className="small text-body-secondary">
              Salary claim can be submitted once per payroll month.
            </div>
          )}
          {selectedSalaryPeriodLockReason ? (
            <div className="small text-danger">{selectedSalaryPeriodLockReason}</div>
          ) : null}
          <IconOptionGrid
            options={CLAIM_PERIOD_OPTIONS.map((option) => ({
              ...option,
              title: option.label,
              description:
                isSalaryType && salaryPeriodLocks?.[option.value]
                  ? salaryPeriodLocks[option.value]
                  : 'Claim period',
              icon: Calendar,
              disabled: isSalaryType && Boolean(salaryPeriodLocks?.[option.value]),
            }))}
            value={periodValue}
            onChange={(nextPeriod) => onPeriodChange(nextPeriod)}
            variant="standard"
            columns={{ xs: 12, md: 6, lg: 4 }}
            rowClassName="g-3"
            ariaLabel="Choose Claim Month"
            testIdPrefix="claim-period"
          />
        </div>
      )}

      <div className="action-row-thumb">
        <CButton color="light" onClick={onBack}>
          {backLabel}
        </CButton>
        {onCancelEdit && (
          <CButton color="light" onClick={onCancelEdit}>
            {cancelLabel}
          </CButton>
        )}
        <CButton
          color="primary"
          disabled={!selectedType || !periodValue || Boolean(selectedSalaryPeriodLockReason)}
          onClick={() => onContinue(selectedType)}
        >
          {continueLabel}
        </CButton>
      </div>
      <div className="action-row-thumb-spacer d-lg-none" />
    </div>
  )
}

export default ClaimTypeSelection
