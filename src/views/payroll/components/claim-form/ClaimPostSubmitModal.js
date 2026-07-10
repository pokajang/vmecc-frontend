import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const ClaimPostSubmitModal = ({ visible, claimId, onClose, onBack }) => {
  const isMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const body = claimId
    ? `Claim ${claimId} was saved successfully.`
    : 'Your claim was saved successfully.'
  const actions = (
    <>
      <CButton color="light" onClick={onClose}>
        Create another claim
      </CButton>
      <CButton color="primary" onClick={onBack}>
        Go to claims list
      </CButton>
    </>
  )

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title="Claim Submitted" onClose={onClose}>
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body">
          {body}
        </div>
        <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
          {actions}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Claim submitted</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ClaimPostSubmitModal
