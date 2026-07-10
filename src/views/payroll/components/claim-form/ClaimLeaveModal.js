import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const ClaimLeaveModal = ({ visible, onClose, onDiscard, onSaveDraftAndLeave }) => {
  const isMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const body =
    'You have unsaved changes in this claim form. Save a draft before leaving, or discard the current changes.'
  const actions = (
    <>
      <CButton color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton color="danger" variant="outline" onClick={onDiscard}>
        Discard changes
      </CButton>
      <CButton color="primary" onClick={onSaveDraftAndLeave}>
        Save draft and leave
      </CButton>
    </>
  )

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title="Unsaved Changes" onClose={onClose}>
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
    <CModal alignment="center" visible={visible} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>Unsaved Changes</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ClaimLeaveModal
