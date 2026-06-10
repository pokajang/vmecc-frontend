import React from 'react'
import { CButton, CCol, CRow } from '@coreui/react'

const DetailsStepActions = ({
  onBack,
  onClear,
  onSaveDraft,
  primaryLabel = 'Submit Report',
  primaryType = 'submit',
  onPrimary,
}) => (
  <CRow className="g-2">
    <CCol xs={12} className="d-flex flex-column flex-sm-row justify-content-end gap-2">
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
        <CButton type="button" color="secondary" onClick={onSaveDraft}>
          Save Draft
        </CButton>
      ) : null}
      <CButton type={primaryType} color="primary" onClick={onPrimary}>
        {primaryLabel}
      </CButton>
    </CCol>
  </CRow>
)

export default DetailsStepActions
