import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useIsMobile from './useIsMobile'

const ChronologyStartModeModal = ({ visible, responseStartTime, onClose, onManual, onPremob }) => {
  const isMobileDrawer = useIsMobile()
  const body = (
    <>
      Response start time is set to <strong>{responseStartTime}</strong>. Choose how to begin
      chronology.
    </>
  )
  const actions = (
    <>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="secondary" onClick={onManual}>
        Start with Manual Row
      </CButton>
      <CButton type="button" color="primary" onClick={onPremob}>
        Add PreMob Template
      </CButton>
    </>
  )

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title="Initialize Chronology" onClose={onClose}>
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
        <CModalTitle>Initialize Chronology</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ChronologyStartModeModal
