import React from 'react'
import { CButton } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'

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
  <FormActionGroup
    className="inspection-form-inline-actions"
    mobileThumb={false}
    leading={
      statusMessage ? (
        <div className="inspection-draft-status small text-body-secondary">{statusMessage}</div>
      ) : null
    }
    ariaLabel="Report form actions"
  >
    {onBack ? (
      <CButton type="button" color="light" onClick={onBack}>
        Back
      </CButton>
    ) : null}
    {onClear ? (
      <CButton type="button" color="light" onClick={onClear}>
        Reset
      </CButton>
    ) : null}
    {onSaveDraft ? (
      <CButton type="button" color="secondary" disabled={saveDisabled} onClick={onSaveDraft}>
        {saveLabel}
      </CButton>
    ) : null}
    <CButton type={primaryType} color="primary" disabled={primaryDisabled} onClick={onPrimary}>
      {primaryLabel}
    </CButton>
  </FormActionGroup>
)

export default DetailsStepActions
