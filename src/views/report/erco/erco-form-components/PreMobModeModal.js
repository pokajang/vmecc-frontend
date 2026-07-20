import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useIsMobile from './useIsMobile'

const PreMobModeModal = ({ visible, onClose, onAppend, onReplace }) => {
  const isMobileDrawer = useIsMobile()
  const body = 'Current chronology already has events. Choose how to apply PreMob rows.'
  const actions = (
    <>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="secondary" onClick={onAppend}>
        Append to Current
      </CButton>
      <CButton type="button" color="warning" onClick={onReplace}>
        Start New (Replace)
      </CButton>
    </>
  )

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title="Add PreMob Events" onClose={onClose}>
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body">
          {body}
        </div>
        <div className="mobile-bottom-drawer__footer d-flex flex-wrap align-items-center justify-content-end gap-2">
          {actions}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal alignment="center" visible={visible} onClose={onClose} fullscreen="sm" scrollable>
      <CModalHeader>
        <CModalTitle>Add PreMob Events</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default PreMobModeModal
