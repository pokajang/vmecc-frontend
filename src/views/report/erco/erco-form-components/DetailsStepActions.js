import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const DetailsStepActions = ({
  onBack,
  onClear,
  onSaveDraft,
  saveLabel = 'Save Draft',
  primaryLabel = 'Submit Report',
  primaryType = 'submit',
  onPrimary,
  statusMessage = '',
  saveDisabled = false,
  primaryDisabled = false,
}) => (
  <WorkflowStageActions
    onBack={onBack}
    onReset={onClear}
    onSaveDraft={onSaveDraft}
    onPrimary={onPrimary}
    saveLabel={saveLabel}
    primaryLabel={primaryLabel}
    primaryType={primaryType}
    statusMessage={statusMessage}
    saveDisabled={saveDisabled}
    primaryDisabled={primaryDisabled}
  />
)

export default DetailsStepActions
