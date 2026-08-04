import React from 'react'
import { CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useIsMobile from './useIsMobile'

const ErcoResponsiveActionModal = ({ visible, title, body, actions, onClose }) => {
  const isMobileDrawer = useIsMobile()

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title={title} onClose={onClose}>
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
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ErcoResponsiveActionModal
