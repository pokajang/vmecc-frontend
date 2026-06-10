import React from 'react'
import { CAlert, CFormInput, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import { getInitials, EMPTY_VALUE } from './messageUtils'

const NewChatModal = ({
  visible,
  onClose,
  query,
  onQueryChange,
  loading,
  error,
  contacts,
  onSelectContact,
}) => {
  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>New Chat</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CFormInput
          placeholder="Search contacts"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="mb-3"
        />
        {loading && <div className="text-center text-muted py-3">Loading contacts...</div>}
        {error && <CAlert color="danger">{error}</CAlert>}
        {!loading && !error && (
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 360, overflow: 'auto' }}>
            {contacts.length === 0 ? (
              <div className="text-muted text-center py-3">No contacts found.</div>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className="btn btn-light d-flex align-items-center gap-3 text-start"
                  onClick={() => onSelectContact(contact)}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white"
                    style={{
                      width: 36,
                      height: 36,
                      background: 'var(--cui-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {getInitials(contact.name || contact.email || '')}
                  </div>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{contact.name || contact.email}</div>
                    <div className="text-muted small">{contact.email || EMPTY_VALUE}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </CModalBody>
    </CModal>
  )
}

export default NewChatModal
