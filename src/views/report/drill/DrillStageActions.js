import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const DrillStageActions = ({
  onBack,
  onSaveDraft,
  onContinue,
  saveLabel = 'Save Draft',
  continueLabel = 'Continue',
  statusMessage = '',
  blockerMessage = '',
  continueType = 'button',
  isSaving = false,
}) => (
  <WorkflowStageActions
    className="mb-4"
    onBack={onBack}
    onSaveDraft={onSaveDraft}
    onPrimary={onContinue}
    saveLabel={saveLabel}
    primaryLabel={continueLabel}
    primaryType={continueType}
    statusMessage={statusMessage}
    blockerMessage={blockerMessage}
    isSaving={isSaving}
  />
)

export default DrillStageActions
