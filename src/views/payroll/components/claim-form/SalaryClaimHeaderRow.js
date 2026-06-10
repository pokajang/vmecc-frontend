import React from 'react'
import ClaimFormHeaderRow from './ClaimFormHeaderRow'
import { getMonthLabel, PAYROLL_MONTH_OPTIONS } from './utils/salaryClaimUtils'

const SalaryClaimHeaderRow = ({
  claimType,
  periodConfirmed,
  period,
  isClaimTypeLocked,
  handleEditType,
  handleChangePeriod,
  handleConfirmPeriod,
  setHeader,
  onPeriodChange,
}) => (
  <ClaimFormHeaderRow
    claimType={claimType}
    periodConfirmed={periodConfirmed}
    periodLabel={getMonthLabel(period)}
    periodValue={period}
    periodOptions={PAYROLL_MONTH_OPTIONS}
    isClaimTypeLocked={isClaimTypeLocked}
    onEditType={handleEditType}
    onEditPeriod={handleChangePeriod}
    onConfirmPeriod={handleConfirmPeriod}
    onPeriodValueChange={(value) => {
      setHeader((prev) => ({ ...prev, period: value }))
      if (onPeriodChange) onPeriodChange(value)
    }}
  />
)

export default SalaryClaimHeaderRow
