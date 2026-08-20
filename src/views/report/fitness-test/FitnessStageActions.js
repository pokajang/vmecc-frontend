import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import { REPORT_ACTION_LABELS } from 'src/views/report/reportActionLabels'

const FitnessStageActions = ({
  onBack,
  onContinue,
  continueLabel = REPORT_ACTION_LABELS.CONTINUE,
  primaryType = 'button',
  disabled = false,
  isSaving = false,
}) => (
  <WorkflowStageActions
    mobileLayout="stacked-primary-first"
    stackedMobileBehavior="compact-sticky"
    onBack={onBack}
    onPrimary={onContinue}
    primaryLabel={continueLabel}
    primaryType={primaryType}
    primaryDisabled={disabled}
    isSaving={isSaving}
  />
)

export default FitnessStageActions
