import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const PreMobModeModal = ({ visible, onClose, onAppend, onReplace }) => (
  <CModal alignment="center" visible={visible} onClose={onClose} fullscreen="sm" scrollable>
    <CModalHeader>
      <CModalTitle>Add PreMob Events</CModalTitle>
    </CModalHeader>
    <CModalBody>Current chronology already has events. Choose how to apply PreMob rows.</CModalBody>
    <CModalFooter>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="secondary" onClick={onAppend}>
        Append to Current
      </CButton>
      <CButton type="button" color="warning" onClick={onReplace}>
        Start New (Replace)
      </CButton>
    </CModalFooter>
  </CModal>
)

export default PreMobModeModal
