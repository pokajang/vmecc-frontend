import React from 'react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'

const OvertimeDiscardConfirmModal = ({ visible, onClose, onConfirm }) => (
  <OvertimeDiscardConfirmModalContent visible={visible} onClose={onClose} onConfirm={onConfirm} />
)

const OvertimeDiscardConfirmModalContent = ({ visible, onClose, onConfirm }) => (
  <ActionConfirmModal
    visible={visible}
    title="Discard unsaved changes?"
    message="Your current overtime form changes are not saved."
    cancelLabel="Stay"
    confirmLabel="Discard"
    confirmColor="danger"
    onClose={onClose}
    onConfirm={onConfirm}
  />
)

export default OvertimeDiscardConfirmModal
