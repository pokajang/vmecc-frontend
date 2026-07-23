import React from 'react'
import { CAlert, CButton } from '@coreui/react'
import { ReportMobileActionGroup } from '../components/ReportWorkflowUi'

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
  <div className="d-grid gap-2 mt-3">
    {blockerMessage ? (
      <CAlert color="danger" className="mb-0" role="alert">
        {blockerMessage}
      </CAlert>
    ) : null}
    <div className="d-none d-md-flex align-items-center justify-content-end gap-2 mb-4">
      {statusMessage ? (
        <div className="small text-body-secondary me-auto">{statusMessage}</div>
      ) : null}
      {typeof onBack === 'function' ? (
        <CButton type="button" color="light" onClick={onBack}>
          Back
        </CButton>
      ) : null}
      <CButton type="button" color="secondary" disabled={isSaving} onClick={onSaveDraft}>
        {isSaving ? 'Saving...' : saveLabel}
      </CButton>
      <CButton type={continueType} color="primary" onClick={onContinue}>
        {continueLabel}
      </CButton>
    </div>
    <div className="d-md-none">
      <ReportMobileActionGroup
        onSaveDraft={onSaveDraft}
        onPrimary={onContinue}
        saveLabel={isSaving ? 'Saving...' : saveLabel}
        primaryLabel={continueLabel}
        primaryType={continueType}
        saveDisabled={isSaving}
        statusMessage={statusMessage}
      />
      {typeof onBack === 'function' ? (
        <div className="d-flex gap-2 mt-2">
          <CButton type="button" color="light" className="flex-fill" onClick={onBack}>
            Back
          </CButton>
        </div>
      ) : null}
    </div>
  </div>
)

export default DrillStageActions
