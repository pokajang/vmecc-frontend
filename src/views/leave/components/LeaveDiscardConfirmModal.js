import React from 'react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'

const LeaveDiscardConfirmModal = ({ visible, onClose, onConfirm }) => (
  <LeaveDiscardConfirmModalContent visible={visible} onClose={onClose} onConfirm={onConfirm} />
)

const LeaveDiscardConfirmModalContent = ({ visible, onClose, onConfirm }) => (
  <ActionConfirmModal
    visible={visible}
    title="Discard unsaved changes?"
    message="Your current leave form changes are not saved."
    cancelLabel="Stay"
    confirmLabel="Discard"
    confirmColor="danger"
    onClose={onClose}
    onConfirm={onConfirm}
  />
)

export default LeaveDiscardConfirmModal
