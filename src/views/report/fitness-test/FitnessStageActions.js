import React from 'react'
import { DetailsStepActions } from '../erco/erco-form-components'
import { ReportMobileActionGroup } from '../components/ReportWorkflowUi'

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
  <>
    <div className="d-none d-md-block">
      <DetailsStepActions
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        saveLabel={saveLabel}
        primaryLabel={continueLabel}
        primaryType={primaryType}
        onPrimary={primaryType === 'button' ? onContinue : undefined}
        statusMessage={statusMessage}
        primaryDisabled={disabled}
      />
    </div>
    <div className="d-md-none">
      <ReportMobileActionGroup
        onSaveDraft={onSaveDraft}
        onPrimary={onContinue}
        saveLabel={saveLabel}
        primaryLabel={continueLabel}
        primaryType={primaryType}
        statusMessage={statusMessage}
        primaryDisabled={disabled}
      />
    </div>
  </>
)

export default FitnessStageActions
