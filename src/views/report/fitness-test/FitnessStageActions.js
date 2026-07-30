import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const FitnessStageActions = ({
  onBack,
  onSaveDraft,
  onContinue,
  saveLabel = 'Save Draft',
  continueLabel = 'Continue',
  statusMessage = '',
  primaryType = 'button',
  disabled = false,
}) => (
  <WorkflowStageActions
    onBack={onBack}
    onSaveDraft={onSaveDraft}
    onPrimary={onContinue}
    saveLabel={saveLabel}
    primaryLabel={continueLabel}
    primaryType={primaryType}
    statusMessage={statusMessage}
    saveDisabled={disabled}
    primaryDisabled={disabled}
  />
)

export default FitnessStageActions
