import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const ActionConfirmModal = ({
  visible = false,
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  cancelDisabled = false,
  tourId = '',
  onClose,
  onConfirm,
}) => (
  <CModal
    visible={visible}
    alignment="center"
    onClose={onClose}
    {...(tourId ? { 'data-tour-id': tourId } : {})}
  >
    <CModalHeader onClose={onClose}>
      <CModalTitle>{title}</CModalTitle>
    </CModalHeader>
    <CModalBody>{message}</CModalBody>
    <CModalFooter>
      <CButton color="light" onClick={onClose} disabled={cancelDisabled}>
        {cancelLabel}
      </CButton>
      <CButton color={confirmColor} onClick={onConfirm} disabled={confirmDisabled}>
        {confirmLabel}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default ActionConfirmModal
