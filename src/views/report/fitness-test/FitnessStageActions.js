import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const FitnessStageActions = ({
  onBack,
  onContinue,
  continueLabel = 'Continue',
  primaryType = 'button',
  disabled = false,
  isSaving = false,
}) => (
  <WorkflowStageActions
    mobileLayout="stacked-primary-first"
    onBack={onBack}
    onPrimary={onContinue}
    primaryLabel={continueLabel}
    primaryType={primaryType}
    primaryDisabled={disabled}
    isSaving={isSaving}
  />
)

export default FitnessStageActions
