import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const DetailsStepActions = ({
  onBack,
  onClear,
  primaryLabel = 'Submit Report',
  primaryType = 'submit',
  onPrimary,
  primaryDisabled = false,
  isSaving = false,
}) => (
  <WorkflowStageActions
    mobileLayout="stacked-primary-first"
    onBack={onBack}
    onReset={onClear}
    onPrimary={onPrimary}
    primaryLabel={primaryLabel}
    primaryType={primaryType}
    primaryDisabled={primaryDisabled}
    isSaving={isSaving}
  />
)

export default DetailsStepActions
