import React from 'react'
import ClaimPeriodSection from './ClaimPeriodSection'
import { CLAIM_TYPE_META } from './utils/claimFormUtils'
import WorkflowSetupField from 'src/components/report-workflow/WorkflowSetupField'

const ClaimFormHeaderRow = ({
  claimType,
  periodConfirmed,
  periodLabel,
  periodValue,
  periodOptions,
  isClaimTypeLocked,
  onEditType,
  onEditPeriod,
  onConfirmPeriod,
  onPeriodValueChange,
}) => (
  <div className="row g-3 align-items-start">
    <div className="col-12 col-md-5 col-lg-4">
      <WorkflowSetupField
        label="Claim type"
        value={(CLAIM_TYPE_META[claimType] || CLAIM_TYPE_META.expense).label}
        onEdit={!isClaimTypeLocked ? onEditType : undefined}
        ariaLabel="Selected claim type"
      />
    </div>
    {periodConfirmed ? (
      <div className="col-12 col-md-7 col-lg-8">
        <WorkflowSetupField
          label="Claim month"
          value={periodLabel || periodValue}
          onEdit={onEditPeriod}
          ariaLabel="Selected claim month"
        />
      </div>
    ) : (
      <div className="col-12 col-md-7 col-lg-8">
        <WorkflowSetupField label="Claim month" value={periodValue} editing>
          <ClaimPeriodSection
            options={periodOptions}
            value={periodValue}
            onChange={onPeriodValueChange}
            onConfirm={onConfirmPeriod}
          />
        </WorkflowSetupField>
      </div>
    )}
  </div>
)

export default ClaimFormHeaderRow
