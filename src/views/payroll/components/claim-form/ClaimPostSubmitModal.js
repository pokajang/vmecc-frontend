import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'

const ClaimPostSubmitModal = ({ visible, claimId, onClose, onBack }) => (
  <CModal visible={visible} onClose={onClose} alignment="center">
    <CModalHeader>Claim Submitted</CModalHeader>
    <CModalBody>
      {claimId ? `Claim ${claimId} was saved successfully.` : 'Your claim was saved successfully.'}
    </CModalBody>
    <CModalFooter>
      <CButton color="light" onClick={onClose}>
        Create another claim
      </CButton>
      <CButton color="primary" onClick={onBack}>
        Go to claims list
      </CButton>
    </CModalFooter>
  </CModal>
)

export default ClaimPostSubmitModal
