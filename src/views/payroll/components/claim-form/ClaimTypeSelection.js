import React from 'react'
import { BadgeDollarSign, Calendar, ReceiptText, ShieldCheck } from 'lucide-react'
import { buildClaimPeriodOptions } from './claimPeriodOptions'
import useReportIsMobile from 'src/hooks/useReportIsMobile'
import ResponsiveChoiceSelector from 'src/components/report-workflow/ResponsiveChoiceSelector'
import WorkflowChoiceStage from 'src/components/report-workflow/WorkflowChoiceStage'

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
  periodValue,
  onPeriodChange,
  typeLocked = false,
  salaryPeriodLocks = {},
  continueLabel = 'Continue',
}) => {
  const isMobile = useReportIsMobile()
  const isSalaryType = selectedType === 'salary'
  const selectedSalaryPeriodLockReason = isSalaryType ? salaryPeriodLocks?.[periodValue] || '' : ''

  return (
    <WorkflowChoiceStage
      title="Choose claim type"
      testId="payroll-claim-type-selection"
      options={CLAIM_TYPE_OPTIONS}
      value={selectedType}
      onChange={onSelect}
      onContinue={onContinue}
      continueLabel={continueLabel}
      continueTestId="payroll-claim-type-continue"
      continueDisabled={!selectedType || !periodValue || Boolean(selectedSalaryPeriodLockReason)}
      disabled={typeLocked}
      variant="standard"
      columns={{ xs: 12, md: 6, lg: 4 }}
      rowClassName="g-3"
      ariaLabel="Choose Claim Type"
      testIdPrefix="claim-type"
    >
      {typeLocked ? (
        <div className="small text-body-secondary">Claim type is locked for this draft.</div>
      ) : null}

      {selectedType ? (
        <section className="d-grid gap-2" aria-labelledby="claim-month-heading">
          <div>
            <h3 id="claim-month-heading" className="h6 mb-0">
              Claim month
            </h3>
          </div>
          {isSalaryType ? (
            <div className="small text-body-secondary">
              Salary claim can be submitted once per payroll month.
            </div>
          ) : null}
          {selectedSalaryPeriodLockReason ? (
            <div className="small text-danger" role="alert">
              {selectedSalaryPeriodLockReason}
            </div>
          ) : null}
          <ResponsiveChoiceSelector
            isMobile={isMobile}
            options={CLAIM_PERIOD_OPTIONS.map((option) => ({
              ...option,
              title: option.label,
              description:
                isSalaryType && salaryPeriodLocks?.[option.value]
                  ? salaryPeriodLocks[option.value]
                  : '',
              icon: Calendar,
              disabled: isSalaryType && Boolean(salaryPeriodLocks?.[option.value]),
            }))}
            value={periodValue}
            onChange={onPeriodChange}
            variant="standard"
            columns={{ xs: 12, md: 6, lg: 4 }}
            rowClassName="g-3"
            ariaLabel="Choose Claim Month"
            testIdPrefix="claim-period"
          />
        </section>
      ) : null}
    </WorkflowChoiceStage>
  )
}

export default ClaimTypeSelection
