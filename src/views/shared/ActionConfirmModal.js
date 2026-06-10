import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const ActionConfirmModal = ({
  visible = false,
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
}) => (
  <CModal visible={visible} alignment="center" onClose={onClose}>
    <CModalHeader onClose={onClose}>
      <CModalTitle>{title}</CModalTitle>
    </CModalHeader>
    <CModalBody>{message}</CModalBody>
    <CModalFooter>
      <CButton color="light" onClick={onClose}>
        {cancelLabel}
      </CButton>
      <CButton color={confirmColor} onClick={onConfirm}>
        {confirmLabel}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default ActionConfirmModal
