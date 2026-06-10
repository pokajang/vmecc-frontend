import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const ChronologyStartModeModal = ({ visible, responseStartTime, onClose, onManual, onPremob }) => (
  <CModal alignment="center" visible={visible} onClose={onClose} fullscreen="sm" scrollable>
    <CModalHeader>
      <CModalTitle>Initialize Chronology</CModalTitle>
    </CModalHeader>
    <CModalBody>
      Response start time is set to <strong>{responseStartTime}</strong>. Choose how to begin
      chronology.
    </CModalBody>
    <CModalFooter>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="secondary" onClick={onManual}>
        Start with Manual Row
      </CButton>
      <CButton type="button" color="primary" onClick={onPremob}>
        Add PreMob Template
      </CButton>
    </CModalFooter>
  </CModal>
)

export default ChronologyStartModeModal
