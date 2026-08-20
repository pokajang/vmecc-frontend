import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import { REPORT_ACTION_LABELS } from 'src/views/report/reportActionLabels'

const DrillStageActions = ({
  onBack,
  onContinue,
  continueLabel = REPORT_ACTION_LABELS.CONTINUE,
  blockerMessage = '',
  continueType = 'button',
  isSaving = false,
}) => (
  <WorkflowStageActions
    className="mb-4"
    mobileLayout="stacked-primary-first"
    stackedMobileBehavior="compact-sticky"
    onBack={onBack}
    onPrimary={onContinue}
    primaryLabel={continueLabel}
    primaryType={continueType}
    blockerMessage={blockerMessage}
    isSaving={isSaving}
  />
)

export default DrillStageActions
