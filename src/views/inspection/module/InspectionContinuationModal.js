import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const InspectionContinuationModal = ({ prompt = null, onSelectLocation, onDismiss }) => {
  const options = Array.isArray(prompt?.options) ? prompt.options : []

  return (
    <CModal visible={Boolean(prompt)} alignment="center" onClose={onDismiss}>
      <CModalHeader onClose={onDismiss}>
        <CModalTitle>{prompt?.title || 'Inspect next location?'}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="d-grid gap-3">
          <div>{prompt?.message || 'Continue with another location?'}</div>
          {options.length > 0 ? (
            <div className="d-grid gap-2">
              {options.map((option) => (
                <CButton
                  key={option.value}
                  type="button"
                  color="primary"
                  variant="outline"
                  className="d-flex flex-column align-items-start text-start"
                  onClick={() => onSelectLocation?.(option)}
                >
                  <div className="fw-semibold">{option.title || option.value}</div>
                  {option.description ? (
                    <div className="small text-body-secondary">{option.description}</div>
                  ) : null}
                </CButton>
              ))}
            </div>
          ) : null}
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onDismiss}>
          Dismiss
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default InspectionContinuationModal
