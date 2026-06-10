import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'

const OvertimeDiscardConfirmModal = ({ visible, onClose, onConfirm }) => (
  <CModal visible={visible} onClose={onClose} alignment="center">
    <CModalHeader>Discard unsaved changes?</CModalHeader>
    <CModalBody>Your current overtime form changes are not saved.</CModalBody>
    <CModalFooter>
      <CButton color="light" onClick={onClose}>
        Stay
      </CButton>
      <CButton color="danger" onClick={onConfirm}>
        Discard
      </CButton>
    </CModalFooter>
  </CModal>
)

export default OvertimeDiscardConfirmModal
