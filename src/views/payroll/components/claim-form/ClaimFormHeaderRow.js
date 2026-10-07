import React from 'react'
import ClaimPeriodSection from './ClaimPeriodSection'
import { CLAIM_TYPE_META } from './utils/claimFormUtils'
import MobileSetupSummaryList from 'src/components/report-workflow/MobileSetupSummaryList'
import WorkflowSetupField from 'src/components/report-workflow/WorkflowSetupField'
import useReportIsMobile from 'src/hooks/useReportIsMobile'

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
}) => {
  const isMobile = useReportIsMobile()
  const claimTypeLabel = (CLAIM_TYPE_META[claimType] || CLAIM_TYPE_META.expense).label

  if (isMobile) {
    return (
      <div className="row g-3 align-items-start">
        <div className="col-12">
          <MobileSetupSummaryList
            ariaLabel="Claim setup summary"
            items={[
              {
                key: 'claim-type',
                label: 'Claim type',
                value: claimTypeLabel,
                onEdit: !isClaimTypeLocked ? onEditType : undefined,
                editLabel: `Change claim type: ${claimTypeLabel}`,
              },
              ...(periodConfirmed
                ? [
                    {
                      key: 'claim-month',
                      label: 'Claim month',
                      value: periodLabel || periodValue,
                      onEdit: onEditPeriod,
                      editLabel: `Change claim month: ${periodLabel || periodValue}`,
                    },
                  ]
                : []),
            ]}
          />
        </div>
        {!periodConfirmed ? (
          <div className="col-12">
            <WorkflowSetupField label="Claim month" value={periodValue} editing>
              <ClaimPeriodSection
                options={periodOptions}
                value={periodValue}
                onChange={onPeriodValueChange}
                onConfirm={onConfirmPeriod}
              />
            </WorkflowSetupField>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="row g-3 align-items-start">
      <div className="col-12 col-md-5 col-lg-4">
        <WorkflowSetupField
          label="Claim type"
          value={claimTypeLabel}
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
}

export default ClaimFormHeaderRow
