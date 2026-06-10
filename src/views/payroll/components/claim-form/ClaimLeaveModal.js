import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const ClaimLeaveModal = ({ visible, onClose, onDiscard, onSaveDraftAndLeave }) => {
  return (
    <CModal alignment="center" visible={visible} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>Unsaved Changes</CModalTitle>
      </CModalHeader>
      <CModalBody>
        You have unsaved changes in this claim form. Save a draft before leaving, or discard the
        current changes.
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="danger" variant="outline" onClick={onDiscard}>
          Discard changes
        </CButton>
        <CButton color="primary" onClick={onSaveDraftAndLeave}>
          Save draft and leave
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ClaimLeaveModal
