import React from 'react'
import {
  CButton,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import ButtonLoader from 'src/components/ButtonLoader'

const StaffMessageModal = ({
  visible = false,
  recipientName = '',
  body = '',
  onBodyChange,
  onClose,
  onSend,
  sending = false,
}) => (
  <CModal visible={visible} onClose={sending ? undefined : onClose} alignment="center">
    <CModalHeader>
      <CModalTitle>{`Send Message${recipientName ? ` to ${recipientName}` : ''}`}</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <div className="mb-2">
        <CFormLabel htmlFor="staff-message-body">Message</CFormLabel>
        <CFormTextarea
          id="staff-message-body"
          rows={5}
          value={body}
          onChange={(e) => onBodyChange?.(e.target.value)}
          disabled={sending}
          placeholder="Type your message here..."
        />
      </div>
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" onClick={onClose} disabled={sending}>
        Cancel
      </CButton>
      <CButton color="primary" onClick={onSend} disabled={sending || !body.trim()}>
        {sending ? <ButtonLoader label="Sending..." /> : 'Send message'}
      </CButton>
    </CModalFooter>
  </CModal>
)

export default StaffMessageModal
