import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const InspectionContinuationModal = ({ prompt = null, onSelectLocation, onDismiss }) => {
  const options = Array.isArray(prompt?.options) ? prompt.options : []
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const title = prompt?.title || 'Inspect next location?'
  const body = (
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
  )

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer visible={Boolean(prompt)} title={title} onClose={onDismiss}>
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
          {body}
        </div>
        <div className="mobile-bottom-drawer__footer d-flex justify-content-end gap-2">
          <CButton color="light" onClick={onDismiss}>
            Dismiss
          </CButton>
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={Boolean(prompt)} alignment="center" onClose={onDismiss}>
      <CModalHeader onClose={onDismiss}>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onDismiss}>
          Dismiss
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default InspectionContinuationModal
