import React from 'react'
import { CButton } from '@coreui/react'
import ButtonLoader from 'src/components/ButtonLoader'

const WizardFooter = ({
  step,
  isSaving,
  onClose,
  onBackDefault,
  onBackAdditional,
  onNext,
  onReview,
  onSubmit,
}) => (
  <>
    <CButton color="light" onClick={onClose} disabled={isSaving}>
      Cancel
    </CButton>
    {step === 'additional' && (
      <CButton color="light" onClick={onBackDefault} disabled={isSaving}>
        Back
      </CButton>
    )}
    {step === 'summary' && (
      <CButton color="light" onClick={onBackAdditional} disabled={isSaving}>
        Back
      </CButton>
    )}
    {step === 'default-national' ? (
      <CButton color="primary" onClick={onNext} disabled={isSaving}>
        Next
      </CButton>
    ) : step === 'additional' ? (
      <CButton color="primary" onClick={onReview} disabled={isSaving}>
        Review & confirm
      </CButton>
    ) : (
      <CButton color="primary" onClick={onSubmit} disabled={isSaving}>
        {isSaving ? <ButtonLoader label="Saving..." /> : 'Save all holidays'}
      </CButton>
    )}
  </>
)

export default WizardFooter
