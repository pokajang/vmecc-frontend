import React from 'react'
import { Calendar } from 'lucide-react'
import useReportIsMobile from 'src/hooks/useReportIsMobile'
import ResponsiveChoiceSelector from 'src/components/report-workflow/ResponsiveChoiceSelector'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const ClaimPeriodSection = ({
  title = 'Claim Month',
  options = [],
  value = '',
  onChange,
  onConfirm,
  continueLabel = 'Continue',
}) => {
  const isMobile = useReportIsMobile()
  return (
    <div className="d-grid gap-3">
      <ResponsiveChoiceSelector
        isMobile={isMobile}
        options={options.map((option) => ({ ...option, title: option.label, icon: Calendar }))}
        value={value}
        onChange={onChange}
        ariaLabel={title}
        testIdPrefix="claim-period"
        variant="compact"
        columns={{ xs: 12, sm: 6, md: 6 }}
        rowClassName="g-2"
        showDescription={false}
      />
      {onConfirm ? (
        <WorkflowStageActions
          onPrimary={onConfirm}
          primaryLabel={continueLabel}
          primaryDisabled={!value}
          mobileLayout="stacked-primary-first"
          stackedMobileBehavior="terminal"
          ariaLabel="Claim month actions"
        />
      ) : null}
    </div>
  )
}

export default ClaimPeriodSection
