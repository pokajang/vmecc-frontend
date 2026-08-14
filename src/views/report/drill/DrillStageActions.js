import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const DrillStageActions = ({
  onBack,
  onContinue,
  continueLabel = 'Continue',
  blockerMessage = '',
  continueType = 'button',
  isSaving = false,
}) => (
  <WorkflowStageActions
    className="mb-4"
    mobileLayout="stacked-primary-first"
    onBack={onBack}
    onPrimary={onContinue}
    primaryLabel={continueLabel}
    primaryType={continueType}
    blockerMessage={blockerMessage}
    isSaving={isSaving}
  />
)

export default DrillStageActions
