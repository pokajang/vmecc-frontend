import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import { REPORT_ACTION_LABELS } from 'src/views/report/reportActionLabels'

const DetailsStepActions = ({
  onBack,
  onClear,
  primaryLabel = REPORT_ACTION_LABELS.SUBMIT_REPORT,
  primaryType = 'submit',
  onPrimary,
  primaryDisabled = false,
  isSaving = false,
}) => (
  <WorkflowStageActions
    mobileLayout="stacked-primary-first"
    stackedMobileBehavior="compact-sticky"
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
